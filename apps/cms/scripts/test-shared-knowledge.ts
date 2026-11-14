// Isolated CI fixtures only. No private data, production writes or provider calls.
import assert from 'node:assert/strict';
import {pool} from '../src/modules/shared/db';
import {findFaq,normalizeQuestion} from '../src/modules/assistant/faq';
import * as chat from '../src/modules/chat/service';
import {specialistInbox} from '../src/modules/chat/inbox';
import type {User} from '../src/payload-types';
export async function testSharedKnowledge(support:User,foreign:User){
 const database=new URL(process.env.DATABASE_URL||'');assert.ok(['localhost','127.0.0.1'].includes(database.hostname)&&database.pathname==='/lvd_test');
 const prefix='Synthetic scale '+crypto.randomUUID()+' ',title=prefix+'oldest question';
 const first=(await pool.query("INSERT INTO knowledge(title,body,jurisdiction,source_url,approved,_status,effective_from,review_due_at,created_at,updated_at) VALUES($1,'Synthetic shared source only.','BOTH','https://example.invalid/oldest',true,'published',now()-interval '1 day',now()+interval '1 day',now()-interval '1 day',now()-interval '1 day') RETURNING id",[title])).rows[0];
 let conversationId:string|undefined;
 try{
  await pool.query("INSERT INTO knowledge(title,body,jurisdiction,source_url,approved,_status,effective_from,review_due_at,created_at,updated_at) SELECT $1||n::text,'Synthetic scale fixture.','VN','https://example.invalid/fixture',true,'published',now()-interval '1 day',now()+interval '1 day',now(),now() FROM generate_series(1,10050) AS n",[prefix]);
  await pool.query('ANALYZE knowledge');
  assert.equal((await findFaq('BOTH',title))?.id,first.id,'The oldest valid article remains searchable beyond 10000 newer entries');
  assert.equal((await findFaq('DE',title))?.id,first.id,'Shared source can answer either law context');
  const count=(await pool.query('SELECT count(*) FROM knowledge WHERE title LIKE $1',[prefix+'%'])).rows[0].count;assert.equal(Number(count),10051);
  for(const question of [' ĐIỀU KIỆN chung?! ','Thuế 10%','Mức 1,5','Giáo dục','Tuổi <18','Tuổi >18'])assert.equal((await pool.query('SELECT lvd_question_key($1) AS key',[question])).rows[0].key,normalizeQuestion(question));
  const index=(await pool.query("SELECT indexdef FROM pg_indexes WHERE indexname='lvd_knowledge_question_lookup'")).rows[0]?.indexdef;assert.ok(index?.includes('USING gin'));
  const tx=await pool.connect();try{await tx.query('BEGIN');await tx.query('SET LOCAL enable_seqscan=off');const plan=await tx.query("EXPLAIN SELECT id FROM knowledge WHERE lvd_knowledge_keys(title,question_aliases) @> ARRAY[lvd_question_key($1)] AND approved AND _status='published'",[title]);const detail=plan.rows.map(row=>row['QUERY PLAN']).join('\n');assert.ok(detail.includes('lvd_knowledge_question_lookup'),detail);}finally{await tx.query('ROLLBACK');tx.release();}
  await pool.query("INSERT INTO knowledge(title,body,jurisdiction,source_url,approved,_status,effective_from,review_due_at,created_at,updated_at) VALUES($1,'Synthetic conflicting source.','VN','https://example.invalid/conflict',true,'published',now()-interval '1 day',now()+interval '1 day',now(),now())",[title]);
  assert.equal(await findFaq('BOTH',title),null,'Ambiguous sources hand off');
  const actor:chat.Actor={user:null,guestHash:crypto.randomUUID()},conversation=await chat.createConversation(actor,{consent:true});
  conversationId=conversation.id;
  assert.equal((await chat.transcript(actor,conversation.id)).conversation.jurisdiction,'BOTH');
  // Search before pagination, as the current inbox does: unrelated earlier
  // fixtures can fill the compatibility queue's first 100 rows.
  assert.ok((await specialistInbox({user:support,guestHash:''},{view:'queue',query:conversation.id})).rows.some((row:{id:string})=>row.id===conversation.id));
  assert.ok((await specialistInbox({user:foreign,guestHash:''},{view:'queue',query:conversation.id})).rows.some((row:{id:string})=>row.id===conversation.id));
  const claims=await Promise.allSettled([chat.transition({user:support,guestHash:''},conversation.id,{action:'claim',version:1}),chat.transition({user:foreign,guestHash:''},conversation.id,{action:'claim',version:1})]);assert.equal(claims.filter(value=>value.status==='fulfilled').length,1,'Only one specialist takes a shared conversation');
  console.log('Shared knowledge checks passed: 10051 source fixtures, indexed oldest-source lookup, ambiguous-source rejection, normalization parity, automatic intake and concurrent specialist claim');
 }finally{try{if(conversationId)await pool.query('DELETE FROM lvd_conversations WHERE id=$1',[conversationId]);}finally{await pool.query('DELETE FROM knowledge WHERE title LIKE $1',[prefix+'%']);}}
}
