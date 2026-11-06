import test from 'node:test';
import assert from 'node:assert/strict';
import {validateIntakeAssessment} from '../src/modules/rag/provider.ts';
import {clarificationText,intakeClarification,isVagueIntakeReply} from '../src/modules/assistant/clarification.ts';
import {replyToMessage} from '../src/modules/assistant/reply.ts';
import {pool} from '../src/modules/shared/db.ts';
import {seal} from '../src/modules/integrations/crypto.ts';
import {CONSENT_VERSION} from '../src/modules/rag/core.ts';

test('assessment accepts actual enum strings and rejects coercion, instructions and unsupported detail',()=>{
 for(const status of ['low','ready'])assert.deepEqual(validateIntakeAssessment({status}),{status});
 for(const detail of ['goal','situation','timeline','parties','country'])assert.deepEqual(validateIntakeAssessment({status:'needs_details',detail}),{status:'needs_details',detail});
 for(const value of [null,[],{}, {status:['low']},{status:['ready']},{status:1},{status:'delete'},{status:'needs_details'},{status:'needs_details',detail:['goal']},{status:'needs_details',detail:'passport'},{status:'ready',answer:'Invented advice'},{status:'low',expiresAt:0}])assert.throws(()=>validateIntakeAssessment(value),/Invalid intake/);
});

test('only positive filler is disposable, while meaningful unknown topics still receive fixed intake',()=>{
 for(const text of ['Hay','Cảm ơn','Xin chào','tôi muốn','ich möchte','danke','test'])assert.equal(isVagueIntakeReply(text),true,text);
 for(const text of ['Tôi muốn mua bảo hiểm','Tôi muốn đòi nợ','Ich möchte eine Versicherung abschließen','foo bar baz?'])assert.equal(isVagueIntakeReply(text),false,text);
 for(const text of ['Tôi muốn mua bảo hiểm','Tôi muốn đòi nợ'])assert.equal(intakeClarification(text)?.key,'goal');
 assert.match(clarificationText('country','Ich brauche Hilfe'),/Land/);
});

