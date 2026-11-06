import test from 'node:test';
import assert from 'node:assert/strict';
import {intakeClarification,clarificationHistory,currentIntakeContext} from '../src/modules/assistant/clarification.ts';
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
test('asking about a date or deadline does not supply that date or deadline',()=>{
 for(const answer of ['chưa biết ngày nào','không rõ thời hạn','chưa biết tháng nào'])assert.equal(intakeClarification('Tôi muốn đầu tư thành lập doanh nghiệp ở Đức\nmuốn biết thủ tục\n'+answer)?.key,'investment.timeline',answer);
 assert.equal(intakeClarification('Ich möchte in Deutschland investieren\nGründung einer GmbH\nIch möchte das Verfahren wissen\nDie Frist ist noch unklar')?.key,'investment.timeline');
 for(const answer of ['ngày 15/11/2026','tháng sau','đang chuẩn bị, chưa biết ngày nào'])assert.equal(intakeClarification('Tôi muốn đầu tư thành lập doanh nghiệp ở Đức\nmuốn biết thủ tục\n'+answer),null,answer);
});

test('land conversation recognizes ordinary wording, follows the customer and avoids the repeated generic goal',()=>{
 const opening=intakeClarification('Về đất đai',['goal']);assert.equal(opening.key,'property.country');assert.match(opening.text,/mảnh đất/);
 const fragment='Về đất đai\nĐất của tôi ấy';
 const followup=intakeClarification(fragment,['goal','property.country'],{'property.country':'Đất của tôi ấy'});
 assert.equal(followup.key,'property.country');assert.notEqual(followup.text,opening.text);assert.match(followup.text,/Việt Nam, Đức/);
 const located=fragment+'\nỞ Hà Nội, Việt Nam';assert.equal(intakeClarification(located).key,'property.transaction');
 const goal=located+'\nTôi muốn sang tên';assert.equal(intakeClarification(goal).key,'property.ownership');
 const owner=goal+'\nĐất đang đứng tên tôi';assert.match(intakeClarification(owner).text,/đã có sổ/);
 const papers=goal+'\nCó sổ đỏ';assert.match(intakeClarification(papers).text,/Ai đang đứng tên/);
 const facts=goal+'\nSổ đỏ đang đứng tên tôi';assert.equal(intakeClarification(facts).key,'property.timeline');
 assert.equal(intakeClarification(facts+'\nChưa thực hiện, muốn biết thủ tục'),null);
});

test('Vietnam followed by a first-person turn is not mistaken for next year',()=>{
 assert.equal(intakeClarification('Về đất đai\nỞ Việt Nam\nTôi muốn sang tên\nSổ đỏ đang đứng tên tôi').key,'property.timeline');
 assert.equal(intakeClarification('Về đất đai ở Việt Nam tôi muốn sang tên, sổ đỏ đang đứng tên tôi').key,'property.timeline');
});

test('exam fragments ask about the exam and do not mistake the Vietnamese conjunction for an exam',()=>{
 assert.equal(intakeClarification('Tôi thi mãi không được').key,'exam.kind');assert.equal(intakeClarification('Thi không đỗ').key,'exam.kind');
 assert.match(intakeClarification('Tôi thi mãi không được\nThi không đỗ',['exam.kind']).text,/đơn vị nào/);
 assert.notEqual(intakeClarification('Tôi thì muốn mua bảo hiểm').key,'exam.kind');
 assert.equal(intakeClarification('Tôi thi telc B1 tại Đức\nmuốn phúc khảo\nvừa thi hôm qua'),null);
});

test('Vietnamese remaining/follow-up wording does not invent a child as a party',()=>{
 for(const [context,key] of [['Tôi muốn hỏi về ly hôn tại Đức\nvề tài sản\nchưa ký','family.parties'],['Tôi muốn hỏi về thừa kế tại Đức\nphân chia di sản\nchưa ký','inheritance.parties']]){
  for(const reply of ['còn gì nữa?','còn thiếu gì?','Còn vấn đề nào khác không?'])assert.equal(intakeClarification(context+'\n'+reply)?.key,key,reply);
  assert.equal(intakeClarification(context+'\ncon tôi'),null,'An actual child relationship still supplies the party fact');
 }
});

