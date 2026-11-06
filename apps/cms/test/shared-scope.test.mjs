import {test} from 'node:test';
import assert from 'node:assert/strict';
import {sourceScopes,sourceInScope} from '../src/modules/assistant/scope.ts';
import {questionWithHistory} from '../src/modules/assistant/conversation-context.ts';
test('shared articles may cover both laws without mandatory visitor classification',()=>{
 assert.deepEqual(sourceScopes('BOTH'),['VN','DE','BOTH']);assert.ok(sourceInScope('BOTH','VN'));assert.ok(sourceInScope('BOTH','DE'));assert.equal(sourceInScope('VN','DE'),false);
 assert.deepEqual(sourceScopes('BOTH','Pháp luật Việt Nam'),['VN','BOTH']);assert.deepEqual(sourceScopes('BOTH','Quốc tịch Đức'),['DE','BOTH']);assert.deepEqual(sourceScopes('BOTH','Việt Nam và Đức'),['VN','DE','BOTH']);
});
test('education in Vietnamese does not imply German law',()=>assert.deepEqual(sourceScopes('BOTH','Giáo dục và lao động'),['VN','DE','BOTH']));

test('a person named Đức cannot widen Vietnamese evidence scope, including short follow-ups',()=>{
 for(const name of ['anh Đức','ông Đức','chị Đức','bạn Duc']){
  const question='Tôi muốn hỏi hợp đồng với '+name+' tại Việt Nam';assert.deepEqual(sourceScopes('BOTH',question),['VN','BOTH'],name);assert.equal(sourceInScope('DE','BOTH',question),false);
  assert.deepEqual(sourceScopes('BOTH',questionWithHistory('Còn chi phí?',question)),['VN','BOTH'],name);
  assert.deepEqual(sourceScopes('BOTH',questionWithHistory('Với '+name+' thì sao?','Hợp đồng tại Việt Nam')),['VN','BOTH'],name);
 }
 assert.deepEqual(sourceScopes('BOTH','Hợp đồng với anh Đức tại Đức'),['DE','BOTH']);
 assert.deepEqual(sourceScopes('BOTH','So sánh Việt Nam và Đức'),['VN','DE','BOTH']);
 assert.deepEqual(sourceScopes('BOTH','Không phải Việt Nam mà tại Đức'),['DE','BOTH']);
});
