import test from 'node:test';
import assert from 'node:assert/strict';
import {articleAuthorsQuery,ARTICLE_AUTHOR_BATCH_SIZE,createArticleAuthorLoader} from '../src/modules/admin/article-author-loader.ts';

test('article author cells batch distinct IDs and deduplicate the same article within one request',async()=>{
 const calls=[],loader=createArticleAuthorLoader(async ids=>{calls.push([...ids]);return ids.map(id=>({record_id:id,name:'Writer '+id}));});
 const names=Array.from({length:100},(_,index)=>loader.load(String(index+1)));
 assert.equal(loader.load('1'),names[0]);
 assert.deepEqual(await Promise.all(names),Array.from({length:100},(_,index)=>'Writer '+(index+1)));
 assert.equal(calls.length,1);assert.equal(calls[0].length,100);
 assert.equal(await loader.load('1'),'Writer 1');assert.equal(calls.length,1);
});
test('author lookup keeps missing legacy/deleted authors blank and takes attribution from the first creation audit',async()=>{
 assert.match(articleAuthorsQuery,/DISTINCT ON \(e\.record_id\)/);
 assert.match(articleAuthorsQuery,/e\.action='articles\.create'/);
 assert.match(articleAuthorsQuery,/LEFT JOIN users/);
 assert.match(articleAuthorsQuery,/e\.record_id=ANY\(\$1::text\[\]\)/);
 assert.match(articleAuthorsQuery,/ORDER BY e\.record_id,e\.created_at,e\.id/);
 const loader=createArticleAuthorLoader(async()=>[{record_id:'1',name:'Original writer'},{record_id:'2',name:null}]);
 assert.deepEqual(await Promise.all(['1','2','3'].map(id=>loader.load(id))),['Original writer','','']);
});
test('request-scoped loaders do not reuse another request\'s names',async()=>{
 const first=createArticleAuthorLoader(async()=>[{record_id:'1',name:'Before profile edit'}]);
 const second=createArticleAuthorLoader(async()=>[{record_id:'1',name:'After profile edit'}]);
 assert.deepEqual(await Promise.all([first.load('1'),second.load('1')]),['Before profile edit','After profile edit']);
});
test('large render waves use bounded serial batches and settle every lookup',async()=>{
 const calls=[];let active=0,peak=0;
 const loader=createArticleAuthorLoader(async ids=>{calls.push([...ids]);active++;peak=Math.max(peak,active);await Promise.resolve();active--;return ids.map(id=>({record_id:id,name:id}));});
 const names=await Promise.all(Array.from({length:ARTICLE_AUTHOR_BATCH_SIZE*2+7},(_,index)=>loader.load(String(index+1))));
 assert.deepEqual(calls.map(ids=>ids.length),[ARTICLE_AUTHOR_BATCH_SIZE,ARTICLE_AUTHOR_BATCH_SIZE,7]);
 assert.equal(peak,1);assert.equal(names.length,ARTICLE_AUTHOR_BATCH_SIZE*2+7);assert.equal(names.at(-1),String(names.length));
});
test('a failed batch rejects its lookups and does not strand later batches or requests',async()=>{
 let reads=0;
 const loader=createArticleAuthorLoader(async ids=>{if(++reads===1)throw new Error('Synthetic database failure');return ids.map(id=>({record_id:id,name:'Writer '+id}));});
 const lookups=Array.from({length:ARTICLE_AUTHOR_BATCH_SIZE+1},(_,index)=>loader.load(String(index+1)));
 const result=await Promise.allSettled(lookups);
 assert.equal(result.slice(0,ARTICLE_AUTHOR_BATCH_SIZE).every(value=>value.status==='rejected'&&value.reason.message==='Synthetic database failure'),true);
 assert.deepEqual(result.at(-1),{status:'fulfilled',value:'Writer '+(ARTICLE_AUTHOR_BATCH_SIZE+1)});
 assert.equal(await loader.load('later'),'Writer later');
 const another=createArticleAuthorLoader(async()=>[{record_id:'1',name:'Recovered writer'}]);
 assert.equal(await another.load('1'),'Recovered writer');
});
test('lookups arriving during an in-flight batch are drained after that batch',async()=>{
 let release,started;
 const barrier=new Promise(resolve=>{release=resolve;}),start=new Promise(resolve=>{started=resolve;});let reads=0;
 const loader=createArticleAuthorLoader(async ids=>{if(++reads===1){started();await barrier;}return ids.map(id=>({record_id:id,name:id}));});
 const first=loader.load('1');await start;const second=loader.load('2');release();
 assert.deepEqual(await Promise.all([first,second]),['1','2']);assert.equal(reads,2);
});
