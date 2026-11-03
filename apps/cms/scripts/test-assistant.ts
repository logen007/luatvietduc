// Synthetic fixtures only. Never point this helper at a production database or provider.
import assert from 'node:assert/strict';
import type {Payload} from 'payload';
import type {User} from '../src/payload-types';
import {pool} from '../src/modules/shared/db';
import * as chat from '../src/modules/chat/service';
import * as integrations from '../src/modules/integrations/store';
import {replyToMessage} from '../src/modules/assistant/reply';
import {publicFaq,clearFaqCatalog,type Faq} from '../src/modules/assistant/faq';
import {validateOutline} from '../src/modules/assistant/format';
const outline=(faq:Faq)=>validateOutline({sections:[{title:'Giải đáp',paragraphs:publicFaq(faq).paragraphs.map((_,index)=>index)}]},publicFaq(faq).paragraphs);
export async function testAssistant(payload:Payload,owner:User,support:User){
 const database=new URL(process.env.DATABASE_URL||'');if(!['localhost','127.0.0.1'].includes(database.hostname)||database.pathname!=='/lvd_test')throw new Error('Isolated CI database only');
 const suffix=crypto.randomUUID().replace(/\d/g,'x'),title='Synthetic public question '+suffix,alias='Synthetic alternate question '+suffix;
 const source=await payload.create({collection:'knowledge',overrideAccess:false,user:support,data:{title,questionAliases:alias,body:'Synthetic approved answer.\n\nSynthetic mandatory condition.',jurisdiction:'VN',sourceUrl:'https://example.invalid/synthetic-source',effectiveFrom:new Date(Date.now()-86400000).toISOString(),reviewDueAt:new Date(Date.now()+86400000).toISOString(),_status:'published'}});
 assert.equal(source.approved,true);assert.equal(typeof source.reviewedBy==='object'?source.reviewedBy?.id:source.reviewedBy,support.id);
 await assert.rejects(()=>payload.create({collection:'knowledge',overrideAccess:false,user:support,data:{title:'Forbidden country',body:'Synthetic',jurisdiction:'DE',sourceUrl:'https://example.invalid/source',effectiveFrom:new Date().toISOString(),reviewDueAt:new Date(Date.now()+86400000).toISOString(),_status:'published'}}));
 await payload.updateGlobal({slug:'site-settings',overrideAccess:false,user:owner,data:{customerAIEnabled:true,chatEnabled:true}});
 await integrations.saveConnection('ai',{apiKey:'synthetic-ai-key-no-provider-request',model:'synthetic-model'},0,owner.id);await integrations.markCheck('ai',1,'passed',owner.id);await integrations.setEnabled('ai',1,true,owner.id);
 const policy={customerAIEnabled:true,chatEnabled:true,aiDailyRequests:20,aiMaxOutputTokens:700};
 let calls=0;const formatter=async(faq:Faq)=>{calls++;assert.ok(!JSON.stringify(publicFaq(faq)).includes(alias.toUpperCase()));return outline(faq);};
 async function start(body=title,country='VN'){
  const actor:chat.Actor={user:null,guestHash:crypto.randomUUID()};
  const conversation=await chat.createConversation(actor,{jurisdiction:country,consent:true,privacyNoticeVersion:'chat-v2'},{assistantEnabled:true});
  const message=await chat.message(actor,conversation.id,{body,key:crypto.randomUUID()},2000);return {actor,conversation,message};
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
  const answered=await start(alias.toUpperCase());
  assert.ok(!(await chat.queue({user:support,guestHash:''})).some(row=>row.id===answered.conversation.id),'Fresh AI work is not a specialist request');
  await Promise.all([replyToMessage(answered.actor,answered.conversation.id,answered.message.id,policy,formatter),replyToMessage(answered.actor,answered.conversation.id,answered.message.id,policy,formatter)]);
  await replyToMessage(answered.actor,answered.conversation.id,answered.message.id,policy,formatter);
  let transcript=await chat.transcript(answered.actor,answered.conversation.id);assert.equal(calls,1);assert.equal(transcript.messages.length,2);assert.equal(transcript.messages[1].metadata.kind,'ai');assert.equal(transcript.messages[1].metadata.sources[0].id,source.id);assert.ok(transcript.messages[1].body.includes('Synthetic mandatory condition.'));
  await pool.query("UPDATE lvd_conversations SET updated_at=now()-interval '1 minute' WHERE id=$1",[answered.conversation.id]);
  assert.ok(!(await chat.queue({user:support,guestHash:''})).some(row=>row.id===answered.conversation.id),'Answered AI conversations do not become specialist requests when idle');
  await assert.rejects(()=>chat.transition({user:support,guestHash:''},answered.conversation.id,{action:'claim',version:1}),/chưa yêu cầu/);
  await assert.rejects(()=>replyToMessage({user:null,guestHash:'unrelated'},answered.conversation.id,answered.message.id,policy,formatter),/quyền/);
  const missing=await start('Synthetic uncovered question');await replyToMessage(missing.actor,missing.conversation.id,missing.message.id,policy,formatter);transcript=await chat.transcript(missing.actor,missing.conversation.id);assert.equal(transcript.conversation.aiEnabled,false);assert.equal(transcript.messages[1].metadata.kind,'handoff');assert.equal(calls,1);
  assert.ok((await chat.queue({user:support,guestHash:''})).some(row=>row.id===missing.conversation.id));
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
  await pool.query("UPDATE lvd_conversations SET ai_started_at=now()-interval '1 minute' WHERE id=$1",[claimed.conversation.id]);
  assert.ok((await chat.queue({user:support,guestHash:''})).some(row=>row.id===claimed.conversation.id),'Interrupted unanswered AI can reach the specialist queue');
  await chat.transition({user:support,guestHash:''},claimed.conversation.id,{action:'claim',version:1});claiming.release();await claiming.task;
  assert.equal((await chat.transcript(claimed.actor,claimed.conversation.id)).messages.length,1,'Specialist claim invalidates in-flight AI');
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