// Real reply/provider functions, with every database and network branch replaced.
// This fixture proves control flow, not PostgreSQL locking/trigger semantics.
function fixture(t,options={}){
 const oldSecret=process.env.PAYLOAD_SECRET;process.env.PAYLOAD_SECRET='synthetic-assessment-test-secret-000000';
 t.after(()=>{if(oldSecret===undefined)delete process.env.PAYLOAD_SECRET;else process.env.PAYLOAD_SECRET=oldSecret;});
 const c={id:'11111111-2222-4333-8444-555555555555',guest_hash:'synthetic-guest',user_id:null,state:'queued',ai_enabled:true,version:1,jurisdiction:'BOTH',retain_history:Boolean(options.retained)};
 const current={id:9,body:options.body||'foo bar baz?',metadata:options.consented===false?null:{aiConsent:{version:CONSENT_VERSION}}};
 const provider={enabled:options.connected!==false,version:1,encrypted_values:seal('ai',{apiKey:'synthetic',model:'synthetic-model'})};
 const state={conversation:c,current,provider,replies:[],admissions:0,assessments:0,embeddings:0,order:[],rules:[]};
 const query=async(sql,args=[])=>{
  if(['BEGIN','COMMIT','ROLLBACK'].includes(sql)||sql.startsWith('SELECT pg_advisory_xact_lock_shared'))return {rows:[],rowCount:0};
  if(sql.startsWith('SELECT * FROM lvd_conversations'))return {rows:[{...c}],rowCount:1};
  if(sql.startsWith('SELECT 1 FROM lvd_messages'))return {rows:[],rowCount:0};
  if(sql.startsWith('SELECT id,body,metadata FROM lvd_messages'))return {rows:[current],rowCount:1};
  if(sql.startsWith('SELECT role,body,metadata FROM ('))return {rows:options.previous||[],rowCount:(options.previous||[]).length};
  if(sql.startsWith('UPDATE lvd_conversations SET ai_generation=')){c.ai_generation=args[1];return {rows:[],rowCount:1};}
  if(sql.startsWith('SELECT * FROM lvd_integrations')||sql.startsWith('SELECT enabled,version FROM lvd_integrations'))return {rows:[provider],rowCount:1};
  if(sql.startsWith('SELECT id,title,body,updated_at'))return {rows:state.rules,rowCount:state.rules.length};
  if(sql.startsWith("SELECT * FROM knowledge WHERE entry_type='knowledge'"))return {rows:[],rowCount:0};
  if(sql.startsWith('INSERT INTO lvd_ai_usage'))return {rows:[{count:1}],rowCount:1};
  if(sql.startsWith("UPDATE lvd_conversations SET qualification='ready'")){
   assert.match(sql,/ai_generation=\$2 AND version=\$3/);assert.match(sql,/max\(id\)/);
   if(c.state!=='queued'||!c.ai_enabled||c.ai_generation!==args[1]||c.version!==args[2]||String(current.id)!==String(args[3]))return {rows:[],rowCount:0};
   c.qualification='ready';c.retain_history=true;state.admissions++;state.order.push('admit');return {rows:[],rowCount:1};
  }
  if(sql.startsWith('SELECT id FROM lvd_messages'))return {rows:[{id:current.id}],rowCount:1};
  if(sql.startsWith('SELECT customer_a_i_enabled'))return {rows:[{customer_a_i_enabled:true,chat_enabled:true}],rowCount:1};
  if(sql.startsWith('INSERT INTO lvd_messages')){state.replies.push({body:args[1],metadata:JSON.parse(args[3])});return {rows:[],rowCount:1};}
  if(sql.startsWith('UPDATE lvd_conversations SET ai_enabled=')){c.ai_enabled=args[1];c.ai_generation=null;c.qualification=args[3];c.retain_history||=args[3]!=='low';c.expires=Boolean(args[1]&&args[3]==='low');return {rows:[],rowCount:1};}
  if(sql.startsWith('INSERT INTO lvd_chat_events'))return {rows:[],rowCount:1};
  throw new Error('Unexpected synthetic SQL branch: '+sql.slice(0,75));
 };
 t.mock.method(pool,'connect',async()=>({query,release(){}}));t.mock.method(pool,'query',query);
 t.mock.method(globalThis,'fetch',async(url,init)=>{
  const body=JSON.parse(init?.body||'{}'),prompt=body.contents&&JSON.parse(body.contents[0].parts[0].text);
  if(prompt?.phase==='intake'){
   state.assessments++;state.order.push('assess');options.onAssess?.(state);if(options.unavailable)throw new Error('Synthetic provider unavailable');
   return Response.json({candidates:[{finishReason:'STOP',content:{parts:[{text:JSON.stringify(options.assessment||{status:'ready'})}]}}]});
  }
  if(String(url).includes(':embedContent')){state.embeddings++;state.order.push('embed');assert.equal(c.retain_history,true);return Response.json({embedding:{values:Array(768).fill(1)}});}
  if(String(url).startsWith('http://vectors:6333/'))return Response.json({result:{points:[]}});
  assert.fail('Unexpected network request in synthetic assessment test');
 });
 state.run=()=>replyToMessage({user:null,guestHash:c.guest_hash},c.id,current.id,{customerAIEnabled:true,chatEnabled:true,aiDailyRequests:options.budget===undefined?100:options.budget,aiMaxOutputTokens:700});
 return state;
}

for(const [name,options,qualification] of [
 ['fresh filler',{body:'Hay'},'low'],
 ['meaningful unknown insurance',{body:'Tôi muốn mua bảo hiểm'},'needs_details'],
 ['meaningful unknown debt',{body:'Tôi muốn đòi nợ'},'needs_details'],
 ['thanks after retained history',{body:'Cảm ơn',retained:true},'needs_details'],
 ['rapid thanks after unanswered meaningful turn',{body:'Hay',previous:[{role:'user',body:'Tôi muốn đòi nợ'}]},'needs_details'],
])test(name+' preserves the correct retention class without provider calls',async t=>{
 const state=fixture(t,options);await state.run();assert.equal(state.conversation.qualification,qualification);assert.equal(state.conversation.expires,qualification==='low');assert.equal(state.replies[0].metadata.kind,'clarify');assert.equal(state.assessments,0);assert.equal(state.embeddings,0);
});

