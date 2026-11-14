import test from 'node:test';
import assert from 'node:assert/strict';
import {validateIntakeAssessment} from '../src/modules/rag/provider.ts';
import {clarificationText,intakeClarification,isVagueIntakeReply,unrepeatedClarification,intakeUnavailableText,isOpeningClarification} from '../src/modules/assistant/clarification.ts';
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
 const c={id:'11111111-2222-4333-8444-555555555555',guest_hash:'synthetic-guest',user_id:null,state:'queued',ai_enabled:true,version:1,jurisdiction:'BOTH',retain_history:Boolean(options.retained),guest_expiry_enabled:!options.retained};
 const current={id:9,body:options.body||'foo bar baz?',metadata:options.consented===false?null:{aiConsent:{version:CONSENT_VERSION}}};
 const provider={enabled:options.connected!==false,version:1,encrypted_values:seal('ai',{apiKey:'synthetic',model:'synthetic-model'})};
 const state={conversation:c,current,provider,replies:[],admissions:0,assessments:0,embeddings:0,order:[],rules:[],intakePrompts:[]};
 const query=async(sql,args=[])=>{
  if(['BEGIN','COMMIT','ROLLBACK'].includes(sql)||sql.startsWith('SELECT pg_advisory_xact_lock_shared'))return {rows:[],rowCount:0};
  if(sql.startsWith('SELECT * FROM lvd_conversations'))return {rows:[{...c}],rowCount:1};
  if(sql.startsWith('SELECT id,metadata FROM lvd_messages'))return {rows:[],rowCount:0};
  if(sql.startsWith('SELECT 1 FROM lvd_messages'))return {rows:[],rowCount:0};
  if(sql.startsWith('SELECT id,body,metadata FROM lvd_messages'))return {rows:[current],rowCount:1};
  if(sql.startsWith('SELECT role,body,metadata FROM ')){
   state.historySQL=sql;
   let rows=options.previous||[];
   if(options.windowedHistory){
    const recent=rows.slice(0,80),ancient=sql.includes('UNION')?rows.filter(row=>row.role==='user').slice(-4):[];
    rows=[...new Map([...recent,...ancient].map(row=>[row.id,row])).values()].sort((a,b)=>b.id-a.id);
   }
   return {rows,rowCount:rows.length};
  }
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
  if(sql.startsWith('UPDATE lvd_conversations SET ai_enabled=')){c.ai_enabled=args[1];c.ai_generation=null;c.qualification=args[3];c.title=args[4]??c.title;c.retain_history||=args[3]!=='low';if(!args[1])c.guest_expiry_enabled=false;c.expires=Boolean(args[1]&&c.guest_expiry_enabled);return {rows:[],rowCount:1};}
  if(sql.startsWith('INSERT INTO lvd_chat_events'))return {rows:[],rowCount:1};
  throw new Error('Unexpected synthetic SQL branch: '+sql.slice(0,75));
 };
 t.mock.method(pool,'connect',async()=>({query,release(){}}));t.mock.method(pool,'query',query);
 t.mock.method(globalThis,'fetch',async(url,init)=>{
  const body=JSON.parse(init?.body||'{}'),prompt=body.contents&&JSON.parse(body.contents[0].parts[0].text);
  if(prompt?.phase==='intake'){
   state.assessments++;state.intakePrompts.push(prompt);state.order.push('assess');options.onAssess?.(state);if(options.unavailable)throw new Error('Synthetic provider unavailable');
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
 ['thanks after retained history',{body:'Cảm ơn',retained:true},'needs_details'],
 ['rapid thanks after unanswered meaningful turn',{body:'Hay',previous:[{role:'user',body:'Tôi muốn đòi nợ'}]},'needs_details'],
])test(name+' preserves the correct retention class without provider calls',async t=>{
 const state=fixture(t,options);await state.run();assert.equal(state.conversation.qualification,qualification);assert.equal(state.conversation.expires,!options.retained);assert.equal(state.replies[0].metadata.kind,'clarify');assert.equal(state.assessments,0);assert.equal(state.embeddings,0);assert.equal(state.conversation.title,undefined,'Incomplete intake does not name a conversation');
});

for(const [name,options,qualification] of [
 ['AI low',{assessment:{status:'low'}},'low'],
 ['AI needs country',{assessment:{status:'needs_details',detail:'country',question:'Vấn đề bạn vừa nêu liên quan đến Việt Nam hay Đức?'}},'needs_details'],
 ['AI low on retained history',{retained:true,assessment:{status:'low'}},'needs_details'],
 ['unknown assessment outage',{unavailable:true},'needs_details'],
 ['unknown malformed assessment',{assessment:{status:['low']}},'needs_details'],
 ['unknown disabled provider',{connected:false},'needs_details'],
 ['unknown disabled budget',{budget:0},'needs_details'],
])test(name+' uses fixed questions without retrieval or normal staff promotion',async t=>{
 const state=fixture(t,options);await state.run();assert.equal(state.conversation.qualification,qualification);assert.equal(state.conversation.ai_enabled,true);assert.equal(state.conversation.expires,!options.retained);assert.equal(state.admissions,0);assert.equal(state.embeddings,0);assert.equal(state.replies[0].metadata.kind,'clarify');assert.deepEqual(state.replies[0].metadata.sources,[]);assert.equal(state.replies[0].body,options.assessment?.question||(options.assessment?.status==='low'?clarificationText('goal',state.current.body):intakeUnavailableText(state.current.body)));
});

test('successful ready assessment preserves history before retrieval and retains existing no-source handoff',async t=>{
 const state=fixture(t);await state.run();assert.deepEqual(state.order,['assess','admit','embed']);assert.equal(state.conversation.retain_history,true);assert.equal(state.conversation.qualification,'ready');assert.equal(state.replies[0].metadata.kind,'handoff');assert.equal(state.conversation.expires,false);
});

test('known complete intake retains operational handoff when assessment is unavailable',async t=>{
 const state=fixture(t,{body:'Tôi muốn đầu tư thành lập GmbH tại Đức, đang chuẩn bị và cần biết chi phí',unavailable:true});await state.run();assert.equal(state.conversation.title,'Đầu tư tại Đức','Qualified context names the conversation even when evidence is unavailable');assert.deepEqual(state.order,['assess','admit','embed']);assert.equal(state.replies[0].metadata.kind,'handoff');assert.equal(state.conversation.retain_history,true);assert.equal(state.conversation.expires,false);
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
 const state=fixture(t,{assessment:{status:'low'},onAssess:state=>{state.provider.version++;}});await state.run();assert.equal(state.replies[0].metadata.kind,'clarify');assert.equal(state.conversation.qualification,'needs_details');assert.equal(state.conversation.ai_enabled,true);assert.equal(state.conversation.expires,true);
});

test('assessment operating rules are rechecked before accepting a low classification',async t=>{
 const state=fixture(t,{assessment:{status:'low'},onAssess:state=>state.rules.push({id:1,title:'Synthetic rule',body:'Synthetic operating restriction',jurisdiction:'BOTH',updated_at:new Date(),effective_from:new Date(0),expires_at:null,review_due_at:new Date(Date.now()+86400000)})});await state.run();assert.equal(state.replies[0].metadata.kind,'clarify');assert.equal(state.conversation.qualification,'needs_details');assert.equal(state.conversation.ai_enabled,true);assert.equal(state.conversation.expires,true);
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
 const state=fixture(t,{body:'Thi không đỗ',previous:repeatedExam,assessment:{status:'needs_details',detail:'situation',question:'Bạn đang thi chứng chỉ ngoại ngữ hay bằng lái?'},onAssess:state=>state.provider.version++});await state.run();assert.equal(state.replies[0].metadata.kind,'clarify');assert.equal(state.conversation.ai_enabled,true);assert.equal(state.embeddings,0);assert.equal(state.conversation.expires,true);
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

for(const [body,key] of [
 ['Tôi chưa cần gặp chuyên viên, tôi muốn đầu tư ở Đức','investment.form'],
 ['Không cần chuyên viên đâu, tôi muốn hỏi về đất đai','property.country'],
 ['Nếu không trả lời được thì mới chuyển chuyên viên. Tôi muốn hỏi về đất đai','property.country'],
 ['Nếu không có kiến thức, chuyển chuyên viên. Tôi muốn đầu tư ở Đức','investment.form'],
])test('declining or conditioning a human reply keeps factual intake active: '+body,async t=>{
 const state=fixture(t,{body});await state.run();assert.equal(state.replies[0].metadata.kind,'clarify');assert.equal(state.replies[0].metadata.clarificationKey,key);assert.equal(state.embeddings,0);assert.equal(state.assessments,0);assert.equal(state.admissions,0);assert.equal(state.conversation.ai_enabled,true);
});
test('a later explicit staff request is still respected after earlier declining contact',async t=>{
 const state=fixture(t,{body:'Bây giờ tôi muốn gặp chuyên viên',previous:[
 {role:'assistant',body:'Bạn muốn đầu tư theo hình thức nào?',metadata:{kind:'clarify',clarificationKey:'investment.form'}},
 {role:'user',body:'Tôi chưa cần gặp chuyên viên, tôi muốn đầu tư ở Đức',metadata:{aiConsent:{version:CONSENT_VERSION}}},
 ]});await state.run();assert.equal(state.replies[0].metadata.kind,'handoff');assert.equal(state.embeddings,0);assert.equal(state.assessments,0);assert.equal(state.conversation.ai_enabled,false);
});
test('a rejected model question during conditional contact falls back to factual intake without handoff',async t=>{
 const state=fixture(t,{body:'Nếu không trả lời được thì mới chuyển chuyên viên',assessment:{status:'needs_details',detail:'situation',question:'<b>Invalid synthetic question?</b>'},previous:[
 {role:'assistant',body:'Bạn muốn hỏi mua bán, sang tên hay việc khác?',metadata:{kind:'clarify',clarificationKey:'property.transaction'}},
 {role:'user',body:'Tôi muốn hỏi về đất đai ở Việt Nam',metadata:{aiConsent:{version:CONSENT_VERSION}}},
 ]});await state.run();assert.equal(state.assessments,1);assert.equal(state.embeddings,0);assert.equal(state.admissions,0);assert.equal(state.replies[0].metadata.kind,'clarify');assert.equal(state.replies[0].metadata.clarificationKey,'property.transaction');assert.equal(state.conversation.ai_enabled,true);
});


test('a new required slot in the same case receives contextual wording before a repeated question',async t=>{
 const next='Bạn đã nộp đơn ly hôn hay hai người vẫn đang trao đổi với nhau?';
 const state=fixture(t,{body:'Tài sản',previous:[
  {role:'assistant',body:'Bạn đang vướng ở thủ tục ly hôn, việc nuôi con hay chia tài sản?',metadata:{kind:'clarify',clarificationKey:'family.situation'}},
  {role:'user',body:'Tôi muốn hỏi về ly hôn ở Đức',metadata:{aiConsent:{version:CONSENT_VERSION}}},
 ],assessment:{status:'needs_details',detail:'timeline',question:next}});
 await state.run();assert.equal(state.assessments,1);assert.equal(state.embeddings,0);assert.equal(state.replies[0].body,next);assert.equal(state.replies[0].metadata.clarificationKey,'family.timeline');
 assert.match(state.intakePrompts[0].requiredQuestion,/ly hôn/);assert.equal(state.intakePrompts[0].requiredDetail,'timeline');
});
test('a model question about a different required fact falls back to the current case',async t=>{
 const state=fixture(t,{body:'Tài sản',previous:[
  {role:'assistant',body:'Bạn muốn hỏi về việc gì khi ly hôn?',metadata:{kind:'clarify',clarificationKey:'family.situation'}},
  {role:'user',body:'Tôi muốn hỏi về ly hôn ở Đức',metadata:{aiConsent:{version:CONSENT_VERSION}}},
 ],assessment:{status:'needs_details',detail:'parties',question:'Người mẹ có đồng ý cho bạn mảnh đất đó không?'}});
 await state.run();assert.equal(state.assessments,1);assert.equal(state.embeddings,0);assert.equal(state.replies[0].metadata.clarificationKey,'family.timeline');assert.match(state.replies[0].body,/ly hôn/);assert.doesNotMatch(state.replies[0].body,/mảnh đất/);
});
test('semantic intake on a repeated new property case does not receive the old owner',async t=>{
 const state=fixture(t,{body:'Bạn hỏi ai đang đứng tên à?',previous:[
  {role:'assistant',body:'Ai đang đứng tên mảnh đất?',metadata:{kind:'clarify',clarificationKey:'property-2.owner'}},
  {role:'user',body:'Còn mảnh đất khác tôi định mua ở Đức, thủ tục thế nào?',metadata:{aiConsent:{version:CONSENT_VERSION}}},
  {role:'assistant',body:'Bạn định thực hiện khi nào?',metadata:{kind:'clarify',clarificationKey:'property.timeline'}},
  {role:'user',body:'Tôi muốn sang tên đất ở Việt Nam, sổ đỏ đứng tên mẹ tôi, muốn biết thủ tục',metadata:{aiConsent:{version:CONSENT_VERSION}}},
 ],assessment:{status:'needs_details',detail:'parties',question:'Bạn hay một bên khác đang đứng tên mảnh đất tại Đức?'}});
 await state.run();assert.equal(state.assessments,1);assert.equal(state.embeddings,0);assert.equal(state.replies[0].metadata.clarificationKey,'property-2.owner');assert.doesNotMatch(state.intakePrompts[0].question,/mẹ tôi|Việt Nam/);assert.match(state.intakePrompts[0].question,/Đức/);
});
test('a completed divorce stage is remembered instead of asking the stage again',()=>{
 const next=intakeClarification('Tôi hỏi về ly hôn ở Đức, chia tài sản. Đã ly hôn.');assert.equal(next?.key,'family.parties');
});

test('a next-slot question cannot combine exam type with an unrelated goal',async t=>{
 const state=fixture(t,{body:'Thi không đỗ',previous:repeatedExam,assessment:{status:'needs_details',detail:'situation',question:'Đó là kỳ thi gì và bạn đang muốn hướng tới mục tiêu hay giải quyết vấn đề gì cụ thể?'}});
 await state.run();assert.equal(state.replies[0].metadata.clarificationKey,'exam.kind');assert.doesNotMatch(state.replies[0].body,/mục tiêu/);assert.equal(state.embeddings,0);
});
test('German compound Vermögensaufteilung supplies the family concern',()=>{
 assert.equal(intakeClarification('Ich möchte mich über Scheidung informieren\nDeutschland\nVermögensaufteilung')?.key,'family.timeline');
 assert.equal(intakeClarification('Ich möchte mich über Scheidung informieren\nDeutschland\nVermögensaufteilung\nBereits geschieden')?.key,'family.parties');
});
test('repeated timeline fallbacks keep asking the stage instead of restarting the goal',()=>{
 const question='Tôi muốn đầu tư tại Đức\nThành lập GmbH',initial=intakeClarification(question),previous=[];
 for(let i=0;i<8;i++){const text=unrepeatedClarification(initial,previous,question);assert.doesNotMatch(text,/tư vấn về việc gì|muốn giải quyết vấn đề/);assert.notEqual(text,previous[0]);previous.unshift(text);}
});

for(const item of [
 {base:'Tôi muốn sang tên đất ở Việt Nam, sổ đỏ đứng tên mẹ tôi, đang chuẩn bị và muốn biết thủ tục',body:'Mẹ tôi muốn sang tên đất cho hai con, thủ tục có khác không?',fact:'mẹ tôi'},
 {base:'Ich möchte ein Grundstück in Deutschland übertragen, meine Mutter ist im Grundbuch eingetragen, in Vorbereitung und ich möchte das Verfahren wissen',body:'Welche Unterlagen braucht meine Mutter für die Übertragung des Grundstücks an zwei Kinder?',fact:'Grundbuch'},
])test('substantive same-property follow-up retains consented facts after an answer: '+item.body,async t=>{
 const state=fixture(t,{body:item.body,retained:true,previous:[
  {role:'assistant',body:'Synthetic previous approved answer.',metadata:{kind:'ai',sources:[]}},
  {role:'user',body:item.base,metadata:{aiConsent:{version:CONSENT_VERSION}}},
 ]});
 await state.run();assert.equal(state.assessments,1,'A complete same-case follow-up must reach assessment instead of asking the country again');
 assert.equal(state.embeddings,1);assert.ok(state.intakePrompts[0].question.includes(item.fact));
 assert.equal(state.replies[0].metadata.kind,'handoff','No source match hands off only after completeness assessment');
});

for(const item of [
 {body:'Tôi muốn hỏi mảnh đất khác',key:'property-2.country'},
 {body:'Ich möchte ein anderes Grundstück kaufen',key:'property-2.country'},
 {body:'Còn ly hôn thì sao?',key:'family.country'},
 {body:'Ich möchte eine Frage zur Scheidung stellen',key:'family.country'},
 {body:'Tôi muốn hỏi về thuế',key:'tax.country'},
 {body:'Hay',key:'goal'},
 {body:'Tôi muốn hỏi thủ tục sang tên đất cho hai con',key:'property.country',consented:false},
 {body:'Tôi muốn hỏi thủ tục sang tên đất cho hai con',key:'property.country',previousConsented:false},
 {body:'Tôi muốn sang tên đất, chưa rõ ai đang đứng tên',key:'property.owner'},
])test('post-answer follow-up cannot borrow unrelated, withdrawn or unconsented facts: '+item.body+' '+String(item.consented)+' '+String(item.previousConsented),async t=>{
 const state=fixture(t,{body:item.body,retained:true,consented:item.consented,previous:[
  {role:'assistant',body:'Synthetic previous approved answer.',metadata:{kind:'ai',sources:[]}},
  {role:'user',body:'Tôi muốn sang tên đất ở Việt Nam, sổ đỏ đứng tên mẹ tôi, đang chuẩn bị và muốn biết thủ tục',metadata:item.previousConsented===false?undefined:{aiConsent:{version:CONSENT_VERSION}}},
 ]});
 await state.run();assert.equal(state.assessments,0);assert.equal(state.embeddings,0);assert.equal(state.admissions,0);
 assert.equal(state.replies[0].metadata.kind,'clarify');assert.equal(state.replies[0].metadata.clarificationKey,item.key);assert.equal(state.conversation.ai_enabled,true);
});

test('resolving a withdrawn fact after a prior answer retains the other established facts',async t=>{
 const state=fixture(t,{body:'Mẹ tôi',retained:true,previous:[
  {role:'assistant',body:'Ai đang đứng tên mảnh đất?',metadata:{kind:'clarify',clarificationKey:'property.owner'}},
  {role:'user',body:'Tôi muốn sang tên đất, chưa rõ ai đang đứng tên',metadata:{aiConsent:{version:CONSENT_VERSION}}},
  {role:'assistant',body:'Synthetic previous approved answer.',metadata:{kind:'ai',sources:[]}},
  {role:'user',body:'Tôi muốn sang tên đất ở Việt Nam, có sổ đỏ đứng tên mẹ tôi, đang chuẩn bị và muốn biết thủ tục',metadata:{aiConsent:{version:CONSENT_VERSION}}},
 ]});
 await state.run();assert.equal(state.embeddings,1,'Resolving only ownership must not ask again for the known country, documents or stage');
 assert.equal(state.replies[0].metadata.kind,'handoff');
});

test('German ownership resolution after an answer retains the known document and timing',async t=>{
 const state=fixture(t,{body:'Meine Mutter',retained:true,previous:[
  {role:'assistant',body:'Auf wen ist das Grundstück eingetragen?',metadata:{kind:'clarify',clarificationKey:'property.owner'}},
  {role:'user',body:'Ich möchte das Grundstück übertragen, weiß aber nicht, wer im Grundbuch eingetragen ist.',metadata:{aiConsent:{version:CONSENT_VERSION}}},
  {role:'assistant',body:'Synthetic approved answer.',metadata:{kind:'ai',sources:[]}},
  {role:'user',body:'Ich möchte ein Grundstück in Deutschland übertragen, meine Mutter ist im Grundbuch eingetragen, in Vorbereitung und ich möchte das Verfahren wissen',metadata:{aiConsent:{version:CONSENT_VERSION}}},
 ]});
 await state.run();assert.equal(state.embeddings,1);assert.equal(state.replies[0].metadata.kind,'handoff');
});

for(const item of [
 {trail:'Còn mảnh đất khác tại Đức, tôi muốn sang tên',key:'property-2.owner',expected:'property-2.document'},
 {trail:'Còn ly hôn thì sao?',key:'family.country',body:'Ở Đức',expected:'family.situation'},
 {trail:'Tôi muốn sang tên đất, chưa rõ ai đứng tên',key:'property.owner',trailConsented:false,expected:'property.country'},
 {trail:'Tôi muốn sang tên đất, chưa rõ ai đứng tên',key:'property.owner',consented:false,expected:'property.country'},
])test('clarification continuation isolates new matters and consent boundaries: '+item.trail+' '+String(item.trailConsented)+' '+String(item.consented),async t=>{
 const state=fixture(t,{body:item.body||'Mẹ tôi',retained:true,consented:item.consented,previous:[
  {role:'assistant',body:'Synthetic clarification?',metadata:{kind:'clarify',clarificationKey:item.key}},
  {role:'user',body:item.trail,metadata:item.trailConsented===false?null:{aiConsent:{version:CONSENT_VERSION}}},
  {role:'assistant',body:'Synthetic approved answer.',metadata:{kind:'ai',sources:[]}},
  {role:'user',body:'Tôi muốn sang tên đất ở Việt Nam, có sổ đỏ đứng tên mẹ tôi, đang chuẩn bị và muốn biết thủ tục',metadata:{aiConsent:{version:CONSENT_VERSION}}},
 ]});
 await state.run();assert.equal(state.embeddings,0);assert.equal(state.admissions,0);assert.equal(state.replies[0].metadata.kind,'clarify');assert.equal(state.replies[0].metadata.clarificationKey,item.expected);
});

test('a matter boundary outside the recent message window cannot revive ancient property facts',async t=>{
 const approved=body=>({role:'user',body,metadata:{aiConsent:{version:CONSENT_VERSION}}});
 const old='Tôi muốn sang tên đất ở Việt Nam, có sổ đỏ đứng tên mẹ tôi, đang chuẩn bị và muốn biết thủ tục';
 const chronological=[approved(old),approved(old),approved(old),approved(old),approved('Còn mảnh đất khác ở Đức, tôi muốn mua')];
 for(let i=0;i<45;i++)chronological.push({role:'assistant',body:'Bạn có thể nói rõ thêm không?',metadata:{kind:'clarify',clarificationKey:'goal'}},approved('Thông tin bổ sung '+i));
 const previous=chronological.map((row,index)=>({...row,id:index+1})).reverse();
 const state=fixture(t,{body:'Tôi muốn biết thủ tục sang tên đất',retained:true,previous,windowedHistory:true});
 state.current.id=1000;
 await state.run();assert.equal(state.assessments,0);assert.equal(state.embeddings,0);assert.equal(state.admissions,0);
 assert.equal(state.replies[0].metadata.kind,'clarify');assert.equal(state.replies[0].metadata.clarificationKey,'property.country','Recollect missing facts rather than reuse the first unrelated property');
 assert.doesNotMatch(state.historySQL,/UNION/);assert.match(state.historySQL,/ORDER BY id DESC LIMIT 80$/);
});

test('all facts at the inclusive 80-message boundary remain available in message order',async t=>{
 const approved=body=>({role:'user',body,metadata:{aiConsent:{version:CONSENT_VERSION}}});
 const chronological=[approved('Tôi muốn sang tên đất ở Việt Nam, có sổ đỏ đứng tên mẹ tôi, đang chuẩn bị và muốn biết thủ tục'),...Array.from({length:78},(_,i)=>approved('Thông tin bổ sung '+i)),{role:'assistant',body:'Synthetic approved answer.',metadata:{kind:'ai',sources:[]}}];
 const previous=chronological.map((row,index)=>({...row,id:index+1})).reverse();
 const state=fixture(t,{body:'Thủ tục sang tên đất cần chuẩn bị thêm gì?',retained:true,previous,windowedHistory:true});state.current.id=1000;
 await state.run();assert.equal(state.assessments,1);assert.equal(state.embeddings,1);assert.equal(state.replies[0].metadata.kind,'handoff');
 assert.match(state.intakePrompts[0].question,/sổ đỏ đứng tên mẹ tôi/);assert.ok(state.intakePrompts[0].question.indexOf('Thông tin bổ sung 0')<state.intakePrompts[0].question.indexOf('Thông tin bổ sung 77'));
});

test('budgeting three property matters cannot reuse the older matter clarification identity',async t=>{
 const approved=body=>({role:'user',body,metadata:{aiConsent:{version:CONSENT_VERSION}}}),ask=key=>({role:'assistant',body:'Synthetic factual question?',metadata:{kind:'clarify',clarificationKey:key}});
 const chronological=[{role:'assistant',body:'Synthetic earlier approved answer.',metadata:{kind:'ai',sources:[]}},
  approved('Tôi muốn sang tên đất tại Việt Nam, có sổ đỏ đứng tên mẹ tôi, đang chuẩn bị và muốn biết thủ tục'),ask('property.goal'),
  approved('Còn mảnh đất khác tại Đức, tôi muốn mua. '+'Bổ sung '.repeat(400)),ask('property-2.owner'),approved('Cha tôi'),ask('property-2.document'),approved('Có rồi'),ask('property-2.timeline'),approved('Đang chuẩn bị'),ask('property-2.goal'),approved('Muốn biết thủ tục'),
  approved('Còn một mảnh đất khác nữa tại Việt Nam, tôi muốn sang tên, đang chuẩn bị và muốn biết thủ tục'),ask('property-3.owner'),approved('Mẹ tôi'),ask('property-3.document'),
 ];
 for(let i=0;i<20;i++)chronological.push(approved('Thông tin thêm '+i+' '+ 'thông tin '.repeat(90)),ask('property-3.document'));
 const state=fixture(t,{body:'Chưa rõ',retained:true,previous:chronological.reverse()});
 await state.run();assert.equal(state.embeddings,0);assert.equal(state.admissions,0);assert.equal(state.replies[0].metadata.kind,'clarify');
 assert.equal(state.replies[0].metadata.clarificationKey,'property-3.document','A skipped intermediate marker must not rename the current case to the previous case');
});

for(const [body,question] of [
 ['về thời gian ở tù','Bạn đang hỏi về cách tính thời gian chấp hành án hay một mức án cụ thể?'],
 ['Tôi muốn mua bảo hiểm','Bạn muốn tìm hiểu bảo hiểm sức khỏe hay bảo hiểm cho loại rủi ro nào?'],
 ['Tôi muốn đòi nợ','Bạn muốn tìm hiểu thủ tục đòi nợ hay đang vướng ở bước nào?'],
 ['Ich möchte wissen, wie lange eine Haft dauert','Geht es um die Berechnung der Haftdauer oder eine bereits ausgesprochene Strafe?'],
])test('unknown topic is assessed from the first meaningful turn: '+body,async t=>{
 const state=fixture(t,{body,assessment:{status:'needs_details',detail:'situation',question}});await state.run();
 assert.equal(state.assessments,1);assert.equal(state.intakePrompts[0].required,null);assert.equal(state.intakePrompts[0].requiredQuestion,null);assert.equal(state.replies[0].body,question);assert.equal(state.embeddings,0);assert.equal(state.conversation.ai_enabled,true);assert.equal(state.replies[0].metadata.clarificationKey,'intake.situation');
});
test('the prison-duration dialogue retains all consented turns without forcing a generic goal',async t=>{
 const previous=[],questions=['Bạn đang hỏi về cách tính thời gian chấp hành án hay một mức án cụ thể?','Bạn nói “20 năm” là mức án đã tuyên hay thời gian bạn đang muốn tìm hiểu?','Bạn đang muốn hỏi quy định về bản án 20 năm, hay câu vừa rồi mang ý khác?'];
 const state=fixture(t,{previous,assessment:{status:'needs_details',detail:'situation',question:questions[0]}});
 for(const [index,body] of ['về thời gian ở tù','tôi cần 20 năm','giúp tôi có 20 năm ở tù'].entries()){
  state.current.id=index+1;state.current.body=body;
  // The fixture receives a new proposed question each time, but the production
  // orchestration must supply context and must not replace it with a fixed goal.
  const proposed={status:'needs_details',detail:'situation',question:questions[index]};
  t.mock.method(globalThis,'fetch',async(_url,init)=>{
   const prompt=JSON.parse(JSON.parse(init.body).contents[0].parts[0].text);assert.equal(prompt.phase,'intake');assert.equal(prompt.required,null);assert.ok(prompt.question.includes('về thời gian ở tù'));
   if(index)assert.ok(prompt.question.includes('20 năm'));return Response.json({candidates:[{finishReason:'STOP',content:{parts:[{text:JSON.stringify(proposed)}]}}]});
  });
  await state.run();const reply=state.replies.at(-1);assert.equal(reply.body,questions[index]);assert.equal(reply.metadata.kind,'clarify');assert.equal(isOpeningClarification(reply.body),false);assert.equal(state.embeddings,0);assert.equal(state.admissions,0);
  previous.unshift({role:'assistant',body:reply.body,metadata:reply.metadata},{role:'user',body,metadata:state.current.metadata});
 }
});
for(const assessment of [{status:'needs_details',detail:'goal'},{status:'needs_details',detail:'goal',question:'Bạn đang cần tư vấn về việc gì và muốn giải quyết vấn đề nào?'}])test('an unknown request cannot be hidden behind a generic model question: '+JSON.stringify(assessment),async t=>{
 const state=fixture(t,{body:'về thời gian ở tù',assessment});await state.run();assert.equal(state.assessments,1);assert.equal(state.replies[0].body,intakeUnavailableText(state.current.body));assert.equal(state.replies[0].metadata.clarificationKey,'intake.unavailable');assert.equal(state.embeddings,0);assert.equal(state.conversation.ai_enabled,true);
});
test('unknown-topic outages report processing failure rather than repeatedly asking the opening question',async t=>{
 const state=fixture(t,{body:'về thời gian ở tù',unavailable:true});await state.run();assert.equal(state.replies[0].body,intakeUnavailableText(state.current.body));assert.equal(state.replies[0].metadata.clarificationKey,'intake.unavailable');assert.equal(state.embeddings,0);assert.equal(state.conversation.ai_enabled,true);
});
test('unconsented unknown topics stay local and private',async t=>{
 const state=fixture(t,{body:'về thời gian ở tù',consented:false});await state.run();assert.equal(state.assessments,0);assert.equal(state.embeddings,0);assert.equal(state.replies[0].metadata.kind,'clarify');
});

test('a retained unknown topic cannot skip contextual intake when its provider is unavailable',async t=>{
 const state=fixture(t,{body:'Xin giải thích chung về thời gian chấp hành án?',retained:true,unavailable:true});await state.run();assert.equal(state.assessments,1);assert.equal(state.embeddings,0);assert.equal(state.admissions,0);assert.equal(state.replies[0].metadata.clarificationKey,'intake.unavailable');assert.equal(state.conversation.ai_enabled,true);
});
test('a short yes/no reply to an unknown-topic question is interpreted with consented context',async t=>{
 const question='Bạn muốn tìm hiểu cách tính thời gian chấp hành án hay ý nào khác?';
 const state=fixture(t,{body:'không',assessment:{status:'needs_details',detail:'situation',question},previous:[{role:'assistant',body:'Bạn đã có một mức án cụ thể chưa?',metadata:{kind:'clarify',clarificationKey:'intake.situation'}},{role:'user',body:'về thời gian ở tù',metadata:{aiConsent:{version:CONSENT_VERSION}}}]});
 await state.run();assert.equal(state.assessments,1);assert.equal(state.intakePrompts[0].required,null);assert.ok(state.intakePrompts[0].question.includes('về thời gian ở tù'));assert.equal(state.replies[0].body,question);assert.equal(state.embeddings,0);
});

test('a semantic title is saved together with intake before legal facts are complete',async t=>{
 const title='Xin ân xá',question='Bạn đang hỏi về điều kiện hay thủ tục xin ân xá?';
 const state=fixture(t,{body:'xin ân xá bạn ơi',assessment:{status:'needs_details',detail:'goal',question,title}});await state.run();
 assert.equal(state.conversation.title,title);assert.equal(state.replies[0].body,question);assert.equal(state.embeddings,0);assert.equal(state.assessments,1);
});
test('invalid AI titles are omitted without rejecting a useful intake question',()=>{
 const question='Bạn muốn tìm hiểu điều kiện hay thủ tục nào?';
 assert.deepEqual(validateIntakeAssessment({status:'needs_details',detail:'goal',question,title:'Tên 0123456789'}),{status:'needs_details',detail:'goal',question});
});
test('a changed provider cannot persist its stale generated title',async t=>{
 const state=fixture(t,{body:'xin ân xá',assessment:{status:'needs_details',detail:'goal',question:'Bạn muốn biết điều kiện hay thủ tục xin ân xá?',title:'Xin ân xá'},onAssess:state=>state.provider.version++});await state.run();assert.equal(state.conversation.title,undefined);assert.equal(state.conversation.ai_enabled,true);
});
