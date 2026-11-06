import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {pool} from '../src/modules/shared/db';
import {specialistInbox} from '../src/modules/chat/inbox';
import {createConversation,message,transcript,transition,type Actor} from '../src/modules/chat/service';
import type {User} from '../src/payload-types';
export async function testSpecialistInbox(owner:User,staff:User,other:User,foreign:User){
 const actor:Actor={user:staff,guestHash:''},peer:Actor={user:other,guestHash:''},admin:Actor={user:owner,guestHash:''},guest:Actor={user:null,guestHash:randomUUID()},ids:string[]=[];
 try{
 await assert.rejects(()=>specialistInbox(guest));
 const c=await createConversation(guest,{consent:true});ids.push(c.id);
 await pool.query("UPDATE lvd_conversations SET jurisdiction='VN' WHERE id=$1",[c.id]);
 const title='Inbox-private-'+randomUUID();await message(guest,c.id,{key:randomUUID(),body:title},2000);
 let list=await specialistInbox(actor,{query:c.id});assert.equal(list.total,1);assert.equal(list.rows[0].title,title);assert.equal(list.rows[0].last_role,'user');assert.equal((await specialistInbox(actor,{query:title})).total,1,'Specialists may search all inbox conversations');
 assert.equal((await specialistInbox({user:foreign,guestHash:''},{query:c.id})).total,1);
 assert.equal((await transcript(actor,c.id)).messages[0].body,title);
 const claim=await transition(actor,c.id,{action:'claim',version:c.version});
 let full=await transcript(actor,c.id);assert.equal(full.messages[0].body,title);assert.equal(full.conversation.assignedName,staff.name);
 assert.equal((await specialistInbox(actor,{view:'active',query:title})).total,1);assert.equal((await specialistInbox(peer,{view:'all',query:c.id})).total,1);
 assert.equal((await specialistInbox(admin,{view:'active',query:c.id})).total,1);
 await assert.rejects(()=>transition(peer,c.id,{action:'claim',version:claim.version}),{status:409},'An active assignment cannot be silently claimed by another specialist');
 await assert.rejects(()=>transition(actor,c.id,{action:'release',version:c.version}));
 await message(actor,c.id,{key:randomUUID(),body:'Synthetic internal note',internal:true},2000);
 assert.equal((await transcript(guest,c.id)).messages.length,1,'Customer cannot see internal notes');
 const released=await transition(peer,c.id,{action:'release',version:claim.version});
 full=await transcript(actor,c.id);assert.equal(full.messages.length,2);assert.equal(full.conversation.restricted,undefined);assert.ok(full.conversation.customer);
 const row=(await pool.query('SELECT * FROM lvd_conversations WHERE id=$1',[c.id])).rows[0];assert.equal(row.assigned_to,null);assert.equal(row.ai_enabled,false);assert.equal(row.ai_generation,null);
 assert.equal((await pool.query("SELECT count(*)::int AS n FROM lvd_chat_events WHERE conversation_id=$1 AND action='release'",[c.id])).rows[0].n,1);
 const second=await transition(peer,c.id,{action:'claim',version:released.version});assert.equal((await transcript(peer,c.id)).messages.length,2,'Handoff preserves conversation and notes');assert.equal((await transcript(actor,c.id)).messages.length,2);
 await transition(peer,c.id,{action:'close',version:second.version});assert.equal((await specialistInbox(peer,{view:'done',query:c.id})).total,1);
 // Exercise pagination with private synthetic requests, isolated from existing fixtures.
 for(let i=0;i<32;i++){const v=await createConversation(guest,{consent:true});ids.push(v.id);}
 await pool.query("UPDATE lvd_conversations SET assigned_to=$1,state='human',title=$2 WHERE id=ANY($3::uuid[])",[staff.id,title,ids.slice(1)]);
 const first=await specialistInbox(actor,{view:'active',query:title}),next=await specialistInbox(actor,{view:'active',query:title,page:2});assert.equal(first.total,32);assert.equal(first.rows.length,30);assert.equal(next.rows.length,2);assert.equal(first.totalPages,2);assert.ok(!first.rows.some((r:any)=>next.rows.some((n:any)=>r.id===n.id)));
 console.log('Specialist inbox checks passed: global specialist search/read, cross-assignment release, explicit claim and stale-version guards, customer/internal-note isolation, preserved history, pagination');
 }finally{await pool.query('DELETE FROM lvd_conversations WHERE id=ANY($1::uuid[])',[ids]);}
}
