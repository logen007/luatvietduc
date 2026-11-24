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


test('self replies bind only to a family party question, including scoped German replies',()=>{
 const vi='Tôi muốn hỏi ly hôn ở Đức\nChia tài sản\nĐã ly hôn';
 const de='Ich möchte zur Scheidung in Deutschland fragen\nVermögensaufteilung\nBereits geschieden';
 for(const answer of ['Tôi','Mình','Chính tôi','Cho tôi'])assert.equal(intakeClarification(vi+'\n'+contextualIntakeReply(answer,'family.parties')),null,answer);
 for(const answer of ['Ich','Ich selbst','Für mich'])assert.equal(intakeClarification(de+'\n'+contextualIntakeReply(answer,'family-2.parties')),null,answer);
 for(const key of [undefined,'goal','family.timeline','property.document'])assert.equal(contextualIntakeReply('Tôi',key),'Tôi',String(key));
 for(const answer of ['Không phải tôi','Tôi chưa hiểu','Ai vậy?'])assert.equal(contextualIntakeReply(answer,'family.parties'),answer);
});
test('asking what a document is never asserts that the customer already has one',()=>{
 const vi='Tôi muốn sang tên đất ở Việt Nam\nĐất đứng tên mẹ tôi\nĐang chuẩn bị, muốn biết thủ tục';
 const de='Ich möchte das Grundstück in Deutschland übertragen\nDie Mutter ist als Eigentümerin eingetragen\nIn Vorbereitung, ich möchte das Verfahren wissen';
 for(const answer of ['Sổ đỏ là gì?','Có sổ đỏ chưa là sao?','Giấy chứng nhận nghĩa là gì?','Có sổ đỏ chưa?'])assert.equal(intakeClarification(vi+'\n'+answer)?.key,'property.document',answer);
 for(const answer of ['Was ist ein Eigentumsnachweis?','Was bedeutet Grundbuchauszug?','Habe ich einen Nachweis?'])assert.equal(intakeClarification(de+'\n'+answer)?.key,'property.document',answer);
 assert.equal(intakeClarification(de+'\nIch habe einen Eigentumsnachweis.'),null);
 assert.equal(intakeClarification(de+'\nIch habe einen Grundbuchauszug.'),null);
 assert.equal(intakeClarification(vi+'\nCó sổ đỏ\nSổ đỏ là gì?'),null,'An explanatory question does not withdraw an already supplied fact');
});


test('asking which document is meant does not establish possession, but a following explicit statement can',()=>{
 const vi='Tôi muốn sang tên đất ở Việt Nam\nĐất đứng tên mẹ tôi\nĐang chuẩn bị, muốn biết thủ tục';
 const de='Ich möchte das Grundstück in Deutschland übertragen\nDie Mutter ist als Eigentümerin eingetragen\nIn Vorbereitung, ich möchte das Verfahren wissen';
 for(const answer of ['Bạn hỏi giấy chứng nhận nào?','Bạn hỏi sổ đỏ hay giấy chứng nhận nào vậy?','Ý bạn hỏi sổ đỏ?']){
  assert.equal(intakeClarification(vi+'\n'+answer)?.key,'property.document',answer);
  assert.equal(intakeClarification(vi+'\nCó sổ đỏ\n'+answer),null,'A clarification question preserves an actual prior fact');
  assert.equal(intakeClarification(vi+'\n'+answer+' Tôi có sổ đỏ.'),null,'An explicit subsequent statement supplies the fact');
 }
 for(const answer of ['Wissen Sie, ob es einen Eigentumsnachweis gibt?','Welchen Eigentumsnachweis meinen Sie?','Was für einen Eigentumsnachweis meinen Sie?']){
  assert.equal(intakeClarification(de+'\n'+answer)?.key,'property.document',answer);
  assert.equal(intakeClarification(de+'\n'+answer+' Ich habe einen Eigentumsnachweis.'),null,'The later declarative sentence is not swallowed by the question');
 }
});
