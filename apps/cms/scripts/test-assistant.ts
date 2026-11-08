// Synthetic fixtures only. Never point this helper at a production database or provider.
import assert from 'node:assert/strict';
import type {Payload} from 'payload';
import type {User} from '../src/payload-types';
import {pool} from '../src/modules/shared/db';
import * as chat from '../src/modules/chat/service';
import {specialistInbox} from '../src/modules/chat/inbox';
import * as integrations from '../src/modules/integrations/store';
import {replyToMessage} from '../src/modules/assistant/reply';
import {renameCustomerConversation} from '../src/modules/chat/rename-conversation';
import {publicFaq,clearFaqCatalog,type Faq} from '../src/modules/assistant/faq';
import {validateOutline} from '../src/modules/assistant/format';
import {MAX_CLARIFICATIONS} from '../src/modules/assistant/clarification';
import {CONSENT_VERSION} from '../src/modules/rag/core';
const outline=(faq:Faq)=>validateOutline({sections:[{title:'Giải đáp',paragraphs:publicFaq(faq).paragraphs.map((_,index)=>index)}]},publicFaq(faq).paragraphs);
export async function testAssistant(payload:Payload,owner:User,support:User){
 const database=new URL(process.env.DATABASE_URL||'');if(!['localhost','127.0.0.1'].includes(database.hostname)||database.pathname!=='/lvd_test')throw new Error('Isolated CI database only');
 const suffix=crypto.randomUUID().replace(/\d/g,'x'),title='Synthetic public question '+suffix,alias='Synthetic alternate question '+suffix;
 const source=await payload.create({collection:'knowledge',overrideAccess:false,user:support,data:{title,questionAliases:alias,body:'Synthetic approved answer.\n\nSynthetic mandatory condition.',jurisdiction:'VN',sourceUrl:'https://example.invalid/synthetic-source',effectiveFrom:new Date(Date.now()-86400000).toISOString(),reviewDueAt:new Date(Date.now()+86400000).toISOString(),_status:'published'}});
 assert.equal(source.approved,true);assert.equal(typeof source.reviewedBy==='object'?source.reviewedBy?.id:source.reviewedBy,support.id);
 await assert.rejects(()=>payload.create({collection:'knowledge',overrideAccess:false,user:{...support,role:'knowledge' as User['role']},data:{title:'Forbidden legacy country',body:'Synthetic',jurisdiction:'DE',sourceUrl:'https://example.invalid/source',effectiveFrom:new Date().toISOString(),reviewDueAt:new Date(Date.now()+86400000).toISOString(),_status:'published'}}));
 await payload.updateGlobal({slug:'site-settings',overrideAccess:false,user:owner,data:{customerAIEnabled:true,chatEnabled:true}});
 await integrations.saveConnection('ai',{apiKey:'synthetic-ai-key-no-provider-request',model:'synthetic-model'},0,owner.id);await integrations.markCheck('ai',1,'passed',owner.id);await integrations.setEnabled('ai',1,true,owner.id);
 const policy={customerAIEnabled:true,chatEnabled:true,aiDailyRequests:20,aiMaxOutputTokens:700};
 // Eligibility must not depend on unrelated fixtures filling the legacy
 // compatibility queue's first 100 results. The current inbox filters first.
 const queued=async(id:string)=>(await specialistInbox({user:support,guestHash:''},{view:'queue',query:id})).rows.some((row:{id:string})=>row.id===id);
 let calls=0;const formatter=async(faq:Faq)=>{calls++;assert.ok(!JSON.stringify(publicFaq(faq)).includes(alias.toUpperCase()));return outline(faq);};
 async function start(body=title,country='VN',aiConsentVersion?:string){
  const actor:chat.Actor={user:null,guestHash:crypto.randomUUID()};
  const conversation=await chat.createConversation(actor,{jurisdiction:country,consent:true,privacyNoticeVersion:'chat-v2'},{assistantEnabled:true});
  const message=await chat.message(actor,conversation.id,{body,key:crypto.randomUUID(),...(aiConsentVersion?{aiConsentVersion}:{})},2000);return {actor,conversation,message};
 }
 async function deferred(test:Awaited<ReturnType<typeof start>>){
  let ready!:()=>void,release!:()=>void;
  const started=new Promise<void>(resolve=>{ready=resolve;}),gate=new Promise<void>(resolve=>{release=resolve;});
  const task=replyToMessage(test.actor,test.conversation.id,test.message.id,policy,async faq=>{ready();await gate;return outline(faq);});
  let timeout:ReturnType<typeof setTimeout>|undefined;
  try{await Promise.race([started,task.then(()=>{throw new Error('Formatter not reached');}),new Promise((_,reject)=>{timeout=setTimeout(()=>reject(new Error('Assistant fixture timed out')),5000);})]);}finally{clearTimeout(timeout);}
  return {task,release};
 }
 try{
  clearFaqCatalog();
  const incomplete=await start('Hay');
  await Promise.all([replyToMessage(incomplete.actor,incomplete.conversation.id,incomplete.message.id,policy,formatter),replyToMessage(incomplete.actor,incomplete.conversation.id,incomplete.message.id,policy,formatter)]);
  let intake=await chat.transcript(incomplete.actor,incomplete.conversation.id);
  assert.equal(intake.messages.length,2);assert.equal(intake.messages[1].metadata.kind,'clarify');assert.equal(intake.conversation.aiEnabled,true);assert.equal(calls,0);
  assert.ok(!(await queued(incomplete.conversation.id)),'An incomplete question is not a specialist handoff');
  for(let round=0;round<MAX_CLARIFICATIONS;round++){
   const followup=await chat.message(incomplete.actor,incomplete.conversation.id,{body:['Thử','Hay','tôi muốn','không biết'][round%4],key:crypto.randomUUID()},2000);
   await replyToMessage(incomplete.actor,incomplete.conversation.id,followup.id,policy,formatter);
   if((await chat.transcript(incomplete.actor,incomplete.conversation.id)).messages.at(-1)?.metadata.kind==='handoff')break;
  }
  intake=await chat.transcript(incomplete.actor,incomplete.conversation.id);
  assert.equal(intake.messages.at(-1)?.metadata.kind,'clarify');assert.equal(intake.conversation.aiEnabled,true);assert.equal(calls,0);assert.ok(!(await queued(incomplete.conversation.id)));
  const vaguePrompts=intake.messages.filter(message=>message.metadata?.kind==='clarify');assert.equal(vaguePrompts.length,MAX_CLARIFICATIONS+1,'Missing facts must keep clarification active beyond the old limit');
  const investment=await start('tôi muốn','BOTH',CONSENT_VERSION),originalFetch=globalThis.fetch;let intakeProviderCalls=0;
  globalThis.fetch=async(input,init)=>{const request=JSON.parse(String(init?.body));assert.equal(JSON.parse(request.contents[0].parts[0].text).phase,'intake','Missing facts must never reach retrieval/answer selection');assert.ok(String(input).includes(':generateContent'));intakeProviderCalls++;throw new Error('Synthetic intake outage');};
  try{
   await replyToMessage(investment.actor,investment.conversation.id,investment.message.id,policy,formatter);
   for(const [body,key] of [['về đầu tư','investment.country'],['ở Đức','investment.form'],['thành lập GmbH','investment.timeline'],['đang chuẩn bị','investment.goal']]){
    const followup=await chat.message(investment.actor,investment.conversation.id,{body,key:crypto.randomUUID(),aiConsentVersion:CONSENT_VERSION},2000);
    await replyToMessage(investment.actor,investment.conversation.id,followup.id,policy,formatter);
    const transcript=await chat.transcript(investment.actor,investment.conversation.id),reply=transcript.messages.at(-1)!;
    assert.equal(reply.metadata.kind,'clarify');assert.equal(reply.metadata.clarificationKey,key);assert.deepEqual(reply.metadata.sources,[]);assert.equal(transcript.conversation.aiEnabled,true);
   }
   assert.equal(intakeProviderCalls,3,'New fields in the same case can use contextual intake; an outage falls back without retrieval');assert.equal(calls,0);assert.ok(!(await queued(investment.conversation.id)),'A topic intake remains with AI while facts are being clarified');
   const declined=await start('Tôi chưa cần gặp chuyên viên, tôi muốn đầu tư ở Đức','BOTH',CONSENT_VERSION);
   await replyToMessage(declined.actor,declined.conversation.id,declined.message.id,policy,formatter);
   let contact=await chat.transcript(declined.actor,declined.conversation.id);assert.equal(contact.messages.at(-1)?.metadata.clarificationKey,'investment.form');assert.equal(contact.conversation.aiEnabled,true);assert.ok(!(await queued(declined.conversation.id)));
   const conditional=await chat.message(declined.actor,declined.conversation.id,{body:'Nếu không trả lời được thì mới chuyển chuyên viên. Tôi dự định thành lập GmbH',key:crypto.randomUUID(),aiConsentVersion:CONSENT_VERSION},2000);
   await replyToMessage(declined.actor,declined.conversation.id,conditional.id,policy,formatter);
   contact=await chat.transcript(declined.actor,declined.conversation.id);assert.equal(contact.messages.at(-1)?.metadata.clarificationKey,'investment.goal');assert.equal(contact.conversation.aiEnabled,true);assert.ok(!(await queued(declined.conversation.id)));
   const beforeHandoffCalls=intakeProviderCalls;
   const changedMind=await chat.message(declined.actor,declined.conversation.id,{body:'Bây giờ tôi muốn gặp chuyên viên',key:crypto.randomUUID(),aiConsentVersion:CONSENT_VERSION},2000);
   await replyToMessage(declined.actor,declined.conversation.id,changedMind.id,policy,formatter);
   contact=await chat.transcript(declined.actor,declined.conversation.id);assert.equal(contact.messages.at(-1)?.metadata.kind,'handoff');assert.equal(contact.conversation.aiEnabled,false);assert.ok(await queued(declined.conversation.id));assert.equal(intakeProviderCalls,beforeHandoffCalls);
   const human=await chat.message(investment.actor,investment.conversation.id,{body:'tôi muốn gặp chuyên viên',key:crypto.randomUUID(),aiConsentVersion:CONSENT_VERSION},2000);await replyToMessage(investment.actor,investment.conversation.id,human.id,policy,formatter);
   assert.equal((await chat.transcript(investment.actor,investment.conversation.id)).messages.at(-1)?.metadata.kind,'handoff','Explicit human request still overrides topic intake');assert.equal(intakeProviderCalls,beforeHandoffCalls);
  }finally{globalThis.fetch=originalFetch;}
  // Persist the reported unknown-topic dialogue through the real SQL/service
  // path. The provider is scripted; no customer record or live model is used.
  {
   const originalFetch=globalThis.fetch,questions=['Bạn đang hỏi về cách tính thời gian chấp hành án hay một mức án cụ thể?','Bạn nói “20 năm” là mức án đã tuyên hay thời gian bạn đang muốn tìm hiểu?','Bạn đang muốn hỏi quy định về bản án 20 năm, hay câu vừa rồi mang ý khác?'];let turn=0;
   globalThis.fetch=async(_input,init)=>{
    const request=JSON.parse(String(init?.body)),prompt=JSON.parse(request.contents[0].parts[0].text);
    assert.equal(prompt.phase,'intake');assert.equal(prompt.required,null);assert.equal(prompt.requiredQuestion,null);assert.ok(prompt.question.includes('về thời gian ở tù'));
    if(turn)assert.ok(prompt.question.includes('20 năm'));
    return Response.json({candidates:[{finishReason:'STOP',content:{parts:[{text:JSON.stringify({status:'needs_details',detail:'situation',question:questions[turn]})}]}}]});
   };
   try{
    const scenario=await start('về thời gian ở tù','BOTH',CONSENT_VERSION);
    for(const body of ['về thời gian ở tù','tôi cần 20 năm','giúp tôi có 20 năm ở tù']){
     const message=turn?await chat.message(scenario.actor,scenario.conversation.id,{body,key:crypto.randomUUID(),aiConsentVersion:CONSENT_VERSION},2000):scenario.message;
     await replyToMessage(scenario.actor,scenario.conversation.id,message.id,policy,formatter);
     const saved=await chat.transcript(scenario.actor,scenario.conversation.id),reply=saved.messages.at(-1)!;
     assert.equal(reply.body,questions[turn]);assert.equal(reply.metadata.kind,'clarify');assert.equal(reply.metadata.clarificationKey,'intake.situation');assert.deepEqual(reply.metadata.sources,[]);assert.equal(saved.conversation.aiEnabled,true);assert.ok(!(await queued(scenario.conversation.id)));turn++;
    }
    assert.equal(turn,3);
   }finally{globalThis.fetch=originalFetch;}
   console.log('Unknown-topic dialogue passed: first-turn assessment, retained context, specific intent clarification and no invented legal answer or premature handoff (scripted provider).');
  }
  const answered=await start(alias.toUpperCase());
  assert.ok(!(await queued(answered.conversation.id)),'Fresh AI work is not a specialist request');
  await Promise.all([replyToMessage(answered.actor,answered.conversation.id,answered.message.id,policy,formatter),replyToMessage(answered.actor,answered.conversation.id,answered.message.id,policy,formatter)]);
  await replyToMessage(answered.actor,answered.conversation.id,answered.message.id,policy,formatter);
  let transcript=await chat.transcript(answered.actor,answered.conversation.id);assert.equal(calls,1);assert.equal(transcript.messages.length,2);assert.equal(transcript.messages[1].metadata.kind,'ai');assert.equal(transcript.messages[1].metadata.sources[0].id,source.id);assert.ok(transcript.messages[1].body.includes('Synthetic mandatory condition.'));
  await pool.query("UPDATE lvd_conversations SET updated_at=now()-interval '1 minute' WHERE id=$1",[answered.conversation.id]);
  assert.ok(!(await queued(answered.conversation.id)),'Answered AI conversations do not become specialist requests when idle');
  await chat.transition({user:support,guestHash:''},answered.conversation.id,{action:'claim',version:1});
  assert.equal((await chat.transcript(answered.actor,answered.conversation.id)).conversation.aiEnabled,false,'Staff can take over a conversation already answered by AI');
  await assert.rejects(()=>replyToMessage({user:null,guestHash:'unrelated'},answered.conversation.id,answered.message.id,policy,formatter),/quyền/);
  const retitled=await start(),naming=await deferred(retitled),namingSnapshot=(await chat.transcript(retitled.actor,retitled.conversation.id)).conversation;
  await renameCustomerConversation(retitled.actor,retitled.conversation.id,{title:'A',version:namingSnapshot.version,updatedAt:new Date(namingSnapshot.updatedAt!).toISOString()});naming.release();await naming.task;
  const namedTranscript=await chat.transcript(retitled.actor,retitled.conversation.id);assert.equal(namedTranscript.conversation.title,'A');assert.equal(namedTranscript.conversation.customTitle,true);assert.equal(namedTranscript.messages.length,2,'Renaming metadata neither loses an in-flight AI answer nor lets AI replace the custom name');
  const missing=await start('Synthetic uncovered question');await replyToMessage(missing.actor,missing.conversation.id,missing.message.id,policy,formatter);transcript=await chat.transcript(missing.actor,missing.conversation.id);assert.equal(transcript.conversation.aiEnabled,false);assert.equal(transcript.messages[1].metadata.kind,'handoff');assert.equal(calls,1);
  assert.ok(await queued(missing.conversation.id));
  const wrongCountry=await start(title,'DE');await replyToMessage(wrongCountry.actor,wrongCountry.conversation.id,wrongCountry.message.id,policy,formatter);assert.equal((await chat.transcript(wrongCountry.actor,wrongCountry.conversation.id)).messages[1].metadata.kind,'handoff');assert.equal(calls,1);
  const personal=await start('Hồ sơ của tôi: synthetic-private@example.invalid');await replyToMessage(personal.actor,personal.conversation.id,personal.message.id,policy,formatter);assert.equal(calls,1);
  await pool.query("UPDATE knowledge SET expires_at=now()-interval '1 second' WHERE id=$1",[source.id]);const expired=await start();await replyToMessage(expired.actor,expired.conversation.id,expired.message.id,policy,formatter);assert.equal(calls,1);await pool.query('UPDATE knowledge SET expires_at=NULL WHERE id=$1',[source.id]);
  const withdrawn=await start(),withdrawal=await deferred(withdrawn);
  await payload.update({collection:'knowledge',id:source.id,overrideAccess:false,user:support,data:{approved:false}});withdrawal.release();await withdrawal.task;
  assert.equal((await chat.transcript(withdrawn.actor,withdrawn.conversation.id)).messages[1].metadata.kind,'handoff','Withdrawn FAQ cannot commit a pending AI answer');
  await payload.update({collection:'knowledge',id:source.id,overrideAccess:false,user:support,data:{_status:'published',approved:true}});clearFaqCatalog();
  const handed=await start(),handoff=await deferred(handed);
  await chat.transition(handed.actor,handed.conversation.id,{action:'handoff',version:1});handoff.release();await handoff.task;
  assert.equal((await chat.transcript(handed.actor,handed.conversation.id)).messages.length,1,'Explicit human handoff invalidates in-flight AI');
  const claimed=await start(),claiming=await deferred(claimed);
  assert.ok(!(await queued(claimed.conversation.id)),'Interrupted AI stays low until explicit specialist handoff or claim');
  assert.equal((await specialistInbox({user:support,guestHash:''},{view:'low',query:claimed.conversation.id})).total,1);
  await chat.transition({user:support,guestHash:''},claimed.conversation.id,{action:'claim',version:1});claiming.release();await claiming.task;
  assert.equal((await chat.transcript(claimed.actor,claimed.conversation.id)).messages.length,1,'Specialist claim invalidates in-flight AI');
  const stopped=(await pool.query('SELECT state,assigned_to,ai_enabled,ai_generation,ai_started_at,ai_message_id FROM lvd_conversations WHERE id=$1',[claimed.conversation.id])).rows[0];assert.equal(stopped.state,'human');assert.equal(stopped.assigned_to,support.id);assert.equal(stopped.ai_enabled,false);for(const key of ['ai_generation','ai_started_at','ai_message_id'])assert.equal(stopped[key],null);
  const disabled=await start(),switchOff=await deferred(disabled);
  await integrations.setEnabled('ai',2,false,owner.id);switchOff.release();await switchOff.task;
  assert.equal((await chat.transcript(disabled.actor,disabled.conversation.id)).messages[1].metadata.kind,'handoff','Disabling provider cancels pending answer');await integrations.setEnabled('ai',3,true,owner.id);
  const newer=await start(),oldGeneration=await deferred(newer);
  const newMessage=await chat.message(newer.actor,newer.conversation.id,{body:'Synthetic newer uncovered question',key:crypto.randomUUID()},2000);oldGeneration.release();await oldGeneration.task;
  await replyToMessage(newer.actor,newer.conversation.id,newMessage.id,policy,formatter);transcript=await chat.transcript(newer.actor,newer.conversation.id);assert.equal(transcript.messages.length,3);assert.equal(transcript.messages[2].metadata.kind,'handoff','A newer question invalidates the older generation');
  const switched=await start(),settingOff=await deferred(switched);
  await payload.updateGlobal({slug:'site-settings',overrideAccess:false,user:owner,data:{customerAIEnabled:false}});settingOff.release();await settingOff.task;assert.equal((await chat.transcript(switched.actor,switched.conversation.id)).messages[1].metadata.kind,'handoff');
  console.log('Assistant checks passed: exact coverage, public-only model input, idempotency, owner isolation, jurisdiction, expiry, source withdrawal, human handoff, settings/provider shutdown and generation races');
 }finally{
  await payload.updateGlobal({slug:'site-settings',overrideAccess:false,user:owner,data:{customerAIEnabled:true}});
  await pool.query("DELETE FROM lvd_integration_events WHERE provider='ai'");await pool.query("DELETE FROM lvd_integrations WHERE provider='ai'");clearFaqCatalog();
 }
}
