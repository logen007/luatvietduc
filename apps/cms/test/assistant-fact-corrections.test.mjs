import test from 'node:test';
import assert from 'node:assert/strict';
import {intakeClarification} from '../src/modules/assistant/clarification.ts';
const cases=[
 {key:'investment.form',base:'Tôi muốn đầu tư thành lập GmbH tại Đức, đang chuẩn bị và muốn biết thủ tục',withdraw:'À không, chưa biết hình thức đầu tư nào',restore:'Thành lập GmbH',unrelated:'Chưa rõ thủ tục cho hình thức đầu tư GmbH'},
 {key:'residence.purpose',base:'Tôi muốn hỏi thủ tục cư trú ở Đức để làm việc, đang chuẩn bị',withdraw:'Mục đích cư trú chưa rõ',restore:'Để làm việc',unrelated:'Chưa rõ chi phí cư trú'},
 {key:'exam.kind',base:'Tôi thi bằng lái tại Đức, đã nộp hôm qua và muốn phúc khảo',withdraw:'Chưa rõ là kỳ thi nào',restore:'Thi bằng lái',unrelated:'Chưa rõ chi phí thi bằng lái'},
 {key:'property.transaction',base:'Tôi muốn sang tên đất ở Việt Nam, có sổ đỏ đứng tên mẹ tôi, đang chuẩn bị và muốn biết thủ tục',withdraw:'Tôi chưa quyết định mua bán hay sang tên',restore:'Tôi muốn sang tên',unrelated:'Tôi chưa rõ thủ tục sang tên'},
 {key:'investment.form',base:'Ich möchte in Deutschland investieren, eine GmbH gründen, in Vorbereitung, und das Verfahren wissen',withdraw:'Die Investitionsform ist noch unklar',restore:'Eine GmbH gründen',unrelated:'Die Kosten der GmbH sind noch unklar'},
 {key:'residence.purpose',base:'Ich möchte das Verfahren zum Aufenthalt in Deutschland für Arbeit wissen, in Vorbereitung',withdraw:'Der Aufenthaltszweck ist unklar',restore:'Für Arbeit',unrelated:'Die Kosten sind unklar'},
 {key:'exam.kind',base:'Ich möchte Widerspruch zur Führerscheinprüfung in Deutschland einlegen, bereits gestern',withdraw:'Ich weiß nicht, welche Prüfung es ist',restore:'Führerscheinprüfung',unrelated:'Die Kosten der Prüfung sind unklar'},
];
for(const item of cases)test(item.key+' respects a later withdrawal and a later resolution: '+item.withdraw,()=>{
 assert.equal(intakeClarification(item.base),null);
 const followup=intakeClarification(item.base+'\n'+item.withdraw);
 assert.equal(followup?.key,item.key);assert.equal(followup?.retracted,true);
 assert.equal(intakeClarification(item.base+'\n'+item.withdraw+'\n'+item.restore),null);
 assert.equal(intakeClarification(item.base+'\n'+item.unrelated),null);
});

test('German property uncertainty across a dependent-clause comma reopens only the affected fact',()=>{
 const base='Ich möchte ein Grundstück in Deutschland übertragen, meine Mutter ist im Grundbuch eingetragen, in Vorbereitung und ich möchte das Verfahren wissen';
 assert.equal(intakeClarification(base),null);
 for(const withdrawal of ['Ich weiß nicht, ob es einen Eigentumsnachweis gibt.','Ich weiss nicht, ob es einen Eigentumsnachweis gibt.','Ich habe keine Ahnung, ob es einen Eigentumsnachweis gibt.']){
  assert.equal(intakeClarification(base+'\n'+withdrawal)?.key,'property.document',withdrawal);
  assert.equal(intakeClarification(base+'\n'+withdrawal+'\nIch habe den Eigentumsnachweis.'),null);
 }
 for(const withdrawal of ['Ich weiß nicht, wer als Eigentümer eingetragen ist.','Ich weiß nicht, auf wen das Grundstück eingetragen ist.','Ich weiß nicht, ob meine Mutter wirklich als Eigentümerin eingetragen ist.','Ich weiß nicht, wer im Grundbuch eingetragen ist.','Ich weiß nicht, ob meine Mutter im Grundbuch eingetragen ist.']){
  assert.equal(intakeClarification(base+'\n'+withdrawal)?.key,'property.owner',withdrawal);
  assert.equal(intakeClarification(base+'\n'+withdrawal+'\nMeine Mutter ist als Eigentümerin eingetragen.'),null);
 }
 for(const unrelated of ['Ich weiß nicht, welche Kosten der Eigentumsnachweis verursacht.','Ich weiß nicht, wer den Eigentumsnachweis übersetzen soll.']){
  assert.equal(intakeClarification(base+'\n'+unrelated),null,unrelated);
 }
});