for(const [name,options,qualification] of [
 ['AI low',{assessment:{status:'low'}},'low'],
 ['AI needs country',{assessment:{status:'needs_details',detail:'country'}},'needs_details'],
 ['AI low on retained history',{retained:true,assessment:{status:'low'}},'needs_details'],
 ['unknown assessment outage',{unavailable:true},'needs_details'],
 ['unknown malformed assessment',{assessment:{status:['low']}},'needs_details'],
 ['unknown disabled provider',{connected:false},'needs_details'],
 ['unknown disabled budget',{budget:0},'needs_details'],
])test(name+' uses fixed questions without retrieval or normal staff promotion',async t=>{
 const state=fixture(t,options);await state.run();assert.equal(state.conversation.qualification,qualification);assert.equal(state.conversation.ai_enabled,true);assert.equal(state.conversation.expires,qualification==='low');assert.equal(state.admissions,0);assert.equal(state.embeddings,0);assert.equal(state.replies[0].metadata.kind,'clarify');assert.deepEqual(state.replies[0].metadata.sources,[]);assert.equal(state.replies[0].body,clarificationText(options.assessment?.detail||'goal',state.current.body));
});

test('successful ready assessment preserves history before retrieval and retains existing no-source handoff',async t=>{
 const state=fixture(t);await state.run();assert.deepEqual(state.order,['assess','admit','embed']);assert.equal(state.conversation.retain_history,true);assert.equal(state.conversation.qualification,'ready');assert.equal(state.replies[0].metadata.kind,'handoff');assert.equal(state.conversation.expires,false);
});

test('known complete intake retains operational handoff when assessment is unavailable',async t=>{
 const state=fixture(t,{body:'Tôi muốn đầu tư thành lập GmbH tại Đức, đang chuẩn bị và cần biết chi phí',unavailable:true});await state.run();assert.deepEqual(state.order,['assess','admit','embed']);assert.equal(state.replies[0].metadata.kind,'handoff');assert.equal(state.conversation.retain_history,true);assert.equal(state.conversation.expires,false);
});

test('legacy unconsented questions never enter assessment or retrieval providers',async t=>{
 const state=fixture(t,{consented:false});await state.run();assert.equal(state.assessments,0);assert.equal(state.embeddings,0);assert.equal(state.replies[0].metadata.kind,'handoff');
});

test('explicit human requests override classification without provider calls or expiry',async t=>{
 const state=fixture(t,{body:'Tôi muốn gặp chuyên viên'});await state.run();assert.equal(state.assessments,0);assert.equal(state.embeddings,0);assert.equal(state.replies[0].metadata.kind,'handoff');assert.equal(state.conversation.qualification,'ready');assert.equal(state.conversation.expires,false);
});

for(const changed of ['version','latest','claim'])test('assessment readiness cannot admit stale '+changed+' work',async t=>{
 const state=fixture(t,{onAssess:state=>{if(changed==='version')state.conversation.version++;else if(changed==='latest')state.current.id++;else state.conversation.state='human';}});await state.run();assert.equal(state.admissions,0);assert.equal(state.embeddings,0);assert.equal(state.replies.length,0);
});

test('assessment provider revision is rechecked before accepting a low classification',async t=>{
 const state=fixture(t,{assessment:{status:'low'},onAssess:state=>{state.provider.version++;}});await state.run();assert.equal(state.replies[0].metadata.kind,'clarify');assert.equal(state.conversation.qualification,'needs_details');assert.equal(state.conversation.ai_enabled,true);assert.equal(state.conversation.expires,false);
});

test('assessment operating rules are rechecked before accepting a low classification',async t=>{
 const state=fixture(t,{assessment:{status:'low'},onAssess:state=>state.rules.push({id:1,title:'Synthetic rule',body:'Synthetic operating restriction',jurisdiction:'BOTH',updated_at:new Date(),effective_from:new Date(0),expires_at:null,review_due_at:new Date(Date.now()+86400000)})});await state.run();assert.equal(state.replies[0].metadata.kind,'clarify');assert.equal(state.conversation.qualification,'needs_details');assert.equal(state.conversation.ai_enabled,true);assert.equal(state.conversation.expires,false);
});

