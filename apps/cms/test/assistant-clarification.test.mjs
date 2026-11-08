import test from 'node:test';
import assert from 'node:assert/strict';
import {initialClarification,clarificationText,detailKinds,nextClarification,clarificationHistory,currentIntakeContext,MAX_CLARIFICATIONS} from '../src/modules/assistant/clarification.ts';
import {validateSelection} from '../src/modules/rag/core.ts';
test('incomplete requests and bare topics ask a question before retrieval or handoff',()=>{
 for(const text of ['tôi muốn','Tôi cần hỏi','tôi đang cần hỏi','Xin chào','thế chấp tài sản','tôi muốn hỏi về thế chấp tài sản','ich möchte','Ich habe eine Frage zum Aufenthalt'])assert.ok(initialClarification(text),text);
 for(const text of ['Điều kiện thế chấp tài sản tại Việt Nam là gì?','Tôi cần chuẩn bị giấy tờ gì để đăng ký kết hôn?','Welche Voraussetzungen gelten für die Einbürgerung?'])assert.equal(initialClarification(text),null,text);
 assert.match(initialClarification('ich möchte'),/möchten/);
});
test('clarification only allows predefined context questions, never generated legal answers',()=>{
 for(const detail of detailKinds){assert.deepEqual(validateSelection({kind:'clarify-details',detail,answer:'untrusted legal answer'},[]),{kind:'clarify-details',detail});assert.ok(clarificationText(detail,'tôi muốn'))}
 for(const detail of [undefined,'send-passport','invented'])assert.throws(()=>validateSelection({kind:'clarify-details',detail},[]),/Unsupported clarification/);
});

test('investment intake follows topic, place, form, stage and goal without repeating a question',()=>{
 const asked=[],turns=[];
 for(const [message,key] of [['tôi muốn','goal'],['về đầu tư','investment.country'],['ở Đức','investment.form'],['thành lập GmbH','investment.timeline'],['đang chuẩn bị','investment.goal']]){
  turns.push(message);const next=nextClarification(turns.join('\n'),asked);assert.equal(next?.key,key,message);assert.ok(next.text.endsWith('?'));asked.push(next.key);
 }
 turns.push('muốn biết thủ tục và chi phí');assert.equal(nextClarification(turns.join('\n'),asked),null,'Complete intake proceeds to existing approved-source selection');assert.equal(new Set(asked).size,asked.length);
 const german=nextClarification('Ich möchte\nüber Investitionen');assert.equal(german.key,'investment.country');assert.match(german.text,/Land/);
});

test('known facts are skipped and common topics ask relevant context rather than a legal answer',()=>{
 assert.equal(nextClarification('Tôi muốn đầu tư thành lập GmbH tại Đức, đang chuẩn bị').key,'investment.goal');
 for(const [question,key] of [['cư trú','residence.country'],['tôi muốn hỏi về thừa kế tại Đức','inheritance.situation'],['ly hôn tại Việt Nam','family.situation'],['hop dong lao dong tai Duc','work.relationship'],['thế chấp tài sản','property.country'],['thuế','tax.country'],['hợp đồng','contract.country']])assert.equal(nextClarification(question,['goal']).key,key,question);
 for(const [question,key] of [['về đầu tư tại Đức','investment.form'],['cư trú tại Đức','residence.purpose'],['thuế tại Việt Nam','tax.activity']])assert.equal(nextClarification(question,['goal']).key,key,question);
 const asked=[];let next;while((next=nextClarification('tôi muốn',asked))){assert.ok(!asked.includes(next.key));asked.push(next.key);assert.ok(asked.length<=MAX_CLARIFICATIONS);}assert.equal(asked.length,detailKinds.length);
});

test('Vietnamese legal or method wording never supplies France as the missing investment country',()=>{
 for(const question of ['tôi muốn tư vấn pháp luật về đầu tư','tôi muốn tìm hiểu phương pháp đầu tư'])assert.equal(nextClarification(question).key,'investment.country',question);
 for(const question of ['tôi muốn đầu tư ở Pháp','tôi muốn đầu tư tại Pháp','Ich möchte in Frankreich investieren'])assert.equal(nextClarification(question).key,'investment.form',question);
});

test('personal pronouns and common Vietnamese words never supply an investment country',()=>{
 for(const question of ['Tôi muốn đầu tư, anh hỗ trợ nhé','Tôi muốn đầu tư cho anh trai','Tôi muốn đầu tư, my plan is still vague','Tôi muốn đầu tư nhưng vẫn ức chế','Tôi muốn đầu tư mỹ phẩm'])assert.equal(nextClarification(question)?.key,'investment.country',question);
 const english='I want to invest; my plan is still vague';assert.equal(currentIntakeContext(english).countryKnown,false);assert.equal(nextClarification(english,[],'country')?.key,'country');
 for(const question of ['Tôi muốn đầu tư ở Anh','Tôi muốn đầu tư tại Mỹ','Tôi muốn đầu tư ở Úc','Tôi muốn đầu tư tại My','Ich möchte in England investieren'])assert.equal(nextClarification(question)?.key,'investment.form',question);
});

