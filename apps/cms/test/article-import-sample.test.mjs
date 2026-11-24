import test from 'node:test';
import assert from 'node:assert/strict';
import {articleImportSample} from '../src/modules/content/article-import-sample.ts';
import {MAX_CSV_BYTES,MAX_IMPORT_ROWS,readArticleCSV} from '../src/modules/content/article-csv.ts';

const terms=(prefix,count)=>Array.from({length:count},(_,index)=>({name:'Tên trùng',slug:prefix+'-'+index}));
function validate(categories,tags){
 const rows=readArticleCSV(articleImportSample({categories,tags}));
 assert.ok(rows.length<=MAX_IMPORT_ROWS);
 assert.deepEqual(rows.flatMap(row=>row.errors),[]);
 const categorySlugs=new Set(categories.map(term=>term.slug)),tagSlugs=new Set(tags.map(term=>term.slug));
 for(const row of rows){
  assert.ok(row.categories.length<=50&&row.tags.length<=50);
  assert.ok(row.categories.every(slug=>categorySlugs.has(slug)));
  assert.ok(row.tags.every(slug=>tagSlugs.has(slug)));
 }
 assert.deepEqual(new Set(rows.flatMap(row=>row.categories)),categorySlugs);
 assert.deepEqual(new Set(rows.flatMap(row=>row.tags)),tagSlugs);
 return rows;
}
test('CSV sample remains valid when default tags are removed, renamed or no taxonomy exists',()=>{
 validate([],[]);
 const rows=validate(terms('danh-muc',16),[{name:'Tag riêng',slug:'tag-rieng'}]);
 assert.ok(rows.some(row=>row.language==='de'));
 assert.ok(rows.some(row=>row.kind==='question'));
 assert.ok(rows.every(row=>row.status==='draft'&&!row.aiAllowed));
});
test('large sample packs every current taxonomy term within row and per-article limits',()=>{
 validate(terms('category',250),terms('tag',371));
 validate(terms('category',10000),terms('tag',10000));
});
test('maximum-length valid taxonomy values still produce an uploadable sample',()=>{
 const longTerms=Array.from({length:10000},(_,index)=>({name:'Tên danh mục '.padEnd(160,'a'),slug:String(index).padStart(5,'0')+'-'+ 'a'.repeat(154)}));
 const csv=articleImportSample({categories:longTerms,tags:longTerms.map(term=>({...term,name:term.name.slice(0,100)}))});
 assert.ok(new TextEncoder().encode(csv).length<=MAX_CSV_BYTES);
 const rows=readArticleCSV(csv);assert.ok(rows.length>0&&rows.length<=MAX_IMPORT_ROWS);
 assert.deepEqual(rows.flatMap(row=>row.errors),[]);
 assert.ok(rows.every(row=>row.title.length<=240));
});