test('land fragment after a clarification stays in intake instead of personal-case handoff',async t=>{
 const state=fixture(t,{body:'Đất của tôi ấy',previous:[
  {role:'assistant',body:'Mảnh đất ở đâu?',metadata:{kind:'clarify',clarificationKey:'property.country'}},
  {role:'user',body:'Về đất đai'},
  {role:'assistant',body:'Bạn cần tư vấn việc gì?',metadata:{kind:'clarify',clarificationKey:'goal'}},
  {role:'user',body:'Tôi cần'},
 ]});
 await state.run();assert.equal(state.replies[0].metadata.kind,'clarify');assert.equal(state.replies[0].metadata.clarificationKey,'property.country');assert.match(state.replies[0].body,/Việt Nam, Đức/);assert.equal(state.conversation.ai_enabled,true);assert.equal(state.assessments,1);assert.equal(state.embeddings,0);assert.equal(state.conversation.qualification,'needs_details');
});

const repeatedExam=[{role:'assistant',body:'Bạn đang nói đến kỳ thi nào: bằng lái, ngoại ngữ, nghề nghiệp hay kỳ thi khác?',metadata:{kind:'clarify',clarificationKey:'exam.kind'}},{role:'user',body:'Tôi thi mãi không được',metadata:{aiConsent:{version:CONSENT_VERSION}}}];
test('repeated missing facts can use a contextual intake question before retrieval',async t=>{
 const next='Bạn đang thi bằng lái, chứng chỉ ngoại ngữ hay một kỳ thi khác?';
 const state=fixture(t,{body:'Thi không đỗ',previous:repeatedExam,assessment:{status:'needs_details',detail:'situation',question:next}});await state.run();
 assert.equal(state.replies[0].body,next);assert.equal(state.replies[0].metadata.kind,'clarify');assert.equal(state.conversation.ai_enabled,true);assert.equal(state.embeddings,0);assert.equal(state.assessments,1);
});
for(const options of [{assessment:{status:'ready'}},{unavailable:true},{assessment:{status:'needs_details',detail:'situation',question:repeatedExam[0].body}}])test('an incomplete exam stays in intake with a different question on '+JSON.stringify(options),async t=>{
 const state=fixture(t,{body:'Thi không đỗ',previous:repeatedExam,...options});await state.run();assert.equal(state.replies[0].metadata.kind,'clarify');assert.notEqual(state.replies[0].body,repeatedExam[0].body);assert.equal(state.embeddings,0);assert.equal(state.admissions,0);assert.equal(state.conversation.ai_enabled,true);
});
test('unconsented repeated intake never calls the external provider',async t=>{
 const state=fixture(t,{body:'Thi không đỗ',previous:repeatedExam,consented:false});await state.run();assert.equal(state.assessments,0);assert.equal(state.embeddings,0);assert.equal(state.replies[0].metadata.kind,'clarify');assert.notEqual(state.replies[0].body,repeatedExam[0].body);
});
test('generated intake accepts one bounded factual question and rejects advice, identifiers and markup',()=>{
 const value={status:'needs_details',detail:'situation',question:'Bạn đang nói đến kỳ thi nào?'};assert.deepEqual(validateIntakeAssessment(value),value);
 for(const question of ['Bạn có quyền yêu cầu bồi thường theo luật nào?','Gửi số CCCD 123456789012 nhé?','<b>Bạn thi gì?</b>','Bạn thi gì? Ở đâu?','Gửi email me@example.invalid?','Đã đủ thông tin.','x'.repeat(250)+'?'])assert.throws(()=>validateIntakeAssessment({...value,question}));
});

test('an invalidated contextual intake question falls back locally without specialist handoff',async t=>{
 const state=fixture(t,{body:'Thi không đỗ',previous:repeatedExam,assessment:{status:'needs_details',detail:'situation',question:'Bạn đang thi chứng chỉ ngoại ngữ hay bằng lái?'},onAssess:state=>state.provider.version++});await state.run();assert.equal(state.replies[0].metadata.kind,'clarify');assert.equal(state.conversation.ai_enabled,true);assert.equal(state.embeddings,0);assert.equal(state.conversation.expires,false);
});

