import test from 'node:test';
import assert from 'node:assert/strict';
import {importPreview,importReceipt} from '../src/modules/content/article-import-client.ts';

const row={row:2,title:'Bài thử',slug:'bai-thu',status:'draft',action:'create',errors:[]};
test('malformed preview responses fail before supplying rendering or import state',()=>{
 for(const value of [null,{},[],{rows:null},{rows:{}},{rows:[]},{rows:[null]},{rows:[{...row,errors:null}]},{rows:[{...row,errors:[{}]}]},{rows:[{...row,action:'done'}]},{rows:Array.from({length:201},()=>row)}])
  assert.throws(()=>importPreview(value),/Chưa đọc được kết quả/);
 assert.deepEqual(importPreview({rows:[row]}),[row]);
 const invalid={...row,action:'error',errors:['Danh mục không tồn tại.']};
 assert.deepEqual(importPreview({rows:[invalid]}),[invalid]);
});
test('partial import acknowledgements cannot display a false completed result',()=>{
 for(const value of [null,{},[],{created:[]},{created:[],skipped:0},{created:[],skipped:2},{created:null,skipped:0},{created:[{}],skipped:0},{created:[{id:0,title:'Bài thử'}],skipped:0},{created:[],skipped:-1},{created:[],skipped:201}])
  assert.throws(()=>importReceipt(value,1),/Kiểm tra danh sách bài viết trước khi thử lại/);
 assert.deepEqual(importReceipt({created:[{id:12,title:'Bài thử'}],skipped:2},3),{created:[{id:12,title:'Bài thử'}],skipped:2});
 assert.deepEqual(importReceipt({created:[],skipped:1},1),{created:[],skipped:1},'A row concurrently created elsewhere can be skipped instead');
});
