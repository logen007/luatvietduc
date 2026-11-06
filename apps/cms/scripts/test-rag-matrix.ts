// Real CMS hooks, SQL mirrors, index jobs, retrieval and conversations. Provider
// responses are controlled adversarial fixtures, not a semantic quality score.
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
import {writeKnowledgeArticle} from '../src/modules/knowledge/articles';
export async function testRagMatrix(payload:Payload,owner:User,support:User){
 const database=new URL(process.env.DATABASE_URL||'');assert.ok(['localhost','127.0.0.1'].includes(database.hostname)&&database.pathname==='/lvd_test');
 const originalFetch=globalThis.fetch,points=new Map<string,any>(),articles:number[]=[],knowledge:number[]=[],conversations:string[]=[],prompts:any[]=[];
 let allowed:number[]=[],selected:number[]=[],mode='answer',score=.94,providerCalls=0,gate:(()=>Promise<void>)|null=null;
 const intakeMode:{status:'ready'|'low'|'needs_details'|'unavailable'}={status:'ready'};
 const policy={customerAIEnabled:true,chatEnabled:true,aiDailyRequests:1000,aiMaxOutputTokens:2000};
 const synthetic='Synthetic matrix '+crypto.randomUUID();
 const texts={article:'Bộ dữ liệu minh họa ALPHA: đây là nội dung từ bài viết đã xuất bản.\n\nĐiều kiện minh họa ALPHA: chỉ dùng với tình huống mô phỏng, không phải tư vấn pháp luật.',private:'Bộ dữ liệu minh họa BETA: đây là nội dung kiến thức riêng, dùng trong trả lời thử nghiệm.\n\nNgoại lệ minh họa BETA: không được suy diễn thêm ngoài nội dung đã cung cấp.',german:'Synthetischer GAMMA-Datensatz: dieser Text stammt aus dem veröffentlichten Testbeitrag.\n\nBedingung GAMMA: nur für diesen simulierten Ablauf, keine Rechtsberatung.'};
 const json=(value:any,status=200)=>Response.json(value,{status});
 globalThis.fetch=async(input,init)=>{
  const url=String(input),data=init?.body?JSON.parse(String(init.body)):null;
  if(url.startsWith('http://vectors:6333/collections/')){
   if(url.includes('/points/query'))return json({result:{points:[...points.values()].filter(p=>allowed.includes(p.payload.source_id)).map(p=>({id:p.id,score}))}});
   if(url.includes('/points/delete')){const id=data.filter.must[0].match.value,keep=data.filter.must_not?.[0]?.match.value;for(const [key,p] of points)if(p.payload.source_id===id&&p.payload.revision!==keep)points.delete(key);return json({result:true});}
   if(url.includes('/points?')){for(const point of data.points)points.set(point.id,point);return json({result:true});}
   return json({result:{status:'green'}});
  }
  assert.ok(url.startsWith('https://generativelanguage.googleapis.com/v1beta/models/'),'No unexpected external request');providerCalls++;
  if(url.includes(':embedContent'))return json({embedding:{values:Array.from({length:DIMENSIONS},(_,index)=>index===0?1:0)}});
  const prompt=JSON.parse(data.contents[0].parts[0].text);
  if(prompt.phase==='intake'){
   if(intakeMode.status==='unavailable')return json({},503);
   const assessment={status:intakeMode.status,...(intakeMode.status==='needs_details'?{detail:'situation'}:{})};
   return json({candidates:[{finishReason:'STOP',content:{parts:[{text:JSON.stringify(assessment)}]}}]});
  }
  if(mode==='quota')return json({},429);
  prompts.push(prompt);
  assert.ok(prompt.sources.every((source:any)=>allowed.includes(Number(source.key.split('-')[1]))),'Only allowed retrieval candidates enter selection');
  if(gate)await gate();
  let value:any=mode==='handoff'?{kind:'handoff'}:mode==='clarify'?{kind:'clarify-details',detail:'timeline'}:{kind:'answer',passages:prompt.sources.filter((source:any)=>selected.includes(Number(source.key.split('-')[1]))).flatMap((source:any)=>source.text.split(/\n\s*\n/).map((quote:string)=>({key:source.key,quote})))};
  if(mode==='invented')value={kind:'answer',passages:[{key:prompt.sources[0].key,quote:'Invented statement which never existed in any approved content.'}]};
  if(mode==='wrong-source')value={kind:'answer',passages:[{key:'source-999999999',quote:prompt.sources[0].text.split(/\n\s*\n/)[0]}]};
  if(mode==='omit-condition')value.passages=value.passages.slice(0,1);
  if(mode==='fragment')value.passages[0].quote=value.passages[0].quote.slice(0,35);
  return json({candidates:[{finishReason:mode==='truncated'?'MAX_TOKENS':'STOP',content:{parts:[{text:mode==='bad-json'?'not-json':JSON.stringify(value)}]}}]});
 };
 async function article(title:string,body:string,country:'VN'|'DE'|'BOTH'='BOTH',extra:any={}){
  const doc=await payload.create({collection:'articles',user:owner,overrideAccess:false,data:{title:synthetic+' '+title,body,jurisdiction:country,language:country==='DE'?'de':'vi',_status:'published',aiAllowed:true,...extra}});articles.push(doc.id);return doc;
 }
 async function mirror(id:number){return (await pool.query('SELECT * FROM knowledge WHERE article_origin_id=$1',[id])).rows[0];}
 async function index(id:number){
  await pool.query("UPDATE lvd_rag_jobs SET status='pending',available_at=now()-interval '10 days' WHERE source_id=$1",[id]);
  for(let attempt=0;attempt<20;attempt++){await indexNext();const row=(await pool.query('SELECT status FROM lvd_rag_jobs WHERE source_id=$1',[id])).rows[0];if(row?.status==='ready')return;}
  throw new Error('Synthetic source not indexed: '+id);
 }
 async function start(question:string,consent=true){const actor:chat.Actor={user:null,guestHash:crypto.randomUUID()},conversation=await chat.createConversation(actor,{consent:true},{assistantEnabled:true});conversations.push(conversation.id);return turn({actor,id:conversation.id},question,consent);}
 async function turn(thread:{actor:chat.Actor;id:string},question:string,consent=true){
  const message=await chat.message(thread.actor,thread.id,{body:question,key:crypto.randomUUID(),...(consent?{aiConsentVersion:CONSENT_VERSION}:{})},2000);
  await replyToMessage(thread.actor,thread.id,message.id,policy);return {...thread,result:await chat.transcript(thread.actor,thread.id)};
 }
 const last=(thread:Awaited<ReturnType<typeof start>>)=>thread.result.messages.at(-1)!;
 async function ready(id:number){allowed=[id];selected=[id];mode='answer';score=.94;await index(id);}
 try{
  await integrations.saveConnection('ai',{apiKey:'synthetic-matrix-key-no-network',model:'synthetic-model'},0,owner.id);await integrations.markCheck('ai',1,'passed',owner.id);await integrations.setEnabled('ai',1,true,owner.id);
  const connection=(await integrations.activeValues('ai'))!;
  const a=await article('ALPHA',texts.article,'VN'),aSource=await mirror(a.id);assert.ok(aSource);await ready(aSource.id);
  let result=await start('Xin giải thích bộ dữ liệu ALPHA tại Việt Nam?');assert.equal(last(result).body,texts.article);assert.ok(last(result).metadata.sources[0].url?.endsWith('/bai-viet/'+a.slug));
  result=await turn(result,'Cảm ơn');assert.equal(last(result).metadata.kind,'clarify');
  let qualification=(await pool.query('SELECT qualification,retain_history,low_priority_expires_at FROM lvd_conversations WHERE id=$1',[result.id])).rows[0];
  assert.equal(qualification.retain_history,true);assert.notEqual(qualification.qualification,'low');assert.equal(qualification.low_priority_expires_at,null,'Thanks cannot make a meaningful conversation disposable');
  const k=await writeKnowledgeArticle(payload,support,{title:synthetic+' BETA',body:texts.private,publish:true});knowledge.push(k.id);await ready(k.id);
  result=await start('Xin giải thích bộ dữ liệu BETA?');assert.equal(last(result).body,texts.private);assert.equal(last(result).metadata.sources[0].url,undefined,'Private knowledge cannot publish its admin/source URL');
  for(const status of ['low','needs_details','unavailable'] as const){
   intakeMode.status=status;const selectionCount=prompts.length;
   const assessed=await start('Xin giải thích nội dung phân loại mô phỏng?');assert.equal(last(assessed).metadata.kind,'clarify',status);
   assert.equal(prompts.length,selectionCount,'Unqualified intake cannot reach sourced answer selection');
   qualification=(await pool.query('SELECT qualification,retain_history,low_priority_expires_at FROM lvd_conversations WHERE id=$1',[assessed.id])).rows[0];
   assert.equal(qualification.qualification,status==='low'?'low':'needs_details',status);
   assert.equal(qualification.retain_history,status!=='low',status);
   assert.equal(Boolean(qualification.low_priority_expires_at),status==='low',status);
  }
  intakeMode.status='ready';
  const german=await article('GAMMA',texts.german,'DE'),gSource=await mirror(german.id);await ready(gSource.id);result=await start('Bitte erläutern Sie den GAMMA-Datensatz in Deutschland?');assert.equal(last(result).body,texts.german);
  allowed=[aSource.id,k.id];selected=[aSource.id,k.id];mode='answer';result=await start('Xin giải thích ALPHA và BETA tại Việt Nam?');assert.equal(last(result).metadata.sources.length,2);assert.ok(last(result).body.includes(texts.article)&&last(result).body.includes(texts.private));
  const priorBody=last(result).body;result=await turn(result,'Bạn giải thích ý thứ hai trong câu trả lời trên được không?');assert.equal(prompts.at(-1).previousAnswer,priorBody,'A follow-up must identify the actual prior answer using still-valid source paragraphs');
  // Cross-country distractor remains in the mocked vector result intentionally;
  // real SQL scope filtering, not this fixture, must reject it.
  allowed=[aSource.id,gSource.id,k.id];selected=[aSource.id];result=await start('Xin giải thích ALPHA tại Việt Nam?');assert.ok(prompts.at(-1).sources.every((s:any)=>s.key!=='source-'+gSource.id));
  selected=[gSource.id];result=await start('Không phải Việt Nam mà tại Đức: giải thích GAMMA?');assert.ok(prompts.at(-1).sources.every((s:any)=>s.key!=='source-'+aSource.id));assert.equal(last(result).body,texts.german);
  // Actual stored multi-turn intake: unknown facts cannot reach a provider.
  await ready(k.id);let beforeIntakeCalls=providerCalls;
  let intake=await start('Hay');
  assert.equal(last(intake).metadata.kind,'clarify');
  for(const [body,key] of [['Tôi muốn đầu tư','investment.country'],['ở Đức','investment.form'],['thành lập GmbH','investment.timeline'],['muốn biết thủ tục','investment.timeline'],['chưa biết ngày nào','investment.timeline'],['không rõ thời hạn','investment.timeline']]){
   intake=await turn(intake,body);assert.equal(last(intake).metadata.kind,'clarify',body);assert.equal(last(intake).metadata.clarificationKey,key,body);assert.equal(providerCalls,beforeIntakeCalls,'No provider requests before facts are supplied: '+body);assert.equal(intake.result.conversation.aiEnabled,true);
  }
  intake=await turn(intake,'chưa thực hiện');assert.equal(last(intake).metadata.kind,'ai');assert.equal(last(intake).metadata.sources[0].id,k.id);assert.ok(providerCalls>beforeIntakeCalls,'Completed intake reaches source retrieval');
  beforeIntakeCalls=providerCalls;let switched=await start('Tôi muốn đầu tư tại Đức');
  for(const [body,key] of [['Tôi muốn hỏi về ly hôn','family.country'],['Việt Nam','family.situation'],['tài sản','family.timeline'],['chưa ký','family.parties']]){
   switched=await turn(switched,body);assert.equal(last(switched).metadata.kind,'clarify',body);assert.equal(last(switched).metadata.clarificationKey,key,body);assert.equal(providerCalls,beforeIntakeCalls,'Changing topic must collect its own facts');
  }
  allowed=[];switched=await turn(switched,'vợ chồng');assert.equal(last(switched).metadata.kind,'handoff','Only a completed uncovered situation goes to staff');
  beforeIntakeCalls=providerCalls;let corrected=await start('Tôi muốn đầu tư tại Đức');
  corrected=await turn(corrected,'Không phải Đức, chưa biết nước nào');assert.equal(last(corrected).metadata.clarificationKey,'investment.country');
  corrected=await turn(corrected,'Việt Nam');assert.equal(last(corrected).metadata.clarificationKey,'investment.form');assert.equal(providerCalls,beforeIntakeCalls);
  await ready(gSource.id);beforeIntakeCalls=providerCalls;let germanIntake=await start('Hallo');
  for(const [body,key] of [['Ich möchte investieren','investment.country'],['Deutschland','investment.form'],['Gründung einer GmbH','investment.timeline'],['Die Frist ist noch unklar','investment.timeline'],['noch nicht begonnen','investment.goal']]){
   germanIntake=await turn(germanIntake,body);assert.equal(last(germanIntake).metadata.kind,'clarify',body);assert.equal(last(germanIntake).metadata.clarificationKey,key,body);assert.equal(providerCalls,beforeIntakeCalls);
  }
  germanIntake=await turn(germanIntake,'Das Verfahren');assert.equal(last(germanIntake).metadata.kind,'ai');assert.equal(last(germanIntake).body,texts.german);
  console.log('Stored intake dialogues passed: vague opening, missing/unknown dates, source answer only after facts, new-topic reset, country correction and completed no-source handoff.');
  const off=await article('AI-OFF','Synthetic excluded opt-out content must never reach any provider.', 'BOTH',{aiAllowed:false});const offSource=await mirror(off.id);assert.ok(!offSource?.approved);if(offSource){await ready(offSource.id);assert.equal((await retrieve('Synthetic opt-out','BOTH',connection)).sources.length,0);}
  const draft=await article('DRAFT','Synthetic unpublished article must never reach any provider.','BOTH',{_status:'draft'});const draftSource=await mirror(draft.id);assert.ok(!draftSource?.approved);if(draftSource){await ready(draftSource.id);assert.equal((await retrieve('Synthetic draft','BOTH',connection)).sources.length,0);}
  const privateDraft=await writeKnowledgeArticle(payload,support,{title:synthetic+' PRIVATE-DRAFT',body:'Synthetic private draft must not appear in retrieval.',publish:false});knowledge.push(privateDraft.id);await ready(privateDraft.id);assert.equal((await retrieve('Synthetic private draft','BOTH',connection)).sources.length,0);
  // An opted-in published article is immediately ineligible when unticked,
  // even while stale vector points remain in the index.
  await ready(aSource.id);await payload.update({collection:'articles',id:a.id,user:owner,overrideAccess:false,data:{aiAllowed:false,_status:'published'}});assert.equal((await retrieve('ALPHA tại Việt Nam','BOTH',connection)).sources.length,0);
  await payload.update({collection:'articles',id:a.id,user:owner,overrideAccess:false,data:{aiAllowed:true,_status:'published'}});await ready(aSource.id);
  // 32 exchanges alternate public/private sources. Every next turn follows an
  // actual stored answer, so context retention crosses the old AI boundary.
  let long=await start('Xin giải thích ALPHA tại Việt Nam, mã thử MATRIX-ANCHOR?');
  for(let turnIndex=2;turnIndex<=32;turnIndex++){
   const id=turnIndex%2?k.id:aSource.id;allowed=[id];selected=[id];
   long=await turn(long,'Còn bộ dữ liệu '+(turnIndex%2?'BETA':'ALPHA')+' thì sao? Lượt '+turnIndex);
   assert.equal(long.result.messages.length,turnIndex*2);assert.equal(last(long).metadata.kind,'ai');assert.equal(last(long).metadata.sources[0].id,id);assert.ok(prompts.at(-1).question.includes('MATRIX-ANCHOR'));
  }
  // Provider response failures never become unsupported customer answers.
  for(const failure of ['invented','wrong-source','omit-condition','fragment','truncated','bad-json','quota','handoff']){
   allowed=[k.id];selected=[k.id];mode=failure;result=await start('Xin giải thích bộ dữ liệu BETA?');assert.equal(last(result).metadata.kind,'handoff',failure);assert.equal(result.result.conversation.aiEnabled,false);
   const beforeCalls=providerCalls;await turn(result,'Xin bổ sung thông tin BETA.');assert.equal(providerCalls,beforeCalls,'A handed-off conversation cannot silently restart AI');
  }
  const humanThread=result;const specialist:chat.Actor={user:support,guestHash:'synthetic-staff'};await chat.transition(specialist,humanThread.id,{action:'claim',version:humanThread.result.conversation.version});const beforeHumanCalls=providerCalls;await chat.message(specialist,humanThread.id,{body:'Synthetic specialist reply after source handoff.',key:crypto.randomUUID()},2000);const humanLog=await chat.transcript(humanThread.actor,humanThread.id);assert.equal(humanLog.messages.at(-1)?.role,'staff');assert.equal(humanLog.messages.at(-1)?.author_name,support.name);await turn(humanThread,'Synthetic customer follow-up after specialist reply.');assert.equal(providerCalls,beforeHumanCalls,'Human ownership keeps AI stopped');
  allowed=[k.id];selected=[k.id];mode='answer';score=.3;result=await start('Xin giải thích BETA?');assert.equal(last(result).metadata.kind,'handoff');score=.94;
  allowed=[];result=await start('Xin giải thích nội dung chưa hề có trong kho?');assert.equal(last(result).metadata.kind,'handoff');
  await ready(k.id);let calls=providerCalls;await start('Synthetic unconsented question',false);assert.equal(providerCalls,calls);await start('Hồ sơ của tôi: synthetic@example.invalid');assert.equal(providerCalls,calls);
  // A vague question is clarified locally, before any provider call.
  calls=providerCalls;result=await start('Tôi cần');assert.equal(last(result).metadata.kind,'clarify');assert.equal(providerCalls,calls);
  result=await turn(result,'Về đầu tư');assert.equal(last(result).metadata.kind,'clarify');assert.equal(providerCalls,calls);
  mode='clarify';allowed=[k.id];selected=[k.id];result=await start('Xin giải thích BETA?');assert.equal(last(result).metadata.kind,'clarify');mode='answer';result=await turn(result,'Đang chuẩn bị, chưa thực hiện.');assert.equal(last(result).metadata.kind,'ai');
  // Current source revision is checked again after generation.
  await ready(k.id);let reached!:()=>void,release!:()=>void;const waiting=new Promise<void>(resolve=>{reached=resolve;}),hold=new Promise<void>(resolve=>{release=resolve;});gate=async()=>{reached();await hold;};
  const task=start('Xin giải thích BETA?');await waiting;
  await payload.update({collection:'knowledge',id:k.id,user:owner,overrideAccess:false,data:{body:texts.private+'\n\nSynthetic revised marker.',_status:'published'}});release();result=await task;gate=null;assert.equal(last(result).metadata.kind,'handoff','Editing a source invalidates in-flight evidence');
  await ready(k.id);await pool.query("UPDATE knowledge SET review_due_at=now()-interval '1 minute' WHERE id=$1",[k.id]);assert.equal((await retrieve('BETA','BOTH',connection)).sources.length,0);
  // Article deletion cannot leave an answerable mirrored record.
  await ready(aSource.id);await payload.delete({collection:'articles',id:a.id,user:owner,overrideAccess:false});articles.splice(articles.indexOf(a.id),1);assert.equal((await retrieve('ALPHA tại Việt Nam','BOTH',connection)).sources.length,0);
  console.log('RAG article/private-knowledge matrix passed: public/private/mixed citations, VI/DE distractors, opt-out/drafts, 32 turns/64 messages, clarification, unsupported output/quota, human handoff, source-edit race, expiry and deletion (mocked providers).');
 }finally{
  globalThis.fetch=originalFetch;
  if(conversations.length)await pool.query('DELETE FROM lvd_conversations WHERE id=ANY($1::uuid[])',[conversations]);
  for(const id of articles)await payload.delete({collection:'articles',id,user:owner,overrideAccess:false});
  for(const id of knowledge)await payload.delete({collection:'knowledge',id,user:owner,overrideAccess:false});
  await pool.query("DELETE FROM lvd_integration_events WHERE provider='ai'");await pool.query("DELETE FROM lvd_integrations WHERE provider='ai'");
 }
}