for(const [language,turns] of [
 ['VI',[
  ['Hay','goal'],['Tôi muốn đầu tư','investment.country'],['Chưa rõ ở đâu','investment.country'],['ở Đức','investment.form'],['thành lập GmbH','investment.timeline'],['muốn biết thủ tục','investment.timeline'],['không biết ngày nào','investment.timeline'],['Không phải Đức, chưa biết nước nào','investment.country'],['Việt Nam','investment.timeline'],['còn gì nữa?','investment.timeline'],
  ['Bây giờ hỏi việc ly hôn','family.country'],['Đức','family.situation'],['tài sản','family.timeline'],['chưa ký','family.parties'],['còn gì nữa?','family.parties'],['không rõ các bên','family.parties'],['gì vậy?','family.parties'],['tôi chưa rõ','family.parties'],['bạn cần biết gì?','family.parties'],['tôi đang chưa hiểu','family.parties'],['còn thiếu điều nào?','family.parties'],['không rõ bạn đang hỏi gì','family.parties'],['còn những gì nữa?','family.parties'],['vợ chồng',null],
 ]],
 ['VI corrections and topic switch',[
  ['Về đất đai','property.country'],['Việt Nam','property.transaction'],['Sang tên','property.owner'],['Sổ đỏ đứng tên mẹ','property.timeline'],['Đã thực hiện','property.goal'],['À không, tôi chưa rõ thời điểm','property.timeline'],['Dự kiến tháng sau','property.goal'],['Còn ly hôn thì sao?','family.country'],['Ở Đức','family.situation'],['Về tài sản','family.timeline'],['Chưa ký','family.parties'],['Vợ chồng',null],
 ]],
 ['VI short property answers',[
  ['Về đất đai','property.country'],['Việt Nam','property.transaction'],['Sang tên','property.owner'],['Chưa rõ','property.owner'],['Không hiểu câu hỏi','property.owner'],['Mẹ tôi','property.document'],['Có rồi','property.timeline'],['Chưa thực hiện','property.goal'],['Muốn biết thủ tục',null],
 ]],
 ['DE short property answers',[
  ['Ich möchte zum Grundstück fragen','property.country'],['Deutschland','property.transaction'],['Eigentumsübertragung','property.owner'],['Keine Ahnung','property.owner'],['Was meinen Sie damit?','property.owner'],['Meine Mutter','property.document'],['Ja','property.timeline'],['Noch nicht begonnen','property.goal'],['Das Verfahren',null],
 ]],
 ['DE exam fragments',[
  ['Prüfung nicht bestanden','exam.kind'],['Führerscheinprüfung','exam.country'],['Deutschland','exam.goal'],['Ich möchte Widerspruch einlegen','exam.timeline'],['Der Zeitpunkt ist unklar','exam.timeline'],['noch nicht begonnen',null],
 ]],
 ['DE',[
  ['Hallo','goal'],['Ich möchte investieren','investment.country'],['Deutschland','investment.form'],['GmbH gründen','investment.timeline'],['Der Termin steht noch nicht fest','investment.timeline'],['noch nicht begonnen','investment.goal'],['Das Verfahren',null],
 ]],
])test(`${language} realistic ${turns.length}-turn dialogue keeps missing facts ahead of retrieval and handoff`,async t=>{
 const previous=[],state=fixture(t,{previous});
 for(let index=0;index<turns.length;index++){
  const [body,key]=turns[index];state.current.id=index+1;state.current.body=body;
  const before=state.replies.length;await state.run();assert.equal(state.replies.length,before+1,body);
  const reply=state.replies.at(-1);
  if(key){
   assert.equal(reply.metadata.kind,'clarify',body);assert.equal(reply.metadata.clarificationKey,key,body);assert.equal(state.conversation.ai_enabled,true,body);assert.equal(state.embeddings,0,body);assert.equal(state.admissions,0,body);assert.deepEqual(reply.metadata.sources,[]);
   const lastQuestion=previous.find(row=>row.role==='assistant')?.body;if(lastQuestion)assert.notEqual(reply.body,lastQuestion,'Consecutive intake questions should acknowledge the latest reply: '+body);
  }else{
   assert.equal(reply.metadata.kind,'handoff','Only complete facts with no approved source proceed to staff');assert.equal(state.embeddings,1);assert.equal(state.admissions,1);assert.equal(state.conversation.retain_history,true);assert.equal(state.conversation.expires,false);
  }
  previous.unshift({role:'assistant',body:reply.body,metadata:reply.metadata},{role:'user',body,metadata:state.current.metadata});
 }
 assert.ok(state.assessments>=2,'Repeated missing facts and completion exercise actual assessment parsing');
});

