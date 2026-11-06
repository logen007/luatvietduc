import test from 'node:test';
import assert from 'node:assert/strict';
import {encodeCSV,parseCSV,readArticleCSV,MAX_IMPORT_ROWS} from '../src/modules/content/article-csv.ts';
test('CSV round trips UTF-8 BOM, commas, quotes and multiline article content',()=>{
 const rows=[['title','body'],['Tiêu đề, "mẫu"','Đoạn một\nĐoạn hai']];assert.deepEqual(parseCSV(encodeCSV(rows)),rows);
 const [row]=readArticleCSV(encodeCSV(rows));assert.equal(row.slug,'tieu-de-mau');assert.equal(row.status,'draft');assert.deepEqual(row.errors,[]);
});
test('CSV accepts Excel semicolon exports and rejects malformed/incomplete fields',()=>{
 assert.equal(readArticleCSV('title;body\r\nMẫu;Nội dung')[0].title,'Mẫu');
 for(const text of ['title,body\na,"bad','title,title\na,b','title,unknown\na,b','title\na'])assert.throws(()=>readArticleCSV(text));
 assert.ok(readArticleCSV('title,body\na,b,c')[0].errors.length);
});
test('CSV validates duplicates, taxonomy sets, booleans, URL and publication options',()=>{
 const csv=encodeCSV([['title','body','slug','categories','tags','status','ai_allowed','source_url','language'],['Một','Text','a','parent|child|parent','vietnam|germany','published','true','https://example.invalid/source','de'],['Hai','Text','a','','','bad','yes','javascript:alert(1)','xx']]);
 const [good,bad]=readArticleCSV(csv);assert.deepEqual(good.categories,['parent','child']);assert.equal(good.aiAllowed,true);assert.deepEqual(good.errors,[]);assert.ok(bad.errors.length>=5);
});
test('CSV bounds batch work and ignores empty trailing records',()=>{
 assert.equal(readArticleCSV('title,body\na,b\n\n').length,1);
 assert.throws(()=>readArticleCSV('title,body\n'+Array.from({length:MAX_IMPORT_ROWS+1},(_,i)=>'a'+i+',b').join('\n')),/200/);
 assert.throws(()=>parseCSV('a'.repeat(2*1024*1024+1)),/2 MB/);
});
test('CSV rejects null bytes, excessive taxonomy assignments and excessive columns',()=>{
 assert.ok(readArticleCSV(encodeCSV([['title','body'],['A','B\u0000C']]))[0].errors.length);
 assert.ok(readArticleCSV(encodeCSV([['title','body','tags'],['A','B',Array.from({length:51},(_,i)=>'tag-'+i).join('|')]]))[0].errors.length);
 assert.throws(()=>parseCSV(Array.from({length:12},(_,i)=>'c'+i).join(',')),/cột/);
});