test('explicit place corrections invalidate old facts and permit one bounded replacement question',()=>{
 const history='Tôi muốn đầu tư\nở Đức\nthành lập GmbH',asked=['investment.country','investment.form'];
 for(const correction of ['Không phải Đức, chưa rõ quốc gia','Sửa lại quốc gia, tôi chưa quyết định','Nicht Deutschland, das Land ist noch unklar']){
  const context=history+'\n'+correction,next=nextClarification(context,asked);assert.equal(next?.key,'investment.country-correction',correction);assert.equal(currentIntakeContext(context).countryKnown,false);
  assert.notEqual(nextClarification(context,[...asked,next.key])?.key,next.key,'The replacement question cannot loop');
 }
 for(const correction of ['Không phải Đức mà ở Việt Nam','Nicht Deutschland, sondern in Vietnam']){
  const context=history+'\n'+correction;assert.equal(currentIntakeContext(context).countryKnown,true);assert.equal(nextClarification(context,asked)?.key,'investment.timeline');
 }
 assert.equal(nextClarification(history+'\nSửa lại hình thức thành lập doanh nghiệp',asked)?.key,'investment.timeline','An unrelated correction preserves the country');
});

test('a new topic gets its own facts and country unless explicitly retained or supplied',()=>{
 const history='Tôi muốn đầu tư tại Đức\nthành lập GmbH\nđang chuẩn bị',asked=['investment.country','investment.form','investment.timeline'];
 for(const request of ['Bây giờ tôi muốn hỏi về ly hôn ở nước khác','Jetzt habe ich eine Frage zur Scheidung in einem anderen Land'])assert.equal(nextClarification(history+'\n'+request,asked)?.key,'family.country',request);
 for(const request of ['Không phải đầu tư, tôi muốn hỏi về ly hôn ở nước khác','Nicht Investitionen, ich möchte zur Scheidung fragen'])assert.equal(nextClarification(history+'\n'+request,asked)?.key,'family.country',request);
 for(const request of ['Bây giờ tôi muốn hỏi về ly hôn tại Việt Nam','Bây giờ tôi muốn hỏi về ly hôn, vẫn ở Đức','Jetzt habe ich eine Frage zur Scheidung im selben Land'])assert.equal(nextClarification(history+'\n'+request,asked)?.key,'family.situation',request);
 for(const continuation of ['Bây giờ tôi muốn hỏi về ly hôn cùng quốc gia\nBây giờ tôi muốn hỏi về cư trú cùng quốc gia','Jetzt frage ich zur Scheidung im selben Land\nJetzt frage ich zum Aufenthalt im selben Land'])assert.equal(nextClarification(history+'\n'+continuation,asked)?.key,'residence.purpose','An explicit same-country reference survives successive topic switches');
 const returned=history+'\nBây giờ tôi muốn hỏi về ly hôn tại Việt Nam\nBây giờ tôi muốn hỏi về đầu tư ở nước khác';
 assert.equal(nextClarification(returned,[...asked,'family.situation'])?.key,'investment-2.country');
 assert.equal(currentIntakeContext(returned).text,'Bây giờ tôi muốn hỏi về đầu tư ở nước khác');
 const assetAnswer='Tôi muốn hỏi về thừa kế tại Đức\nDi sản gồm nhà đất';assert.equal(currentIntakeContext(assetAnswer).topic,'inheritance','An asset answer does not change the requested topic');
});

test('tax and rental accents retain the requested topic instead of array order',()=>{
 for(const [question,topic] of [['Tôi muốn hỏi về thuế nhà đất','tax'],['Tôi muốn thuê nhà','property'],['Tôi muốn hỏi về hợp đồng đầu tư','contract'],['Tôi muốn đầu tư theo hợp đồng','investment']]){
  assert.equal(currentIntakeContext(question).topic,topic,question);assert.equal(nextClarification(question)?.key,topic+'.country',question);
 }
 const context='Tôi muốn đầu tư tại Đức\nBây giờ tôi muốn hỏi về thuế nhà đất';assert.equal(nextClarification(context,['investment.country'])?.key,'tax.country');
});

test('repeated model clarification enums select only an unasked fixed question and stop at the bound',()=>{
 const asked=[];for(let i=0;i<MAX_CLARIFICATIONS;i++){const next=nextClarification('tôi muốn\nvề đầu tư',asked,'situation');if(!next)break;assert.ok(!asked.includes(next.key));asked.push(next.key);}
 assert.equal(new Set(asked).size,asked.length);assert.equal(nextClarification('tôi muốn\nvề đầu tư',asked,'situation'),null);
 assert.equal(nextClarification('đầu tư',Array.from({length:MAX_CLARIFICATIONS},(_,i)=>'previous-'+i),'goal'),null);
});

test('clarification history retains all intake turns but forwards only consented customer context',()=>{
 const consent='synthetic-consent',user=(body,allowed=true)=>({role:'user',body,metadata:allowed?{aiConsent:{version:consent}}:{}}),ask=key=>({role:'assistant',body:'Fixed prompt',metadata:{kind:'clarify',clarificationKey:key}});
 const rows=[user('thành lập GmbH'),ask('investment.form'),user('ở Đức'),ask('country'),user('về đầu tư'),ask('goal'),user('PRIVATE LEGACY TURN',false),{role:'assistant',body:'Previous answer',metadata:{kind:'ai'}},user('Unrelated older context')];
 const history=clarificationHistory(rows,consent);assert.equal(history.count,3);assert.deepEqual(history.keys,['investment.form','country','goal']);assert.equal(history.context,'về đầu tư\nở Đức\nthành lập GmbH');assert.match(history.localContext,/PRIVATE LEGACY TURN/);assert.ok(!history.context.includes('PRIVATE'));assert.ok(!history.localContext.includes('Unrelated'));
 assert.equal(clarificationHistory([user('No preceding intake')],consent).context,'');assert.equal(clarificationHistory([{role:'staff',body:'PRIVATE STAFF'},...rows],consent).count,0);
});