for(const [body,context] of [['Cảm ơn, vậy còn chi phí thì sao?','Tôi muốn đầu tư thành lập GmbH tại Đức, đang chuẩn bị và muốn biết thủ tục'],['Danke, und die Kosten?','Ich möchte in Deutschland investieren und eine GmbH gründen, in Vorbereitung, und das Verfahren wissen'],['Chi phí?','Tôi muốn đầu tư thành lập GmbH tại Đức, đang chuẩn bị và muốn biết thủ tục'],['Kosten?','Ich möchte in Deutschland eine GmbH gründen, in Vorbereitung, und das Verfahren wissen']])test('short follow-up '+body+' retains the completed consented topic after an AI answer',async t=>{
 const state=fixture(t,{body,retained:true,previous:[
  {role:'assistant',body:'Synthetic approved source paragraph.',metadata:{kind:'ai',sources:[{id:1,revision:'synthetic-prior-revision'}]}},
  {role:'user',body:context,metadata:{aiConsent:{version:CONSENT_VERSION}}},
 ]});
 await state.run();assert.equal(state.assessments,1,'An anchored follow-up should reuse its context instead of asking the topic again');assert.equal(state.embeddings,1);assert.equal(state.replies[0].metadata.kind,'handoff','A complete follow-up with no current source follows the existing handoff path');
});

for(const [name,options] of [
 ['standalone',{body:'Chi phí?'}],
 ['no current consent',{body:'Chi phí?',consented:false}],
 ['no prior consent',{body:'Chi phí?',legacyContext:true}],
 ['explicit new topic',{body:'Tôi muốn hỏi về ly hôn'}],
])test(name+' cannot reuse the prior answer to skip new intake facts',async t=>{
 const previous=name==='standalone'?[]:[{role:'assistant',body:'Synthetic source answer',metadata:{kind:'ai'}},{role:'user',body:'Tôi muốn đầu tư thành lập GmbH tại Đức, đang chuẩn bị và muốn biết thủ tục',metadata:options.legacyContext?{}:{aiConsent:{version:CONSENT_VERSION}}}];
 const state=fixture(t,{...options,previous});await state.run();assert.equal(state.assessments,0);assert.equal(state.embeddings,0);assert.equal(state.replies[0].metadata.kind,'clarify');assert.equal(state.replies[0].metadata.clarificationKey,name==='explicit new topic'?'family.country':'goal');
});

for(const [body,expected] of [['Cảm ơn',/Rất vui/],['Danke',/Gern/],['Đã hiểu rồi',/Rất vui/]])test('polite closure '+body+' does not restart intake after an answer',async t=>{
 const state=fixture(t,{body,retained:true,previous:[{role:'assistant',body:'Synthetic source answer',metadata:{kind:'ai'}},{role:'user',body:'Synthetic complete question'}]});
 await state.run();assert.match(state.replies[0].body,expected);assert.equal(state.replies[0].metadata.clarificationKey,'acknowledgement');assert.equal(state.assessments,0);assert.equal(state.embeddings,0);assert.equal(state.conversation.expires,false);assert.equal(state.conversation.ai_enabled,true);
});
test('a short question after thanks still reuses the last answered topic',async t=>{
 const state=fixture(t,{body:'Chi phí?',retained:true,previous:[
 {role:'assistant',body:'Rất vui được hỗ trợ bạn.',metadata:{kind:'clarify',clarificationKey:'acknowledgement'}},
 {role:'user',body:'Cảm ơn',metadata:{aiConsent:{version:CONSENT_VERSION}}},
 {role:'assistant',body:'Synthetic source answer',metadata:{kind:'ai'}},
 {role:'user',body:'Tôi muốn đầu tư thành lập GmbH tại Đức, đang chuẩn bị và muốn biết thủ tục',metadata:{aiConsent:{version:CONSENT_VERSION}}}]});
 await state.run();assert.equal(state.assessments,1);assert.equal(state.embeddings,1);
});

