// Synthetic pipeline test. All Gemini/vector requests are intercepted; never send these fixtures to providers.
import assert from 'node:assert/strict';
import type {Payload} from 'payload';
import type {User} from '../src/payload-types';
import {pool} from '../src/modules/shared/db';
import {indexNext} from '../src/modules/rag/indexer';
import {retrieve} from '../src/modules/rag/retrieve';
import {CONSENT_VERSION,DIMENSIONS} from '../src/modules/rag/core';
import {replyToMessage} from '../src/modules/assistant/reply';
import * as chat from '../src/modules/chat/service';
import * as integrations from '../src/modules/integrations/store';
export async function testRag(payload:Payload,owner:User,support:User){
 const database=new URL(process.env.DATABASE_URL||'');if(!['localhost','127.0.0.1'].includes(database.hostname)||database.pathname!=='/lvd_test')throw new Error('Isolated CI database only');
 const originalFetch=globalThis.fetch,requests:{task:string;text:string}[]=[],points=new Map<string,any>();
 let gate:(()=>Promise<void>)|null=null,invalid=false,failIndex=false;
 const faqTitle='Synthetic published document '+crypto.randomUUID(),body='Synthetic public answer for semantic retrieval.\n\nSynthetic mandatory exception and condition.';
 const source=await payload.create({collection:'knowledge',user:support,overrideAccess:false,data:{title:faqTitle,body,jurisdiction:'BOTH',sourceUrl:'https://example.invalid/rag-source',effectiveFrom:new Date(Date.now()-86400000).toISOString(),reviewDueAt:new Date(Date.now()+86400000).toISOString(),_status:'published'}});
 await integrations.saveConnection('ai',{apiKey:'synthetic-rag-key-no-network',model:'synthetic-model'},0,owner.id);await integrations.markCheck('ai',1,'passed',owner.id);await integrations.setEnabled('ai',1,true,owner.id);
 const connection=(await integrations.activeValues('ai'))!,policy={customerAIEnabled:true,chatEnabled:true,aiDailyRequests:1000,aiMaxOutputTokens:2000};
 globalThis.fetch=async(input,init)=>{
  const url=String(input),data=init?.body?JSON.parse(String(init.body)):null;
  const json=(value:any,status=200)=>new Response(JSON.stringify(value),{status,headers:{'content-type':'application/json'}});
  if(url.startsWith('http://vectors:6333/collections/')){
   if(url.includes('/points/query'))return json({result:{points:[...points.values()].map(p=>({id:p.id,score:0.91}))}});
   if(url.includes('/points/delete')){const id=data.filter.must[0].match.value,keep=data.filter.must_not?.[0]?.match.value;for(const [key,p] of points)if(p.payload.source_id===id&&p.payload.revision!==keep)points.delete(key);return json({result:true});}
   if(url.includes('/points?')){for(const p of data.points)points.set(p.id,p);return json({result:true});}
   return json({result:{status:'green'}});
  }
  assert.ok(url.startsWith('https://generativelanguage.googleapis.com/v1beta/models/'),'Unexpected external destination');
  if(url.includes(':embedContent')){
   requests.push({task:data.taskType,text:data.content.parts[0].text});
   if(failIndex&&data.taskType==='RETRIEVAL_DOCUMENT')return json({},429);
   return json({embedding:{values:Array.from({length:DIMENSIONS},(_,i)=>i===0?1:0)}});
  }
  assert.ok(url.endsWith(':generateContent'));
  if(gate)await gate();
  const prompt=JSON.parse(data.contents[0].parts[0].text);requests.push({task:'generate',text:JSON.stringify(prompt)});
  const selection={kind:'answer',passages:prompt.sources.slice(0,1).flatMap((s:any)=>s.text.split(/\n\s*\n/).map((quote:string)=>({key:s.key,quote:invalid?'Invented unsupported legal statement.':quote})))};
  return json({candidates:[{finishReason:'STOP',content:{parts:[{text:JSON.stringify(selection)}]}}]});
 };
 async function indexSource(){await pool.query("UPDATE lvd_rag_jobs SET status='pending',available_at=now()-interval '2 days' WHERE source_id=$1",[source.id]);await indexNext();}
 async function start(question='Synthetic paraphrase with no exact title match',consent=true){
  const actor:chat.Actor={user:null,guestHash:crypto.randomUUID()},conversation=await chat.createConversation(actor,{consent:true},{assistantEnabled:true});
  const message=await chat.message(actor,conversation.id,{body:question,key:crypto.randomUUID(),...(consent?{aiConsentVersion:CONSENT_VERSION}:{})},2000);return {actor,conversation,message};
 }
 async function answer(test:Awaited<ReturnType<typeof start>>){await replyToMessage(test.actor,test.conversation.id,test.message.id,policy);return chat.transcript(test.actor,test.conversation.id);}
 try{
  await indexSource();
  assert.equal((await pool.query('SELECT status FROM lvd_rag_jobs WHERE source_id=$1',[source.id])).rows[0].status,'ready');
  assert.ok((await retrieve('Synthetic paraphrase','BOTH',connection)).sources.some(s=>s.id===source.id));
  assert.ok(requests.filter(r=>r.task==='RETRIEVAL_DOCUMENT').every(r=>!r.text.includes('Synthetic paraphrase')),'Indexing receives public content only');
  const normal=await start();await Promise.all([answer(normal),answer(normal)]);
  let transcript=await chat.transcript(normal.actor,normal.conversation.id);assert.equal(transcript.messages.length,2);assert.equal(transcript.messages[1].metadata.retrieval,'semantic-v1');assert.equal(transcript.messages[1].body,body);assert.equal(transcript.messages[1].metadata.sources[0].id,source.id);
  assert.equal(transcript.messages[0].metadata.aiConsent.version,CONSENT_VERSION);
  const before=requests.length;await answer(await start('Synthetic private question without consent',false));assert.equal(requests.length,before,'Legacy messages cannot send a query to Gemini');
  await answer(await start('Hồ sơ của tôi: private@example.invalid'));assert.equal(requests.length,before,'Sensitive cases hand off before any provider request');
  invalid=true;transcript=await answer(await start());assert.equal(transcript.messages[1].metadata.kind,'handoff','Invented output cannot reach chat');invalid=false;
  let reached!:()=>void,release!:()=>void;
  const waiting=new Promise<void>(resolve=>{reached=resolve;}),hold=new Promise<void>(resolve=>{release=resolve;});gate=async()=>{reached();await hold;};
  const pending=await start(),task=answer(pending);await waiting;
  await payload.update({collection:'knowledge',id:source.id,user:support,overrideAccess:false,data:{approved:false}});release();transcript=await task;gate=null;
  assert.equal(transcript.messages[1].metadata.kind,'handoff','Withdrawal rejects already-retrieved source');
  assert.equal((await retrieve('Synthetic paraphrase','BOTH',connection)).sources.length,0,'Stale vectors cannot expose withdrawn sources');
  await indexSource();assert.equal(points.size,0,'Withdrawal removes retired vectors');
  await payload.update({collection:'knowledge',id:source.id,user:support,overrideAccess:false,data:{_status:'published',approved:true}});
  await pool.query('DELETE FROM lvd_rag_embeddings WHERE source_id=$1',[source.id]);failIndex=true;await indexSource();assert.equal((await pool.query('SELECT status,error_code FROM lvd_rag_jobs WHERE source_id=$1',[source.id])).rows[0].error_code,'provider-quota');failIndex=false;
  await indexSource();assert.equal((await pool.query('SELECT status FROM lvd_rag_jobs WHERE source_id=$1',[source.id])).rows[0].status,'ready','A failed embedding retries safely');
  const embeddingCalls=requests.filter(r=>r.task==='RETRIEVAL_DOCUMENT').length;await indexSource();assert.equal(requests.filter(r=>r.task==='RETRIEVAL_DOCUMENT').length,embeddingCalls,'Reindex reuses checkpointed public embeddings');
  await payload.delete({collection:'knowledge',id:source.id,user:owner,overrideAccess:false});await indexSource();assert.equal(points.size,0);assert.equal((await pool.query('SELECT count(*)::int AS n FROM lvd_rag_chunks WHERE source_id=$1',[source.id])).rows[0].n,0);
  console.log('Semantic RAG pipeline checks passed: durable indexing, semantic route, consent boundary, exact citations, no invented claims, withdrawal race, retry and delete cleanup (mocked providers, not a semantic-quality benchmark)');
 }finally{globalThis.fetch=originalFetch;await pool.query("DELETE FROM lvd_integration_events WHERE provider='ai'");await pool.query("DELETE FROM lvd_integrations WHERE provider='ai'");}
}
