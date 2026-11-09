import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {Readable} from 'node:stream';
import {S3Client} from '@aws-sdk/client-s3';
import {pool} from '../src/modules/shared/db';
import {seal} from '../src/modules/integrations/crypto';
import {DOCUMENT_CONSENT_VERSION} from '../src/modules/chat/document-consent';
import * as chat from '../src/modules/chat/service';
import {replyToMessage} from '../src/modules/assistant/reply';
import type {User} from '../src/payload-types';
export async function testDocumentChat(owner:User){
 const url=new URL(process.env.DATABASE_URL||'');assert.ok(['localhost','127.0.0.1'].includes(url.hostname)&&url.pathname==='/lvd_test');
 const guest={user:null,guestHash:randomUUID()},other={user:null,guestHash:randomUUID()},ids:string[]=[],send=S3Client.prototype.send,fetcher=globalThis.fetch;
 const integrations=(await pool.query("SELECT * FROM lvd_integrations WHERE provider=ANY($1)",[['ai','r2']])).rows;
 const settings=(await pool.query('SELECT id,customer_a_i_enabled,chat_enabled FROM site_settings LIMIT 1')).rows[0];
 const bytes=Buffer.from('%PDF-1.7\nSynthetic document fixture only.');let calls=0,invalid=false,onProvider:(()=>Promise<void>)|undefined;
 const objects=new Map<string,Buffer>();
 (S3Client.prototype as any).send=async function(command:any){assert.equal(command.constructor.name,'GetObjectCommand');const body=objects.get(command.input.Key);assert.ok(body);return {ContentLength:body.length,Body:Readable.from([body])};};
 globalThis.fetch=async(input,init)=>{
  assert.ok(String(input).startsWith('https://generativelanguage.googleapis.com/'));assert.ok(String(input).endsWith(':generateContent'),'No embeddings or remote storage links');
  calls++;const body=JSON.parse(String(init?.body)),parts=body.contents[0].parts;
  assert.equal(parts.filter((part:any)=>part.inlineData).length,1);assert.equal(parts.find((part:any)=>part.inlineData).inlineData.data,bytes.toString('base64'));
  if(onProvider)await onProvider();
  if(invalid)return Response.json({candidates:[{finishReason:'MAX_TOKENS'}]});
  return Response.json({candidates:[{finishReason:'STOP',content:{parts:[{text:JSON.stringify({kind:'answer',body:'Tệp synthetic.pdf: đây là nội dung đọc từ tài liệu thử nghiệm.'})}]}}]});
 };
 const policy={customerAIEnabled:true,chatEnabled:true,aiDailyRequests:100000,aiMaxOutputTokens:700};
 const make=async()=>{
  const c=await chat.createConversation(guest,{consent:true},{assistantEnabled:true});ids.push(c.id);const id=randomUUID(),key='private-chat/'+c.id+'/'+id;objects.set(key,bytes);
  await pool.query("INSERT INTO lvd_chat_files(id,conversation_id,actor_key,object_key,name,mime_type,size,ready) VALUES($1,$2,$3,$4,'synthetic.pdf','application/pdf',$5,true)",[id,c.id,'guest:'+guest.guestHash,key,bytes.length]);
  return {c,id,data:{key:randomUUID(),body:'Đọc ảnh và tóm tắt tài liệu giúp tôi',fileIds:[id],aiConsentVersion:'gemini-rag-v1',documentConsentVersion:DOCUMENT_CONSENT_VERSION}};
 };
 try{
  await pool.query('UPDATE site_settings SET customer_a_i_enabled=true,chat_enabled=true WHERE id=$1',[settings.id]);
  for(const [provider,values] of [['ai',{apiKey:'synthetic',model:'synthetic-model'}],['r2',{endpoint:'https://'+'a'.repeat(32)+'.r2.cloudflarestorage.com',bucket:'synthetic-docs',accessKeyId:'synthetic',secretAccessKey:'synthetic'}]] as const)await pool.query("INSERT INTO lvd_integrations(provider,encrypted_values,enabled,check_state) VALUES($1,$2,true,'passed') ON CONFLICT(provider) DO UPDATE SET encrypted_values=$2,enabled=true,version=lvd_integrations.version+1",[provider,seal(provider,values)]);
  const good=await make();await assert.rejects(()=>chat.message(other,good.c.id,good.data,2000));
  const posted=await chat.message(guest,good.c.id,good.data,2000);assert.equal((await chat.message(guest,good.c.id,good.data,2000)).duplicate,true);
  await assert.rejects(()=>chat.message(guest,good.c.id,{...good.data,documentConsentVersion:undefined},2000));
  assert.equal((await pool.query('SELECT count(*)::int AS n FROM lvd_answer_jobs WHERE message_id=$1',[posted.id])).rows[0].n,1);
  await replyToMessage(guest,good.c.id,posted.id,policy);
  let view=await chat.transcript(guest,good.c.id);assert.equal(view.conversation.aiEnabled,true);assert.equal(view.messages.at(-1)?.metadata.kind,'document');assert.equal(calls,1);
  assert.ok(!JSON.stringify(view).includes('objectKey'));assert.ok(!JSON.stringify(view).includes('private-chat/'));
  const follow=await chat.message(guest,good.c.id,{key:randomUUID(),body:'Tài liệu này ghi gì?',aiConsentVersion:'gemini-rag-v1'},2000);
  await replyToMessage(guest,good.c.id,follow.id,policy);assert.equal(calls,2,'Same-thread follow-up can read explicitly consented documents');
  const declined=await make();await chat.message(guest,declined.c.id,{...declined.data,documentConsentVersion:undefined},2000);assert.equal((await chat.transcript(guest,declined.c.id)).conversation.aiEnabled,false);assert.equal(calls,2);
  const automatic=await make();const automaticMessage=await chat.message(guest,automatic.c.id,{...automatic.data,documentConsentVersion:undefined,aiConsentVersion:undefined},2000,{documentAIAvailable:true});
  const automaticMeta=(await pool.query('SELECT metadata FROM lvd_messages WHERE id=$1',[automaticMessage.id])).rows[0].metadata;
  assert.equal(automaticMeta.documentConsent,undefined);assert.equal(automaticMeta.documentProcessing.mode,'customer-upload');
  await replyToMessage(guest,automatic.c.id,automaticMessage.id,policy);assert.equal((await chat.transcript(guest,automatic.c.id)).messages.at(-1)?.metadata.kind,'document');
  const resume=await make();await chat.message(guest,resume.c.id,{...resume.data,documentConsentVersion:undefined},2000,{documentAIAvailable:false});assert.equal((await chat.transcript(guest,resume.c.id)).conversation.aiEnabled,false);
  const resumeFile=randomUUID(),resumeKey='private-chat/'+resume.c.id+'/'+resumeFile;objects.set(resumeKey,bytes);
  await pool.query("INSERT INTO lvd_chat_files(id,conversation_id,actor_key,object_key,name,mime_type,size,ready) VALUES($1,$2,$3,$4,'synthetic.pdf','application/pdf',$5,true)",[resumeFile,resume.c.id,'guest:'+guest.guestHash,resumeKey,bytes.length]);
  const resumed=await chat.message(guest,resume.c.id,{key:randomUUID(),body:'Đọc tài liệu',fileIds:[resumeFile]},2000,{documentAIAvailable:true});assert.equal((await chat.transcript(guest,resume.c.id)).conversation.aiEnabled,true);
  await replyToMessage(guest,resume.c.id,resumed.id,policy);assert.equal((await chat.transcript(guest,resume.c.id)).messages.at(-1)?.metadata.kind,'document');
  const handed=await make();await chat.transition(guest,handed.c.id,{action:'handoff',version:1});
  await chat.message(guest,handed.c.id,{...handed.data,documentConsentVersion:undefined},2000,{documentAIAvailable:true});assert.equal((await chat.transcript(guest,handed.c.id)).conversation.aiEnabled,false,'Automatic document processing cannot undo an explicit human handoff');
  const unsupported=await make();await pool.query("UPDATE lvd_chat_files SET mime_type='text/plain' WHERE id=$1",[unsupported.id]);await assert.rejects(()=>chat.message(guest,unsupported.c.id,unsupported.data,2000),{status:400});
  const broken=await make();invalid=true;const b=await chat.message(guest,broken.c.id,broken.data,2000);await replyToMessage(guest,broken.c.id,b.id,policy);invalid=false;
  view=await chat.transcript(guest,broken.c.id);assert.equal(view.conversation.aiEnabled,true);assert.match(view.messages.at(-1)!.body,/chưa đọc được/);
  const race=await make();const r=await chat.message(guest,race.c.id,race.data,2000);onProvider=async()=>{const v=await chat.transcript(guest,race.c.id);await chat.transition({user:owner,guestHash:''},race.c.id,{action:'claim',version:v.conversation.version});};
  await replyToMessage(guest,race.c.id,r.id,policy);onProvider=undefined;view=await chat.transcript(guest,race.c.id);assert.equal(view.conversation.state,'human');assert.equal(view.messages.length,1,'Claim fences an in-flight document response');
  const newer=await make();const n=await chat.message(guest,newer.c.id,newer.data,2000);onProvider=async()=>{await chat.message(guest,newer.c.id,{key:randomUUID(),body:'Tôi đổi câu hỏi',aiConsentVersion:'gemini-rag-v1'},2000);};
  await replyToMessage(guest,newer.c.id,n.id,policy);onProvider=undefined;view=await chat.transcript(guest,newer.c.id);assert.equal(view.messages.length,2);assert.ok(view.messages.every(m=>m.role==='user'),'A newer question fences the old document response');
  const stopped=await make();const stop=await chat.message(guest,stopped.c.id,stopped.data,2000);onProvider=async()=>{await pool.query('UPDATE site_settings SET customer_a_i_enabled=false WHERE id=$1',[settings.id]);};
  await replyToMessage(guest,stopped.c.id,stop.id,policy);onProvider=undefined;view=await chat.transcript(guest,stopped.c.id);assert.equal(view.messages.at(-1)?.metadata.kind,'handoff');assert.ok(!view.messages.at(-1)?.body.includes('tài liệu thử nghiệm'));await pool.query('UPDATE site_settings SET customer_a_i_enabled=true WHERE id=$1',[settings.id]);
  const removed=await make();const remove=await chat.message(guest,removed.c.id,removed.data,2000);onProvider=async()=>{await pool.query('DELETE FROM lvd_conversations WHERE id=$1',[removed.c.id]);};
  await replyToMessage(guest,removed.c.id,remove.id,policy);onProvider=undefined;assert.equal((await pool.query('SELECT 1 FROM lvd_messages WHERE conversation_id=$1',[removed.c.id])).rowCount,0,'Deleted conversations cannot be resurrected by a document response');
  const missing=await make();const m=await chat.message(guest,missing.c.id,missing.data,2000);await pool.query('DELETE FROM lvd_chat_files WHERE id=$1',[missing.id]);const before=calls;await replyToMessage(guest,missing.c.id,m.id,policy);assert.equal(calls,before);assert.equal((await chat.transcript(guest,missing.c.id)).conversation.aiEnabled,true);
  console.log('Document chat checks passed: automatic upload processing, legacy consent compatibility, safe restart, explicit-handoff preservation, owner isolation, retry identity, durable jobs, factual response/follow-up, no embeddings, no-consent handoff, unsupported files, invalid provider output, missing files and human-claim race; mocked storage/provider only.');
 }finally{
  globalThis.fetch=fetcher;S3Client.prototype.send=send;
  await pool.query('DELETE FROM lvd_conversations WHERE id=ANY($1::uuid[])',[ids]);
  await pool.query("DELETE FROM lvd_integrations WHERE provider=ANY($1)",[['ai','r2']]);
  for(const row of integrations)await pool.query('INSERT INTO lvd_integrations(provider,encrypted_values,enabled,version,check_state,checked_at,updated_at) VALUES($1,$2,$3,$4,$5,$6,$7)',[row.provider,row.encrypted_values,row.enabled,row.version,row.check_state,row.checked_at,row.updated_at]);
  await pool.query('UPDATE site_settings SET customer_a_i_enabled=$2,chat_enabled=$3 WHERE id=$1',[settings.id,settings.customer_a_i_enabled,settings.chat_enabled]);
 }
}
