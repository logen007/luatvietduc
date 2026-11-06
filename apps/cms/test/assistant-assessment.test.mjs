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
  if(sql.startsWith('UPDATE lvd_conversations SET ai_enabled=')){c.ai_enabled=args[1];c.qualification=args[3];c.expires=Boolean(args[1]&&args[3]==='low');return {rows:[],rowCount:1};}
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
 await state.run();assert.equal(state.replies[0].metadata.kind,'clarify');assert.equal(state.replies[0].metadata.clarificationKey,'property.country');assert.match(state.replies[0].body,/Việt Nam, Đức/);assert.equal(state.conversation.ai_enabled,true);assert.equal(state.assessments,0);assert.equal(state.embeddings,0);assert.equal(state.conversation.qualification,'needs_details');
});