test('a Vietnamese person named Đức does not supply the contract jurisdiction',()=>{
 for(const name of ['anh Đức','chị Đức','ông Đức','bạn Duc']){
  const context='Tôi muốn hỏi hợp đồng với '+name;assert.equal(currentIntakeContext(context).countryKnown,false,name);assert.equal(intakeClarification(context)?.key,'contract.country',name);
  assert.equal(currentIntakeContext(context+' tại Việt Nam').countryKnown,true);
 }
 for(const country of ['Đức','tại Đức','ở Đức'])assert.equal(currentIntakeContext('Tôi muốn hỏi hợp đồng\n'+country).countryKnown,true,country);
});

test('a later concrete relationship resolves earlier uncertainty while explicit party corrections reopen intake',()=>{
 for(const [context,unclear,facts] of [
  ['Tôi muốn hỏi về ly hôn tại Đức\nvề tài sản\nchưa ký','chưa rõ các bên là ai','vợ chồng'],
  ['Ich möchte zur Scheidung in Deutschland fragen\nFragen zu Vermögen\nin Vorbereitung','Die Beteiligten sind noch unklar','Ehepartner'],
 ]){
  assert.equal(intakeClarification(context+'\n'+unclear)?.key,'family.parties');
  assert.equal(intakeClarification(context+'\n'+unclear+'\n'+facts),null,'The latest factual relationship resolves the earlier uncertainty');
  assert.equal(intakeClarification(context+'\n'+facts+'\n'+unclear)?.key,'family.parties','A later explicit uncertainty reopens the party question');
 }
});

test('later land ownership and paper facts resolve uncertainty independently in VI and DE',()=>{
 const context='Về đất đai ở Việt Nam\nTôi muốn sang tên\nChưa rõ đất đứng tên ai và có sổ chưa\nSổ đỏ đang đứng tên mẹ\nChưa thực hiện, muốn biết thủ tục';
 assert.equal(intakeClarification(context),null,'New ownership/paper facts must replace the old uncertainty');
 assert.match(intakeClarification(context+'\nChưa rõ giấy chứng nhận').text,/đã có sổ/,'Only the withdrawn paper fact is requested');
 assert.match(intakeClarification(context+'\nChưa rõ ai đang đứng tên').text,/Ai đang đứng tên/,'Only the withdrawn owner fact is requested');
 assert.equal(intakeClarification(context+'\nChưa rõ thủ tục'),null,'An unrelated uncertainty cannot erase known ownership facts');
 assert.equal(intakeClarification('Ich möchte das Grundstück in Deutschland übertragen\nEigentümer und Nachweis sind unklar\nDie Mutter ist im Grundbuch eingetragen\nNoch nicht begonnen, ich möchte das Verfahren wissen'),null);
});

test('short German exam fragments receive a German intake question',()=>{
 for(const question of ['Prüfung nicht bestanden','Führerscheinprüfung','Durchgefallen']){
  const next=intakeClarification(question);assert.ok(next,question);assert.match(next.text,/Prüfung|Thema|Land/);assert.ok(!/Bạn|Việc/.test(next.text));
 }
});
test('conversational topic changes reset the intake rather than continuing the old topic',()=>{
 for(const shift of ['Còn ly hôn thì sao?','Thế còn ly hôn?','Vậy còn ly hôn?']){
  const next=intakeClarification('Tôi muốn đầu tư tại Đức\n'+shift);assert.equal(next?.key,'family.country',shift);
 }
 assert.equal(intakeClarification('Ich möchte in Deutschland investieren\nUnd Scheidung?')?.key,'family.country');
});
test('later explicit timing uncertainty supersedes old timing but unrelated uncertainty does not',()=>{
 const prefix='Tôi muốn sang tên đất tại Việt Nam\nĐất đứng tên mẹ, có sổ đỏ\nChưa thực hiện\nTôi muốn biết thủ tục';
 assert.equal(intakeClarification(prefix),null);
 for(const correction of ['À không, tôi chưa rõ thời điểm','Chưa xác định ngày thực hiện'])assert.equal(intakeClarification(prefix+'\n'+correction)?.key,'property.timeline',correction);
 assert.equal(intakeClarification(prefix+'\nTôi không rõ chi phí'),null);
 assert.equal(intakeClarification(prefix+'\nChưa rõ thời điểm\nDự kiến tháng sau'),null);
 const german='Ich möchte in Deutschland investieren und eine GmbH gründen, in Vorbereitung, und das Verfahren wissen';
 assert.equal(intakeClarification(german+'\nDer Zeitpunkt ist noch unklar')?.key,'investment.timeline');
});
