import test from 'node:test';
import assert from 'node:assert/strict';
import {asciiFrame} from '../src/modules/shared/locale/ascii.ts';
test('ASCII reveal preserves whitespace, punctuation and the final Vietnamese/German copy',()=>{
 for(const text of ['Giải đáp pháp luật\nViệt Nam và Đức.','Recht in Vietnam\nund Deutschland.']){
  const first=asciiFrame(text,0,()=>0);assert.match(first,/^[A\s.]+$/);
  assert.deepEqual(first.match(/\s|\./g),text.match(/\s|\./g));
  assert.equal(asciiFrame(text,1),text);assert.equal(asciiFrame(text,2),text);
  const middle=asciiFrame(text,.5,()=>0),length=Math.floor(Array.from(text).length/2);
  assert.equal(Array.from(middle).slice(0,length).join(''),Array.from(text).slice(0,length).join(''));
 }
});
