import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {pool} from '../src/modules/shared/db';
import {createConversation,message,transcript,transition,type Actor} from '../src/modules/chat/service';
import {downloadChatFile} from '../src/modules/chat/files';
import type {User} from '../src/payload-types';
export async function testChatFiles(owner:User){
 const guest:Actor={user:null,guestHash:'file-owner-'+randomUUID()},other:Actor={user:null,guestHash:'other-'+randomUUID()},staff:Actor={user:owner,guestHash:''};
 const c=await createConversation(guest,{consent:true},{assistantEnabled:true}),different=await createConversation(guest,{consent:true});
 const id=randomUUID();await pool.query("INSERT INTO lvd_chat_files(id,conversation_id,actor_key,object_key,name,mime_type,size,ready) VALUES($1,$2,$3,$4,'synthetic.pdf','application/pdf',20,true)",[id,c.id,'guest:'+guest.guestHash,'synthetic-test/'+id]);
 await assert.rejects(()=>downloadChatFile(other,id),/Không tìm thấy/);
 await assert.rejects(()=>message(other,c.id,{key:randomUUID(),body:'steal',fileIds:[id]},2000));
 await assert.rejects(()=>message(guest,different.id,{key:randomUUID(),body:'wrong conversation',fileIds:[id]},2000));
 const key=randomUUID(),data={key,body:'',fileIds:[id],aiConsentVersion:'gemini-rag-v1'};
 const sent=await message(guest,c.id,data,2000);assert.equal((await message(guest,c.id,data,2000)).duplicate,true);
 await assert.rejects(()=>message(guest,c.id,{...data,fileIds:[]},2000));
 const t=await transcript(guest,c.id);assert.equal(t.messages[0].attachments.length,1);assert.equal(t.messages[0].attachments[0].url,'/service/chat-files/'+id);assert.ok(!JSON.stringify(t).includes('synthetic-test'));assert.equal(t.messages[0].metadata.aiConsent,undefined);assert.equal(t.conversation.aiEnabled,false);assert.equal(t.conversation.title,'Cuộc trò chuyện mới');
 await assert.rejects(()=>message(guest,c.id,{key:randomUUID(),body:'reuse',fileIds:[id]},2000));
 const claimed=await transition(staff,c.id,{action:'claim',version:t.conversation.version});assert.equal(claimed.state,'human');
 const internalId=randomUUID();await pool.query("INSERT INTO lvd_chat_files(id,conversation_id,actor_key,object_key,name,mime_type,size,ready) VALUES($1,$2,$3,$4,'internal.pdf','application/pdf',20,true)",[internalId,c.id,'staff:'+owner.id,'synthetic-test/'+internalId]);
 await message(staff,c.id,{key:randomUUID(),body:'Private staff note',internal:true,fileIds:[internalId]},2000);
 assert.equal((await transcript(guest,c.id)).messages.length,1);await assert.rejects(()=>downloadChatFile(guest,internalId),/Không tìm thấy/);
 await pool.query('DELETE FROM lvd_conversations WHERE id=ANY($1::uuid[])',[[c.id,different.id]]);
 console.log('Private chat file checks passed: cross-guest/conversation denial, idempotency, no storage keys, attachment-only human handoff, no AI consent, internal-file isolation');
}
