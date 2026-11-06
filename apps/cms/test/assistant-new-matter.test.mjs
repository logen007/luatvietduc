import test from 'node:test';
import assert from 'node:assert/strict';
import {currentIntakeContext,intakeClarification} from '../src/modules/assistant/clarification.ts';
const matters=[
 {topic:'property',base:'Tôi muốn sang tên đất ở Việt Nam, có sổ đỏ đứng tên mẹ tôi, đang chuẩn bị và muốn biết thủ tục',next:'Còn mảnh đất khác tôi định mua ở Đức, thủ tục thế nào?',key:'owner'},
 {topic:'exam',base:'Tôi thi bằng lái tại Đức, đã nộp hôm qua và muốn phúc khảo',next:'Tôi muốn hỏi kỳ thi khác',key:'kind'},
 {topic:'contract',base:'Tôi muốn hỏi thủ tục hợp đồng dịch vụ tại Việt Nam, đã ký hôm qua',next:'Bây giờ tôi muốn hỏi một hợp đồng khác',key:'country'},
 {topic:'property',base:'Ich möchte ein Grundstück in Deutschland übertragen, meine Mutter ist im Grundbuch eingetragen, in Vorbereitung und ich möchte das Verfahren wissen',next:'Ich möchte ein anderes Grundstück kaufen',key:'country'},
 {topic:'exam',base:'Ich möchte Widerspruch zur Führerscheinprüfung in Deutschland einlegen, bereits gestern',next:'Ich habe eine Frage zu einer anderen Prüfung',key:'kind'},
 {topic:'contract',base:'Ich möchte das Verfahren für einen Dienstleistungsvertrag in Deutschland wissen, bereits unterschrieben',next:'Ich möchte einen anderen Vertrag besprechen',key:'country'},
];
for(const item of matters)test('new '+item.topic+' case starts its own facts: '+item.next,()=>{
 assert.equal(intakeClarification(item.base),null);
 const combined=item.base+'\n'+item.next,state=currentIntakeContext(combined);
 assert.equal(state.scope,item.topic+'-2');assert.equal(state.text,item.next);
 assert.equal(intakeClarification(combined)?.key,item.topic+'-2.'+item.key);
});

test('same-case follow-ups and negated new-case wording retain the original facts',()=>{
 const base=matters[0].base;
 for(const next of ['Còn chi phí thì sao?','Vẫn mảnh đất đó, tôi muốn biết giấy tờ','Mảnh đất này không phải mảnh đất khác']){
  assert.equal(currentIntakeContext(base+'\n'+next).scope,'property',next);
  assert.equal(intakeClarification(base+'\n'+next),null,next);
 }
 const exam=matters[4].base+'\nDiese Prüfung, nicht eine andere Prüfung';
 assert.equal(currentIntakeContext(exam).scope,'exam');assert.equal(intakeClarification(exam),null);
});

test('an explicit same-country reference carries location but never old ownership into the next matter',()=>{
 const question=matters[0].base+'\nCòn mảnh đất khác, vẫn ở Việt Nam, tôi muốn mua';
 assert.equal(currentIntakeContext(question).scope,'property-2');
 assert.equal(intakeClarification(question)?.key,'property-2.owner');
 const implicit=matters[0].base+'\nCòn mảnh đất khác, cùng quốc gia, tôi muốn mua';
 assert.equal(intakeClarification(implicit)?.key,'property-2.owner');
});

test('references back to the newly introduced matter do not restart intake repeatedly',()=>{
 const vietnamese=matters[0].base+'\nCòn mảnh đất khác ở Đức, tôi muốn mua và muốn biết thủ tục\nĐất đứng tên cha tôi, có sổ đỏ\nMảnh đất khác đó đang chuẩn bị';
 assert.equal(currentIntakeContext(vietnamese).scope,'property-2');assert.equal(intakeClarification(vietnamese),null);
 const german=matters[3].base+'\nIch möchte ein anderes Grundstück in Vietnam kaufen und das Verfahren wissen\nMein Vater ist im Grundbuch eingetragen\nDas andere Grundstück ist in Vorbereitung';
 assert.equal(currentIntakeContext(german).scope,'property-2');assert.equal(intakeClarification(german),null);
 assert.equal(currentIntakeContext(vietnamese+'\nCòn một mảnh đất khác nữa').scope,'property-3');
});