test('wrong-language real-model output falls back to a German question without handoff or retrieval',async t=>{
 const state=fixture(t,{body:'Ich weiß nicht',assessment:{status:'needs_details',detail:'goal',question:'Bạn muốn khiếu nại kết quả hay đăng ký thi lại?'},previous:[
 {role:'assistant',body:'Um welche Prüfung geht es?',metadata:{kind:'clarify',clarificationKey:'exam.kind'}},
 {role:'user',body:'Prüfung nicht bestanden',metadata:{aiConsent:{version:CONSENT_VERSION}}}]});
 await state.run();assert.equal(state.assessments,1);assert.equal(state.embeddings,0);assert.equal(state.conversation.ai_enabled,true);assert.equal(state.replies[0].metadata.kind,'clarify');assert.match(state.replies[0].body,/Prüfung/);assert.ok(!state.replies[0].body.startsWith('Bạn'));
});

for(const item of [
 {key:'investment.form',body:'À không, chưa biết hình thức đầu tư nào',base:'Tôi muốn đầu tư thành lập GmbH tại Đức, đang chuẩn bị và muốn biết thủ tục'},
 {key:'residence.purpose',body:'Mục đích cư trú chưa rõ',base:'Tôi muốn hỏi thủ tục cư trú ở Đức để làm việc, đang chuẩn bị'},
 {key:'exam.kind',body:'Chưa rõ là kỳ thi nào',base:'Tôi thi bằng lái tại Đức, đã nộp hôm qua và muốn phúc khảo'},
 {key:'property.transaction',body:'Tôi chưa quyết định mua bán hay sang tên',base:'Tôi muốn sang tên đất ở Việt Nam, có sổ đỏ đứng tên mẹ tôi, đang chuẩn bị và muốn biết thủ tục'},
 {key:'exam.kind',body:'Ich weiß nicht, welche Prüfung es ist',base:'Ich möchte Widerspruch zur Führerscheinprüfung in Deutschland einlegen, bereits gestern'},
])for(const unavailable of [false,true])test('withdrawn '+item.key+' blocks retrieval even when assessment '+(unavailable?'fails':'incorrectly says ready'),async t=>{
 const state=fixture(t,{body:item.body,unavailable,previous:[
 {role:'assistant',body:'Earlier factual question?',metadata:{kind:'clarify',clarificationKey:item.key}},
 {role:'user',body:item.base,metadata:{aiConsent:{version:CONSENT_VERSION}}},
 ]});
 await state.run();assert.equal(state.assessments,0);assert.equal(state.embeddings,0);assert.equal(state.admissions,0);assert.equal(state.conversation.ai_enabled,true);assert.equal(state.replies[0].metadata.kind,'clarify');assert.equal(state.replies[0].metadata.clarificationKey,item.key);assert.notEqual(state.replies[0].body,'Earlier factual question?');
});

for(const item of [
 {body:'Còn mảnh đất khác tôi định mua ở Đức, thủ tục thế nào?',base:'Tôi muốn sang tên đất ở Việt Nam, có sổ đỏ đứng tên mẹ tôi, muốn biết thủ tục',oldKey:'property.timeline',key:'property-2.owner'},
 {body:'Tôi muốn hỏi kỳ thi khác',base:'Tôi thi bằng lái ở Đức, muốn phúc khảo',oldKey:'exam.timeline',key:'exam-2.kind'},
 {body:'Bây giờ tôi muốn hỏi một hợp đồng khác',base:'Tôi muốn hỏi thủ tục hợp đồng dịch vụ ở Việt Nam',oldKey:'contract.timeline',key:'contract-2.country'},
 {body:'Ich möchte ein anderes Grundstück kaufen',base:'Ich möchte ein Grundstück in Deutschland übertragen, meine Mutter ist im Grundbuch eingetragen und ich möchte das Verfahren wissen',oldKey:'property.timeline',key:'property-2.country'},
])test('a distinct new matter does not reuse the earlier facts or hand off: '+item.body,async t=>{
 const previous=[
 {role:'assistant',body:'Earlier timing question?',metadata:{kind:'clarify',clarificationKey:item.oldKey}},
 {role:'user',body:item.base,metadata:{aiConsent:{version:CONSENT_VERSION}}},
 ];
 const state=fixture(t,{body:item.body,previous});await state.run();
 assert.equal(state.replies[0].metadata.kind,'clarify');assert.equal(state.replies[0].metadata.clarificationKey,item.key);assert.equal(state.embeddings,0);assert.equal(state.admissions,0);assert.equal(state.assessments,0);assert.equal(state.conversation.ai_enabled,true);
});
