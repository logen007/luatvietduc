import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {pool,hash} from '../src/modules/shared/db';
import {createConversation,message,transcript,type Actor} from '../src/modules/chat/service';
import {linkGuestConversations} from '../src/modules/chat/guest-account';
import type {User} from '../src/payload-types';

// Called from the isolated system-test runner with synthetic users. No storage,
// email or model calls: the attachment row is a local fixture only.
export async function testChatAccountRetry(user:User,otherUser:User){
 const database=new URL(process.env.DATABASE_URL||'');
 if(!['localhost','127.0.0.1'].includes(database.hostname)||database.pathname!=='/lvd_test')throw new Error('Isolated CI database only');
 const guest:Actor={user:null,guestHash:await hash(randomUUID())};
 const member:Actor={user,guestHash:guest.guestHash};
 const conversation=await createConversation(guest,{consent:true});
 try{
  const text={key:randomUUID(),body:'Synthetic saved guest message'};
  const savedText=await message(guest,conversation.id,text,2000);
  const fileId=randomUUID();
  await pool.query("INSERT INTO lvd_chat_files(id,conversation_id,actor_key,object_key,name,mime_type,size,ready) VALUES($1,$2,$3,$4,'synthetic.txt','text/plain',10,true)",[fileId,conversation.id,'guest:'+guest.guestHash,'synthetic-account-retry/'+fileId]);
  const attachment={key:randomUUID(),body:'Synthetic saved guest attachment',fileIds:[fileId]};
  const savedAttachment=await message(guest,conversation.id,attachment,2000);
  assert.deepEqual(await linkGuestConversations(user.id,guest.guestHash),[conversation.id]);
  assert.deepEqual(await linkGuestConversations(otherUser.id,guest.guestHash),[],'A linked conversation cannot move to another account');
  assert.deepEqual(await message(member,conversation.id,text,2000),{id:savedText.id,duplicate:true,role:'user'});
  assert.deepEqual(await message(member,conversation.id,attachment,2000),{id:savedAttachment.id,duplicate:true,role:'user'});
  await assert.rejects(()=>message(member,conversation.id,{...text,body:'Different retry content'},2000),{status:409});
  await assert.rejects(()=>message(guest,conversation.id,text,2000),{status:403});
  await assert.rejects(()=>message({user:otherUser,guestHash:guest.guestHash},conversation.id,text,2000));
  const linked=await transcript(member,conversation.id);
  assert.equal(linked.messages.length,2,'Sign-in retries do not duplicate saved messages');
  assert.equal(linked.messages[1].attachments.length,1);
  const rows=(await pool.query('SELECT actor_key FROM lvd_messages WHERE conversation_id=$1 ORDER BY id',[conversation.id])).rows;
  assert.ok(rows.every(row=>row.actor_key==='user:'+user.id));
  assert.equal((await pool.query('SELECT actor_key FROM lvd_chat_files WHERE id=$1',[fileId])).rows[0].actor_key,'user:'+user.id);
  console.log('Chat account retry checks passed: saved text/attachment retries, content conflict, old-guest revocation and cross-account isolation');
 }finally{
  await pool.query('DELETE FROM lvd_conversations WHERE id=$1',[conversation.id]);
 }
}
