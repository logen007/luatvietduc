import {test} from 'node:test';
import assert from 'node:assert/strict';
import {withAdminPresentation} from '../src/modules/admin/presentation.ts';
import {Articles} from '../src/modules/content/articles.ts';
import {Media} from '../src/modules/storage/collection.ts';
function behavior(value){if(Array.isArray(value))return value.map(behavior);if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).filter(([key])=>!['label','labels','admin'].includes(key)).map(([key,value])=>[key,behavior(value)]));return value;}
test('admin presentation overrides cannot change collection storage, validation, permissions or hooks',()=>{
 for(const collection of [Articles,Media]){
  const result=withAdminPresentation(collection);
  assert.deepEqual(behavior(result),behavior(collection));
  assert.equal(result.access,collection.access);assert.equal(result.hooks,collection.hooks);
 }
});
