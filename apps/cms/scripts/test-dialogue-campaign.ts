import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
// Real CMS hooks, SQL mirrors, index jobs, retrieval and conversations. Provider
// responses are controlled adversarial fixtures, not a semantic quality score.
import assert from 'node:assert/strict';
import type {Payload} from 'payload';
import type {User} from '../src/payload-types';
import {pool} from '../src/modules/shared/db';
import {indexNext} from '../src/modules/rag/indexer';
import {CONSENT_VERSION,DIMENSIONS} from '../src/modules/rag/core';
import {replyToMessage} from '../src/modules/assistant/reply';
import * as chat from '../src/modules/chat/service';
import * as integrations from '../src/modules/integrations/store';
import {writeKnowledgeArticle} from '../src/modules/knowledge/articles';
export async function testDialogueCampaign(payload:Payload,owner:User,support:User){
 const database=new URL(process.env.DATABASE_URL||'');assert.ok(['localhost','127.0.0.1'].includes(database.hostname)&&database.pathname==='/lvd_test');
 const originalFetch=globalThis.fetch,points=new Map<string,any>(),articles:number[]=[],knowledge:number[]=[],conversations:string[]=[],prompts:any[]=[];
 let allowed:number[]=[],selected:number[]=[],mode='answer',score=.94,providerCalls=0,intakeCalls=0,queryEmbeddings=0,vectorQueries=0;
 const retrievalCounts=()=>[queryEmbeddings,vectorQueries,prompts.length];
 const intakeMode:{status:'ready'|'low'|'needs_details'|'unavailable'}={status:'ready'};
 const policy={customerAIEnabled:true,chatEnabled:true,aiDailyRequests:100000,aiMaxOutputTokens:2000};
 const synthetic='Synthetic matrix '+crypto.randomUUID();
 const texts={article:'Bộ dữ liệu minh họa ALPHA: đây là nội dung từ bài viết đã xuất bản.\n\nĐiều kiện minh họa ALPHA: chỉ dùng với tình huống mô phỏng, không phải tư vấn pháp luật.',private:'Bộ dữ liệu minh họa BETA: đây là nội dung kiến thức riêng, dùng trong trả lời thử nghiệm.\n\nNgoại lệ minh họa BETA: không được suy diễn thêm ngoài nội dung đã cung cấp.',german:'Synthetischer GAMMA-Datensatz: dieser Text stammt aus dem veröffentlichten Testbeitrag.\n\nBedingung GAMMA: nur für diesen simulierten Ablauf, keine Rechtsberatung.'};
 const json=(value:any,status=200)=>Response.json(value,{status});
 globalThis.fetch=async(input,init)=>{
  const url=String(input),data=init?.body?JSON.parse(String(init.body)):null;
  if(url.startsWith('http://vectors:6333/collections/')){
   if(url.includes('/points/query')){vectorQueries++;return json({result:{points:[...points.values()].filter(p=>allowed.includes(p.payload.source_id)).map(p=>({id:p.id,score}))}});}
   if(url.includes('/points/delete')){const id=data.filter.must[0].match.value,keep=data.filter.must_not?.[0]?.match.value;for(const [key,p] of points)if(p.payload.source_id===id&&p.payload.revision!==keep)points.delete(key);return json({result:true});}
   if(url.includes('/points?')){for(const point of data.points)points.set(point.id,point);return json({result:true});}
   return json({result:{status:'green'}});
  }
  assert.ok(url.startsWith('https://generativelanguage.googleapis.com/v1beta/models/'),'No unexpected external request');providerCalls++;
  if(url.includes(':embedContent')){if(data.taskType==='RETRIEVAL_QUERY')queryEmbeddings++;return json({embedding:{values:Array.from({length:DIMENSIONS},(_,index)=>index===0?1:0)}});}
  const prompt=JSON.parse(data.contents[0].parts[0].text);
  if(prompt.phase==='intake'){
   intakeCalls++;
   if(intakeMode.status==='unavailable')return json({},503);
   const assessment={status:intakeMode.status,...(intakeMode.status==='needs_details'?{detail:'situation'}:{})};
   return json({candidates:[{finishReason:'STOP',content:{parts:[{text:JSON.stringify(assessment)}]}}]});
  }
  if(mode==='quota')return json({},429);
  prompts.push(prompt);
  assert.ok(prompt.sources.every((source:any)=>allowed.includes(Number(source.key.split('-')[1]))),'Only allowed retrieval candidates enter selection');
  let value:any=mode==='handoff'?{kind:'handoff'}:mode==='clarify'?{kind:'clarify-details',detail:'timeline'}:{kind:'answer',passages:prompt.sources.filter((source:any)=>selected.includes(Number(source.key.split('-')[1]))).flatMap((source:any)=>source.text.split(/\n\s*\n/).map((quote:string)=>({key:source.key,quote})))};
  if(mode==='invented')value={kind:'answer',passages:[{key:prompt.sources[0].key,quote:'Invented statement which never existed in any approved content.'}]};
  if(mode==='wrong-source')value={kind:'answer',passages:[{key:'source-999999999',quote:prompt.sources[0].text.split(/\n\s*\n/)[0]}]};
  if(mode==='omit-condition')value.passages=value.passages.slice(0,1);
  if(mode==='fragment'||mode==='fragment-without-condition')value.passages[0].quote=value.passages[0].quote.slice(0,35);
  if(mode==='fragment-without-condition')value.passages=value.passages.slice(0,1);
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
 type Step={body:string;kind:'clarify'|'ai'|'handoff';key?:string;consent?:boolean};
 type Scenario={group:string;label:string;steps:Step[];failure?:string;noSource?:boolean;staff?:boolean;duplicate?:boolean};
 const scenarios:Scenario[]=[],reports:any[]=[];
 const c=(body:string,key?:string):Step=>({body,kind:'clarify',key});
 const a=(body:string):Step=>({body,kind:'ai'});
 const h=(body:string):Step=>({body,kind:'handoff'});
 const viPlaces=['Việt Nam','Đức','Hà Nội','Berlin','Hamburg'];
 const forms=['thành lập GmbH','góp vốn','mua cổ phần','mở công ty'];
 for(let n=0;n<20;n++){
  const place=viPlaces[n%5],form=forms[Math.floor(n/5)],prefix=['Tôi muốn đầu tư','Tôi cần hỏi về đầu tư','Mình cần tư vấn đầu tư','Tôi muốn hỏi về đầu tư'][Math.floor(n/5)];
  scenarios.push({group:'01 Đầu tư tiếng Việt',label:`${place} / ${form}`,steps:[c(prefix,'investment.country'),c(place,'investment.form'),c(form,'investment.timeline'),c('chưa thực hiện','investment.goal'),a('muốn biết thủ tục'),a('Chi phí?'),c('Cảm ơn')]});
  const dePlace=['Deutschland','Vietnam','Berlin','Hamburg','München'][n%5],deForm=['Gründung einer GmbH','Beteiligung','Aktien','Immobilien'][Math.floor(n/5)];
  scenarios.push({group:'02 Đầu tư tiếng Đức',label:`${dePlace} / ${deForm}`,steps:[c('Ich möchte investieren','investment.country'),c(dePlace,'investment.form'),c(deForm,'investment.timeline'),c('noch nicht begonnen','investment.goal'),a('Das Verfahren'),a('Kosten?'),c('Danke')]});
  const owner=['Mẹ tôi','Cha tôi','Tôi','Vợ tôi'][Math.floor(n/5)];
  scenarios.push({group:'03 Nhà đất và câu đáp ngắn',label:`${place} / ${owner}`,steps:[c(`Tôi muốn sang tên đất ở ${place} và muốn biết thủ tục`),c(owner,'property.document'),c('Có rồi','property.timeline'),a('Đang chuẩn bị'),a('Giấy tờ?')]});
  const kind=['bằng lái','IELTS','TELC','B1'][Math.floor(n/5)];
  scenarios.push({group:'04 Thi cử',label:`${place} / ${kind}`,steps:[c(['Thi mãi không đỗ','Tôi thi không đỗ','Tôi thi trượt','Về kỳ thi'][Math.floor(n/5)],'exam.kind'),c(kind,'exam.country'),c(place,'exam.goal'),c('muốn phúc khảo','exam.timeline'),a('đã thực hiện hôm qua'),c('Cảm ơn')]});
  scenarios.push({group:'05 Đổi chủ đề',label:`Đầu tư → gia đình / ${place} / ${form}`,steps:[c(`Tôi muốn đầu tư ở ${place}`,'investment.form'),c(form,'investment.timeline'),c('Tôi muốn hỏi về ly hôn','family.country'),c(place,'family.situation'),c('tài sản','family.timeline'),c('chưa ký','family.parties'),a('vợ chồng'),c('Cảm ơn')]});
  scenarios.push({group:'06 Đính chính dữ kiện',label:`${place} / ${form}`,steps:[c(`Tôi muốn đầu tư tại ${place}`,'investment.form'),c('Không phải Đức, chưa biết nước nào','investment.country'),c(place,'investment.form'),c(form,'investment.timeline'),c('muốn biết thủ tục','investment.timeline'),a('chưa thực hiện'),a('Thủ tục?')]});
  const declines=['Tôi chưa cần chuyên viên','Đừng chuyển chuyên viên','Không cần gặp chuyên viên','Nếu không trả lời được thì chuyển cho chuyên viên'][Math.floor(n/5)];
  scenarios.push({group:'07 Ý định gặp chuyên viên',label:`${place} / ${declines}`,staff:true,steps:[c(`Tôi muốn đầu tư ở ${place}. ${declines}`,'investment.form'),c('thành lập GmbH','investment.timeline'),c('chưa thực hiện','investment.goal'),a('muốn biết thủ tục'),h(['Tôi muốn gặp chuyên viên','Chuyển cho chuyên viên giúp tôi','Tôi muốn nói chuyện với người thật','Kết nối chuyên viên cho tôi'][Math.floor(n/5)])]});
  scenarios.push({group:'08 Vụ nhà đất thứ hai',label:`${place} / ${owner}`,steps:[c('Tôi muốn sang tên đất ở Việt Nam, có sổ đỏ đứng tên mẹ tôi và muốn biết thủ tục','property.timeline'),c(`Còn mảnh đất khác tôi định mua ở ${place}, thủ tục thế nào?`,'property-2.owner'),c(owner,'property-2.document'),c('Có rồi','property-2.timeline'),a('Mảnh đất khác đó đang chuẩn bị'),a('Chi phí?')]});
  const vague=['Hay','Thử','Tôi cần','Tôi muốn'][Math.floor(n/5)];
  scenarios.push({group:'09 Hội thoại dài và thiếu dữ kiện',label:`${place} / ${vague}`,steps:[c(vague),c('Về đầu tư','investment.country'),c(place,'investment.form'),c('thành lập GmbH','investment.timeline'),...Array.from({length:10+n%5},(_,i)=>c(['chưa biết ngày nào','không rõ thời hạn','chưa xác định ngày','chưa rõ thời hạn'][i%4],'investment.timeline')),c('chưa thực hiện','investment.goal'),a('muốn biết thủ tục'),a('Chi phí?'),c('Cảm ơn')]});
  const failure=['invented','omit-condition','bad-json','quota','no-source'][Math.floor(n/4)];
  scenarios.push({group:'10 Không đủ nguồn và lỗi nhà cung cấp',label:`${place} / ${failure} / ${n%4}`,failure:failure==='no-source'?undefined:failure,noSource:failure==='no-source',duplicate:true,staff:true,steps:[c(`Tôi muốn đầu tư ở ${place}`,'investment.form'),c(forms[n%4],'investment.timeline'),c('chưa thực hiện','investment.goal'),h('muốn biết thủ tục')]});
 }
 assert.equal(scenarios.length,200);
 assert.equal(new Set(scenarios.map(s=>JSON.stringify(s.steps.map(t=>t.body)))).size,200,'All 200 scripts must differ in actual customer turns');
 const output=resolve(process.env.DIALOGUE_REPORT_DIR||'../../../../dialogue-campaign-200-20261107');
 await mkdir(output,{recursive:true});
 try{
  await integrations.saveConnection('ai',{apiKey:'synthetic-matrix-key-no-network',model:'synthetic-model'},0,owner.id);await integrations.markCheck('ai',1,'passed',owner.id);await integrations.setEnabled('ai',1,true,owner.id);
  const publicDoc=await article('ALPHA',texts.article,'BOTH'),publicSource=await mirror(publicDoc.id);
  const privateDoc=await writeKnowledgeArticle(payload,support,{title:synthetic+' BETA',body:texts.private,publish:true});knowledge.push(privateDoc.id);
  const germanDoc=await article('GAMMA',texts.german,'BOTH'),germanSource=await mirror(germanDoc.id);
  for(const id of [publicSource.id,privateDoc.id,germanSource.id])await index(id);
  for(const [number,scenario] of scenarios.entries()){
   const source= scenario.group.startsWith('02')?germanSource.id:number%2?privateDoc.id:publicSource.id;
   allowed=[source];selected=[source];mode='answer';intakeMode.status='ready';score=.94;
   const actor:chat.Actor={user:null,guestHash:crypto.randomUUID()},conversation=await chat.createConversation(actor,{consent:true},{assistantEnabled:true});conversations.push(conversation.id);
   const thread={actor,id:conversation.id};
   const report:any={number:number+1,group:scenario.group,label:scenario.label,provider:'controlled mock; actual backend + isolated PostgreSQL',checks:[],errors:[],messages:[]};
   for(const [position,step] of scenario.steps.entries()){
    try{
     if(step.kind==='handoff'&&scenario.failure)mode=scenario.failure;
     if(step.kind==='handoff'&&scenario.noSource)allowed=[];
     const before=retrievalCounts(),key=crypto.randomUUID();
     const message=await chat.message(actor,thread.id,{body:step.body,key,aiConsentVersion:CONSENT_VERSION},2000);
     if(scenario.duplicate){const duplicate=await chat.message(actor,thread.id,{body:step.body,key,aiConsentVersion:CONSENT_VERSION},2000);assert.equal(duplicate.id,message.id,'Same client key must reuse message');}
     await replyToMessage(actor,thread.id,message.id,policy);
     const transcript=await chat.transcript(actor,thread.id),reply=transcript.messages.at(-1)!;
     report.messages=transcript.messages;
     assert.equal(reply.role,'assistant','A customer turn must receive exactly one response');
     assert.equal(reply.metadata.kind,step.kind,`Turn ${position+1}: ${step.body}`);
     if(step.key)assert.equal(reply.metadata.clarificationKey,step.key,`Turn ${position+1}: ${step.body}`);
     if(step.kind==='clarify'&&step.key!=='acknowledgement')assert.deepEqual(retrievalCounts(),before,'No source retrieval before completing facts');
     if(step.kind==='ai'){assert.ok(reply.metadata.sources?.length);assert.equal(reply.metadata.sources[0].id,source);assert.equal(reply.body,source===germanSource.id?texts.german:source===privateDoc.id?texts.private:texts.article,'Keep exact source paragraphs including exceptions');}
     if(step.kind==='clarify')assert.equal(transcript.conversation.aiEnabled,true,'Missing facts must not disable the assistant');
     const repeated=transcript.messages.filter(m=>m.role==='assistant').slice(-2);
     if(step.kind==='clarify'&&repeated.length===2)assert.notEqual(repeated[0].body,repeated[1].body,'Do not repeat the immediately previous question');
     if(step.kind==='handoff')assert.equal(transcript.conversation.aiEnabled,false);
     report.checks.push({turn:position+1,expected:step.kind,key:step.key,passed:true});
    }catch(error){report.errors.push({turn:position+1,input:step.body,message:error instanceof Error?error.message:String(error)});break;}
   }
   if(!report.errors.length&&scenario.staff){try{
    const specialist:chat.Actor={user:support,guestHash:'synthetic-campaign-staff'};
    const before=providerCalls,transcript=await chat.transcript(actor,thread.id);
    await chat.transition(specialist,thread.id,{action:'claim',version:transcript.conversation.version});
    await chat.message(specialist,thread.id,{body:'Phản hồi của chuyên viên trong ca thử, không phải tư vấn pháp luật.',key:crypto.randomUUID()},2000);
    const follow=await chat.message(actor,thread.id,{body:'Tôi bổ sung thông tin cho chuyên viên.',key:crypto.randomUUID(),aiConsentVersion:CONSENT_VERSION},2000);
    await replyToMessage(actor,thread.id,follow.id,policy);
    const final=await chat.transcript(actor,thread.id);assert.equal(providerCalls,before,'AI must stay stopped after specialist takes over');
    assert.ok(final.messages.some(m=>m.role==='staff'&&m.author_name===support.name));report.messages=final.messages;report.checks.push({staffTakeover:true,passed:true});
   }catch(error){report.errors.push({staff:true,message:error instanceof Error?error.message:String(error)});}}
   report.passed=!report.errors.length;reports.push(report);
   if((number+1)%20===0)console.log(`Campaign ${number+1}/200; failures ${reports.filter(r=>!r.passed).length}`);
  }
  const summary={date:new Date().toISOString(),conversations:reports.length,passed:reports.filter(r=>r.passed).length,failed:reports.filter(r=>!r.passed).length,messages:reports.reduce((n,r)=>n+r.messages.length,0),providerCalls,intakeCalls,queryEmbeddings,vectorQueries,method:'Actual native chat service, PostgreSQL, Payload hooks/indexing/source checks; mocked Gemini and vector HTTP. Does not measure real-model fluency.',groups:[...new Set(reports.map(r=>r.group))].map(group=>({group,total:reports.filter(r=>r.group===group).length,passed:reports.filter(r=>r.group===group&&r.passed).length}))};
  await writeFile(resolve(output,'results.json'),JSON.stringify({summary,reports},null,2));
  const escape=(x:any)=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
  await writeFile(resolve(output,'report.html'),`<!doctype html><html lang="vi"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>200 hội thoại giả lập</title><style>body{font:16px/1.6 system-ui;background:#181818;color:#ccc;max-width:1000px;margin:32px auto;padding:20px}h1,h2{color:#eee}details{border-bottom:1px solid #444;padding:14px}summary{cursor:pointer}.user{background:#303030;margin-left:15%;padding:12px;border-radius:14px}.assistant{padding:12px}small{color:#aaa}pre{white-space:pre-wrap}a{color:inherit}</style><h1>200 hội thoại giả lập</h1><p>Backend và cơ sở dữ liệu thử thật; phản hồi nhà cung cấp được giả lập có kiểm soát. Báo cáo này kiểm tra luồng, không chấm độ tự nhiên của Gemini thật.</p><pre>${escape(JSON.stringify(summary,null,2))}</pre>${reports.map(r=>`<details><summary>${r.passed?'✓':'✕'} ${r.number}. ${escape(r.group)} — ${escape(r.label)} (${r.messages.length} tin nhắn)</summary>${r.errors.length?`<pre>${escape(JSON.stringify(r.errors,null,2))}</pre>`:''}${r.messages.map((m:any)=>`<div class="${escape(m.role)}"><small>${escape(m.role)} ${escape(m.metadata?.kind)} ${escape(m.metadata?.clarificationKey)}</small><div>${escape(m.body).replace(/\n/g,'<br>')}</div></div>`).join('')}</details>`).join('')}</html>`);
  console.log(JSON.stringify(summary));
  assert.equal(summary.failed,0,`See ${output}/results.json`);
 }finally{
  globalThis.fetch=originalFetch;
  if(conversations.length)await pool.query('DELETE FROM lvd_conversations WHERE id=ANY($1::uuid[])',[conversations]);
  for(const id of articles)await payload.delete({collection:'articles',id,user:owner,overrideAccess:false});
  for(const id of knowledge)await payload.delete({collection:'knowledge',id,user:owner,overrideAccess:false});
  await pool.query("DELETE FROM lvd_integration_events WHERE provider='ai'");await pool.query("DELETE FROM lvd_integrations WHERE provider='ai'");
 }
}
