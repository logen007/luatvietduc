import {test} from 'node:test';
import assert from 'node:assert/strict';
import {sourceScopes,sourceInScope} from '../src/modules/assistant/scope.ts';
test('shared articles may cover both laws without mandatory visitor classification',()=>{
 assert.deepEqual(sourceScopes('BOTH'),['VN','DE','BOTH']);assert.ok(sourceInScope('BOTH','VN'));assert.ok(sourceInScope('BOTH','DE'));assert.equal(sourceInScope('VN','DE'),false);
 assert.deepEqual(sourceScopes('BOTH','Pháp luật Việt Nam'),['VN','BOTH']);assert.deepEqual(sourceScopes('BOTH','Quốc tịch Đức'),['DE','BOTH']);assert.deepEqual(sourceScopes('BOTH','Việt Nam và Đức'),['VN','DE','BOTH']);
});
test('education in Vietnamese does not imply German law',()=>assert.deepEqual(sourceScopes('BOTH','Giáo dục và lao động'),['VN','DE','BOTH']));
