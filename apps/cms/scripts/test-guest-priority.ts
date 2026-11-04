import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {pool,hash} from '../src/modules/shared/db';
import {createConversation,message,queue,transcript,type Actor} from '../src/modules/chat/service';
import {linkGuestConversations} from '../src/modules/chat/guest-account';
import type {User} from '../src/payload-types';
export async function testGuestPriority(owner:User,otherUser:User){
 const anon:Actor={user:null,guestHash:await hash(randomUUID())},other:Actor={user:null,guestHash:await hash(randomUUID())},member:Actor={user:owner,guestHash:anon.guestHash};
 const olderGuest=await createConversation(other,{consent:true}),saved=await createConversation(anon,{consent:true});
 await message(anon,saved.id,{key:randomUUID(),body:'Synthetic saved conversation'},2000);
 const fileId=randomUUID();await pool.query("INSERT INTO lvd_chat_files(id,conversation_id,actor_key,object_key,name,mime_type,size,ready) VALUES($1,$2,$3,$4,'synthetic.txt','text/plain',10,true)",[fileId,saved.id,'guest:'+anon.guestHash,'synthetic-priority/'+fileId]);
 assert.equal((await transcript(anon,saved.id)).conversation.registered,false);
 assert.deepEqual(await linkGuestConversations(owner.id,await hash('wrong-'+randomUUID())),[]);
 assert.deepEqual(await linkGuestConversations(owner.id,anon.guestHash),[saved.id]);
 assert.deepEqual(await linkGuestConversations(otherUser.id,anon.guestHash),[],'A linked conversation cannot be moved to a second account');
 const linked=await transcript(member,saved.id);assert.equal(linked.conversation.registered,true);assert.equal(linked.messages[0].body,'Synthetic saved conversation');
 assert.equal((await pool.query('SELECT actor_key FROM lvd_chat_files WHERE id=$1',[fileId])).rows[0].actor_key,'user:'+owner.id);
 await assert.rejects(()=>transcript(anon,saved.id));assert.equal((await transcript({user:otherUser,guestHash:anon.guestHash},saved.id)).messages.length,0,'Unassigned staff gets only queue preview, never saved contents');
 const q=await queue(member);assert.ok(q.findIndex(row=>row.id===saved.id)>=0);assert.ok(q.findIndex(row=>row.id===olderGuest.id)===-1||q.findIndex(row=>row.id===saved.id)<q.findIndex(row=>row.id===olderGuest.id),'Registered request outranks older anonymous request, including the queue limit');if(q.some(row=>row.id===olderGuest.id))assert.equal(q.find(row=>row.id===olderGuest.id)?.registered,false);
 assert.equal((await transcript(other,olderGuest.id)).conversation.registered,false,'Other browser stays anonymous');
 await pool.query('DELETE FROM lvd_conversations WHERE id=ANY($1::uuid[])',[[saved.id,olderGuest.id]]);
 console.log('Guest priority checks passed: registered queue priority, cookie-bound linking, preserved messages/files, old-guest revocation, wrong-cookie and cross-account isolation');
}
