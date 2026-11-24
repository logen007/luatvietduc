import test from 'node:test';
import assert from 'node:assert/strict';
import {Categories,Tags} from '../src/modules/taxonomy/collections.ts';
import {permalink} from '../src/modules/taxonomy/slug.ts';

test('Vietnamese and German names produce stable ASCII permalinks without URL syntax',()=>{
 for(const [name,expected] of [['Đất đai & nhà ở','dat-dai-nha-o'],['Öffentliches Recht','offentliches-recht'],['  Hồ sơ / giấy tờ?  ','ho-so-giay-to']]){
  assert.equal(permalink(name),expected);assert.equal(permalink(permalink(name)),expected);
 }
 const long=permalink('a'.repeat(159)+' '+'b'.repeat(20));assert.ok(long.length<=160);assert.ok(!long.endsWith('-'));
});
test('native category and tag hooks generate missing slugs and preserve an existing permalink on rename',()=>{
 for(const collection of [Categories,Tags]){
  const normalize=collection.hooks.beforeValidate[0];
  const created=normalize({data:{name:'Tài liệu Đức',slug:''}});assert.equal(created.slug,'tai-lieu-duc');assert.equal(created.name,'Tài liệu Đức');
  const renamed=normalize({data:{name:'Tên mới'},originalDoc:{slug:'stable-address'}});assert.equal(renamed.slug,'stable-address');
  const manual=normalize({data:{name:'Tên mới',slug:'Đường dẫn riêng'},originalDoc:{slug:'stable-address'}});assert.equal(manual.slug,'duong-dan-rieng');
 }
});
test('empty and punctuation-only category/tag slugs fail before persistence',()=>{
 for(const collection of [Categories,Tags])for(const name of ['', '  ', '?! /'])assert.throws(()=>collection.hooks.beforeValidate[0]({data:{name,slug:''}}),/hợp lệ/);
});
