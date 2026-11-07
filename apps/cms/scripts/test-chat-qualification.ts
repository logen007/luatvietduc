import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import type {User} from '../src/payload-types';
import {pool,hash} from '../src/modules/shared/db';
import * as chat from '../src/modules/chat/service';
import {specialistInbox} from '../src/modules/chat/inbox';
import {expireLowPriorityConversations} from '../src/modules/chat/qualification';

// Synthetic rows only. No provider, object-store, browser or schema operations.
export async function testChatQualification(owner:User){
 const database=new URL(process.env.DATABASE_URL||'');
 assert.ok(['localhost','127.0.0.1'].includes(database.hostname)&&database.pathname==='/lvd_test','Isolated CI database only');
 const actor:chat.Actor={user:null,guestHash:await hash(randomUUID())},staff:chat.Actor={user:owner,guestHash:''},ids:string[]=[];
 const make=async()=>{const c=await chat.createConversation(actor,{consent:true},{assistantEnabled:true});ids.push(c.id);return c.id;};
 const read=async(id:string)=>(await pool.query('SELECT * FROM lvd_conversations WHERE id=$1',[id])).rows[0];
 const low=async(id:string,past=false)=>{await pool.query(`UPDATE lvd_conversations SET qualification='low',low_priority_expires_at=now()+$2::interval WHERE id=$1`,[id,past?'-1 minute':'2 hours']);};
 const send=(id:string,body='Synthetic expiry follow-up',key=randomUUID())=>chat.message(actor,id,{body,key},2000);
 try{
  const fresh=await make(),initial=await read(fresh);
  assert.equal(initial.qualification,'unassessed');assert.equal(initial.retain_history,false);assert.equal(initial.low_priority_expires_at,null);
  await pool.query("UPDATE lvd_conversations SET updated_at=now()-interval '2 minutes' WHERE id=$1",[fresh]);
  assert.equal((await specialistInbox(staff,{view:'queue',query:fresh})).rows.length,0,'Unassessed new requests are not staff work when the worker stalls');
  assert.ok(!(await chat.queue(staff)).some((item:{id:string})=>item.id===fresh),'Legacy queue also excludes fresh unqualified requests');
  await low(fresh);
  let row=await read(fresh);assert.equal(row.qualification,'low');assert.equal(row.retain_history,false);
  const remaining=new Date(row.low_priority_expires_at).getTime()-Date.now();assert.ok(remaining>7190000&&remaining<=7201000);
  const inbox=await specialistInbox(staff,{view:'low',query:fresh});assert.equal(inbox.rows.length,1);assert.equal(inbox.rows[0].qualification,'low');assert.ok(inbox.rows[0].expires_at);
  assert.equal((await specialistInbox(staff,{view:'queue',query:fresh})).rows.length,0,'Disposable intake is outside the ordinary queue');

  // Historical/meaningful conversations cannot become disposable again.
  const historical=await make();await pool.query("UPDATE lvd_conversations SET retain_history=true,created_at=now()-interval '1 year' WHERE id=$1",[historical]);
  await pool.query("UPDATE lvd_conversations SET retain_history=false,qualification='low',low_priority_expires_at=now()-interval '1 minute' WHERE id=$1",[historical]);
  row=await read(historical);assert.equal(row.retain_history,true);assert.equal(row.qualification,'needs_details');assert.equal(row.low_priority_expires_at,null);
  const meaningful=await make();await pool.query("UPDATE lvd_conversations SET qualification='ready' WHERE id=$1",[meaningful]);await low(meaningful,true);
  row=await read(meaningful);assert.equal(row.retain_history,true);assert.equal(row.qualification,'needs_details');assert.equal(row.low_priority_expires_at,null);

  // A real new customer message resets the clock; an idempotent retry does not.
  const active=await make();await low(active,true);const key=randomUUID(),saved=await send(active,'Synthetic new activity',key);
  const reset=await read(active),created=(await pool.query('SELECT created_at FROM lvd_messages WHERE id=$1',[saved.id])).rows[0].created_at;
  assert.equal(new Date(reset.low_priority_expires_at).getTime()-new Date(created).getTime(),7200000);
  assert.equal((await send(active,'Synthetic new activity',key)).duplicate,true);
  assert.equal(new Date((await read(active)).low_priority_expires_at).getTime(),new Date(reset.low_priority_expires_at).getTime());
  // Assistant clarification activity also starts its own two-hour inactivity window.
  await pool.query("INSERT INTO lvd_messages(conversation_id,role,body,actor_key,client_key,metadata) VALUES($1,'assistant','Synthetic clarification','assistant',$2,'{\"kind\":\"clarify\"}')",[active,'assistant:'+saved.id]);
  const assistant=(await pool.query("SELECT created_at FROM lvd_messages WHERE conversation_id=$1 AND role='assistant'",[active])).rows[0];
  assert.equal(new Date((await read(active)).low_priority_expires_at).getTime()-new Date(assistant.created_at).getTime(),7200000);

  // The sweep cascades only its eligible conversation's owned SQL rows.
  const expired=await make(),question=await send(expired);await pool.query("INSERT INTO lvd_chat_events(conversation_id,action,version) VALUES($1,'synthetic.expiry',1)",[expired]);await low(expired,true);
  assert.equal((await pool.query('SELECT count(*)::int AS n FROM lvd_answer_jobs WHERE message_id=$1',[question.id])).rows[0].n,1);
  await expireLowPriorityConversations();assert.equal(await read(expired),undefined);
  for(const table of ['lvd_messages','lvd_chat_events','lvd_answer_jobs'])assert.equal((await pool.query(`SELECT count(*)::int AS n FROM ${table} WHERE conversation_id=$1`,[expired])).rows[0].n,0,table+' must cascade');
  assert.ok(await read(historical));assert.ok(await read(meaningful));assert.ok(await read(active));

  // Beginning a file upload protects history even if that upload is cancelled.
  const fileThread=await make(),fileId=randomUUID();await low(fileThread,true);
  await pool.query("INSERT INTO lvd_chat_files(id,conversation_id,actor_key,object_key,name,mime_type,size,ready) VALUES($1,$2,$3,$4,'synthetic.txt','text/plain',12,false)",[fileId,fileThread,'guest:'+actor.guestHash,'synthetic-qualification/'+fileId]);
  row=await read(fileThread);assert.equal(row.retain_history,true);assert.equal(row.qualification,'needs_details');assert.equal(row.low_priority_expires_at,null);
  await pool.query('DELETE FROM lvd_chat_files WHERE id=$1',[fileId]);await low(fileThread,true);await expireLowPriorityConversations();assert.ok(await read(fileThread));

  // Explicit specialist ownership remains durable and cancels expiry.
  const claimed=await make();await send(claimed);await low(claimed,true);await pool.query("UPDATE lvd_conversations SET updated_at=now()-interval '1 minute' WHERE id=$1",[claimed]);
  await chat.transition(staff,claimed,{action:'claim',version:(await read(claimed)).version});
  row=await read(claimed);assert.equal(row.state,'human');assert.equal(row.assigned_to,owner.id);assert.equal(row.qualification,'ready');assert.equal(row.retain_history,true);assert.equal(row.low_priority_expires_at,null);
  await expireLowPriorityConversations();assert.ok(await read(claimed));

  const leased=await make();await low(leased,true);await pool.query('UPDATE lvd_conversations SET ai_generation=$2,ai_started_at=now() WHERE id=$1',[leased,randomUUID()]);
  await expireLowPriorityConversations();assert.ok(await read(leased),'An active answer lease blocks deletion');
  await pool.query("UPDATE lvd_conversations SET ai_started_at=now()-interval '91 seconds' WHERE id=$1",[leased]);await expireLowPriorityConversations();assert.equal(await read(leased),undefined);

  // Hold a real row lock. A sweep must skip it; activity committed before the
  // next sweep then wins. The watchdog unlocks a regressed sweep before failing.
  const raced=await make();await low(raced,true);const lock=await pool.connect();let open=false,timer:ReturnType<typeof setTimeout>|undefined;
  try{
   await lock.query('BEGIN');open=true;await lock.query("SET LOCAL statement_timeout='2s'");await lock.query('SELECT id FROM lvd_conversations WHERE id=$1 FOR UPDATE',[raced]);
   const sweep=expireLowPriorityConversations(),skipped=await Promise.race([sweep.then(()=>true),new Promise<false>(resolve=>{timer=setTimeout(()=>resolve(false),1500);})]);
   clearTimeout(timer);
   if(!skipped){await lock.query('ROLLBACK');open=false;await sweep;assert.fail('Expiry waited for an active row instead of skipping its lock');}
   assert.ok(await read(raced));
   await lock.query("INSERT INTO lvd_messages(conversation_id,role,body,actor_key,client_key) VALUES($1,'user','Synthetic winning activity',$2,$3)",[raced,'guest:'+actor.guestHash,randomUUID()]);
   await lock.query('COMMIT');open=false;
  }finally{clearTimeout(timer);if(open)await lock.query('ROLLBACK');lock.release();}
  await expireLowPriorityConversations();row=await read(raced);assert.ok(row);assert.ok(new Date(row.low_priority_expires_at).getTime()>Date.now()+7190000);
  console.log('Chat qualification checks passed: low inbox, immutable retention, two-hour activity, retry clock, SQL cascade, cancelled file, human claim, active lease and skip-locked activity race');
 }finally{if(ids.length)await pool.query('DELETE FROM lvd_conversations WHERE id=ANY($1::uuid[])',[ids]);}
}
