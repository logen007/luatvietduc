import test from 'node:test';
import assert from 'node:assert/strict';
import {intakeClarification,clarificationHistory} from '../src/modules/assistant/clarification.ts';
test('vague fragments, tests, acknowledgements and unknown requests always ask before retrieval',()=>{
 for(const text of ['Em muốn hỏi một tí','Tôi muốn nhờ tư vấn một chút','nó kiểu như vậy đó','hôm nay trời rất đẹp ngoài phố','Hay','Hay quá','Cảm ơn','hôm nay trời đẹp','nói thế cũng được','Thử','test','???','ok','abc','Tôi muốn','không biết','xin chào','asdfasdf','Sao vậy','nó ấy','giúp tôi với'])assert.ok(intakeClarification(text),text);
});
test('missing facts are not fulfilled by a previously asked question or the old eight-question limit',()=>{
 const asked=Array.from({length:12},(_,i)=>'previous-'+i);
 assert.equal(intakeClarification('Thử',asked).key,'goal');
 assert.equal(intakeClarification('Tôi muốn đầu tư\nkhông biết',['investment.country'],{'investment.country':'không biết'}).key,'investment.country');
 assert.equal(intakeClarification('Tôi muốn đầu tư\nmuốn biết thủ tục',['investment.country'],{'investment.country':'muốn biết thủ tục'}).key,'investment.country');
 const full='Tôi muốn đầu tư thành lập GmbH tại Đức\nđang chuẩn bị\nmuốn biết thủ tục và chi phí';assert.equal(intakeClarification(full),null);
});
test('followups collect the next relevant missing fact and respect country corrections',()=>{
 assert.equal(intakeClarification('Tôi muốn hỏi điều kiện thế chấp tài sản tại Việt Nam?').key,'property.timeline');
 assert.equal(intakeClarification('Tôi muốn đầu tư tại Đức\nthành lập GmbH').key,'investment.timeline');
 assert.equal(intakeClarification('Tôi muốn đầu tư tại Đức\nthành lập GmbH\nđang chuẩn bị').key,'investment.goal');
 assert.equal(intakeClarification('Tôi muốn đầu tư tại Đức\nkhông phải ở Đức, chưa biết nước nào').key,'investment.country');
 assert.match(intakeClarification('Ich möchte').text,/möchten/);
});
test('history binds actual replies to the pending question rather than treating asked keys as facts',()=>{
 const rows=[{role:'assistant',body:'When?',metadata:{kind:'clarify',clarificationKey:'investment.timeline'}},{role:'user',body:'thành lập GmbH'},{role:'assistant',body:'Form?',metadata:{kind:'clarify',clarificationKey:'investment.form'}},{role:'user',body:'ở Đức'},{role:'assistant',body:'Country?',metadata:{kind:'clarify',clarificationKey:'investment.country'}},{role:'user',body:'Tôi muốn đầu tư'}];
 const history=clarificationHistory(rows,'consent');assert.deepEqual(history.answers,{'investment.country':'ở Đức','investment.form':'thành lập GmbH'});assert.equal(history.pendingKey,'investment.timeline');
});
test('explicit not-started stages are facts, while uncertainty still needs clarification',()=>{
 for(const stage of ['chưa thực hiện','chưa ký','vừa ký','mới nộp'])assert.equal(intakeClarification('Tôi muốn đầu tư thành lập GmbH tại Đức\n'+stage+'\nmuốn biết thủ tục'),null,stage);
 assert.equal(intakeClarification('Tôi muốn đầu tư thành lập GmbH tại Đức\nchưa biết khi nào\nmuốn biết thủ tục').key,'investment.timeline');
 assert.equal(intakeClarification('Ich möchte in Deutschland investieren\nGründung einer GmbH\nnoch nicht begonnen\nIch möchte das Verfahren wissen'),null);
});
test('a factual family relationship is accepted even when its words resemble conversational filler',()=>{
 assert.equal(intakeClarification('Tôi muốn hỏi việc ly hôn tại Đức, tài sản liên quan\nđang chuẩn bị\nanh chị em',['family.parties'],{'family.parties':'anh chị em'}),null);
});

test('family parties supplied in the initial situation do not need a duplicate question',()=>{
 assert.equal(intakeClarification('Tôi muốn hỏi việc ly hôn tại Đức, tài sản liên quan đến anh chị em, đang chuẩn bị'),null);
 assert.equal(intakeClarification('Tôi muốn hỏi việc ly hôn tại Đức, tài sản liên quan, đang chuẩn bị, chưa biết các bên là ai').key,'family.parties');
});
