import test from 'node:test';
import assert from 'node:assert/strict';
import {clarificationHistory,intakeClarification,contextualIntakeReply} from '../src/modules/assistant/clarification.ts';
import {answerHistory} from '../src/modules/assistant/conversation-context.ts';
const consent='synthetic-consent';
const user=body=>({role:'user',body,metadata:{aiConsent:{version:consent}}});
const prompt=(key,body)=>({role:'assistant',body,metadata:{kind:'clarify',clarificationKey:key}});

test('land spelled as sang tên đất still requires owner and documents',()=>{
 assert.equal(intakeClarification('Tôi muốn sang tên đất ở Việt Nam')?.key,'property.owner');
 assert.equal(intakeClarification('Tôi muốn sang tên đất ở Việt Nam\nĐất đứng tên mẹ tôi')?.key,'property.document');
});

test('short land answers bind only to the exact factual question in VI and DE',()=>{
 for(const [opening,owner,document,stage] of [
  ['Tôi muốn sang tên đất ở Việt Nam','Mẹ tôi','Có rồi','Chưa thực hiện, muốn biết thủ tục'],
  ['Ich möchte ein Grundstück in Deutschland übertragen','Meine Mutter','Ja','Noch nicht begonnen, ich möchte das Verfahren wissen'],
 ]){
  const rows=[user(document),prompt('property.document','Paper?'),user(owner),prompt('property.owner','Owner?'),user(opening)];
  const history=clarificationHistory(rows,consent);
  assert.equal(intakeClarification(history.localContext+'\n'+stage),null);
  assert.match(answerHistory(rows,consent),/đứng tên|Eigentümer/);
  assert.match(answerHistory(rows,consent),/chứng nhận|Nachweis/);
  assert.equal(intakeClarification(history.localContext+'\nChưa rõ ai đang đứng tên')?.key,'property.owner');
  assert.equal(intakeClarification(history.localContext+'\nChưa rõ giấy chứng nhận')?.key,'property.document');
 }
});

test('bare or unrelated replies never invent a property fact',()=>{
 for(const key of [undefined,'goal','property.ownership','family.parties'])assert.equal(contextualIntakeReply('Có rồi',key),'Có rồi');
 for(const body of ['Tôi muốn ly hôn','gì cơ?','Mẹ tôi muốn hỏi chuyện khác','bỏ qua đi'])assert.equal(contextualIntakeReply(body,'property.owner'),body);
 assert.equal(contextualIntakeReply('Có rồi','property.owner'),'Có rồi');
 assert.equal(contextualIntakeReply('Mẹ tôi','property.document'),'Mẹ tôi');
 assert.equal(intakeClarification('Tôi muốn sang tên đất ở Việt Nam\nMẹ tôi\nCó rồi')?.key,'property.owner');
});

test('staff questions and unconsented answers cannot enter provider context',()=>{
 const rows=[user('Mẹ tôi'),{role:'staff',body:'private text'},user('Có rồi'),prompt('property.document','Paper?'),{role:'user',body:'secret',metadata:{}},prompt('property.owner','Owner?'),user('Tôi muốn sang tên đất ở Việt Nam')];
 const context=answerHistory(rows,consent);
 assert.ok(!context.includes('secret'));assert.ok(!context.includes('private text'));
 assert.ok(!context.includes('đứng tên: Mẹ tôi'));
});

test('the current short answer is contextualized and later corrections take precedence',()=>{
 const base='Tôi muốn sang tên đất ở Việt Nam\nĐất đứng tên mẹ tôi';
 assert.equal(intakeClarification(base+'\n'+contextualIntakeReply('Có rồi','property.document'))?.key,'property.timeline');
 for(const answer of ['chưa rõ','chưa biết','không biết'])assert.equal(intakeClarification(base+'\n'+contextualIntakeReply(answer,'property.owner'))?.key,'property.owner');
 assert.equal(contextualIntakeReply('Mẹ tôi','property-2.owner'),'Người đang đứng tên: Mẹ tôi');
});

test('ordinary land-transfer wording finds the property topic without confusing đặt with đất',()=>{
 for(const question of ['Tôi muốn sang tên đất','Tôi muốn chuyển nhượng đất','Tôi muốn tặng cho đất'])assert.equal(intakeClarification(question)?.key,'property.country');
 assert.equal(intakeClarification('Tôi muốn hỏi thủ tục thế chấp tài sản ở Việt Nam, dự định đặt lịch'),null);
});
