import test from 'node:test';
import assert from 'node:assert/strict';
import {wholeParagraphSelection,validateSelection} from '../src/modules/rag/core.ts';
const text='Dữ liệu kiểm thử: Quy trình mô phỏng gồm tiếp nhận yêu cầu rồi phản hồi.\n\nĐiều kiện của ví dụ mô phỏng: chỉ dùng dữ liệu tự tạo, không dùng hồ sơ thật.';
const evidence=[{key:'source-1',sourceId:1,text,score:.99}];
const condition=text.split('\n\n')[1];
test('a real-model truncated opening is restored from the exact source before strict validation',()=>{
 const raw={kind:'answer',passages:[{key:'source-1',quote:'Quy trình mô phỏng gồm tiếp nhận yêu cầu rồi phản hồi.'},{key:'source-1',quote:condition}]};
 assert.throws(()=>validateSelection(raw,evidence),/Incomplete paragraph/);
 const repaired=wholeParagraphSelection(raw,evidence);assert.equal(validateSelection(repaired,evidence).passages[0].quote,text.split('\n\n')[0]);
 assert.equal(raw.passages[0].quote,'Quy trình mô phỏng gồm tiếp nhận yêu cầu rồi phản hồi.','Repair does not mutate the model payload');
});
test('repair cannot synthesize words, choose ambiguous fragments or omit conditions',()=>{
 for(const quote of ['Một hướng dẫn không có trong nguồn nào ở đây.','Quy trình mô phỏng gồm tiếp nhận yêu cầu rồi phản hồi.']){
  const raw={kind:'answer',passages:[{key:'source-1',quote}]};assert.throws(()=>validateSelection(wholeParagraphSelection(raw,evidence),evidence));
 }
 const repeated=[{key:'source-1',score:.99,text:'Ví dụ một: đây là cụm mô phỏng được lặp trong hai đoạn.\n\nVí dụ hai: đây là cụm mô phỏng được lặp trong hai đoạn.'}];
 const raw={kind:'answer',passages:[{key:'source-1',quote:'đây là cụm mô phỏng được lặp trong hai đoạn.'}]};assert.throws(()=>validateSelection(wholeParagraphSelection(raw,repeated),repeated),/Incomplete paragraph/);
});
test('restoring the source preserves negation and still enforces score and source IDs',()=>{
 const row=[{key:'source-1',score:.99,text:'Không được bỏ các điều kiện đã nêu trong ví dụ mô phỏng này.'}];
 const raw={kind:'answer',passages:[{key:'source-1',quote:'được bỏ các điều kiện đã nêu trong ví dụ mô phỏng này.'}]};
 assert.equal(validateSelection(wholeParagraphSelection(raw,row),row).passages[0].quote,row[0].text);
 assert.throws(()=>validateSelection(wholeParagraphSelection(raw,[{...row[0],score:.1}]),[{...row[0],score:.1}]));
 assert.throws(()=>validateSelection(wholeParagraphSelection({...raw,passages:[{...raw.passages[0],key:'other'}]},row),row));
});
