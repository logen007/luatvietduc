import {test} from 'node:test';
import assert from 'node:assert/strict';
import {withAdminPresentation} from '../src/modules/admin/presentation.ts';
import {Articles} from '../src/modules/content/articles.ts';
import {Media} from '../src/modules/storage/collection.ts';
import {Knowledge} from '../src/modules/knowledge/collection.ts';
function behavior(value){if(Array.isArray(value))return value.filter(item=>item?.type!=='ui').map(behavior);if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).filter(([key])=>!['label','labels','admin'].includes(key)).map(([key,value])=>[key,behavior(value)]));return value;}
test('admin presentation overrides cannot change collection storage, validation, permissions or hooks',()=>{
 for(const collection of [Articles,Media,Knowledge]){
  const result=withAdminPresentation(collection);
  assert.deepEqual(behavior(result),behavior(collection));
  assert.equal(result.access,collection.access);assert.equal(result.hooks,collection.hooks);
 }
});

test('native knowledge reuses the article rich editor and metadata presentation without public preview',()=>{
 const article=withAdminPresentation(Articles),knowledge=withAdminPresentation(Knowledge),field=(collection,name)=>collection.fields.find(item=>item.name===name);
 assert.deepEqual(knowledge.labels,{singular:'Kiến thức',plural:'Kiến thức AI'});
 assert.equal(field(knowledge,'body').type,'textarea');assert.equal(field(knowledge,'body').admin.components.Field,field(article,'body').admin.components.Field);
 assert.equal(field(knowledge,'title').admin.placeholder,'Tiêu đề kiến thức');assert.equal(knowledge.admin.preview,undefined);
 for(const name of ['categories','tags']){
  const source=field(article,name),result=withAdminPresentation({slug:'knowledge',fields:[source]}).fields[0];
  assert.equal(result.admin.placeholder,source.admin.placeholder);assert.equal(result.label,source.label);assert.equal(result.relationTo,source.relationTo);
 }
});
