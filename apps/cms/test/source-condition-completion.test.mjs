import test from 'node:test';
import assert from 'node:assert/strict';
import {completeSourceSelection,validateSelection} from '../src/modules/rag/core.ts';
const answer='Đoạn trả lời mô phỏng giữ nguyên văn của nguồn đã duyệt.';
const condition='Điều kiện mô phỏng: chỉ dùng cho bộ dữ liệu thử này.';
const exception='Ngoại lệ mô phỏng: không được bỏ qua đoạn giới hạn này.';
const source={key:'source-1',sourceId:1,title:'Synthetic',text:[answer,condition,exception].join('\n\n'),revision:'test',score:.99};
const selection=()=>({kind:'answer',passages:[{key:source.key,quote:answer}]});
test('missing conditions are restored verbatim only from a source whose selected paragraph already passed validation',()=>{
 assert.throws(()=>validateSelection(selection(),[source]),/Missing source conditions/);
 const input=selection(),result=completeSourceSelection(input,[source]);
 assert.deepEqual(result.passages.map(p=>p.quote),[answer,condition,exception]);assert.equal(input.passages.length,1);assert.deepEqual(validateSelection(result,[source]),result);
});
test('restoring conditions cannot rescue invented text, wrong keys, duplicates or low scores',()=>{
 for(const input of [{kind:'answer',passages:[{key:'source-1',quote:'Invented legal statement which is absent from the source.'}]},{kind:'answer',passages:[{key:'source-999',quote:answer}]},{kind:'answer',passages:[...selection().passages,...selection().passages]}])assert.throws(()=>completeSourceSelection(input,[source]));
 assert.throws(()=>completeSourceSelection(selection(),[{...source,score:.1}]));
});
test('unused source conditions are not imported and existing conditions are not duplicated',()=>{
 const other={...source,key:'source-2',sourceId:2,text:'Điều kiện từ nguồn khác không được đưa vào câu trả lời.'};
 const result=completeSourceSelection(selection(),[source,other]);assert.equal(result.passages.length,3);assert.ok(result.passages.every(p=>p.key==='source-1'));assert.deepEqual(completeSourceSelection(result,[source,other]),result);
});
test('paragraph count and total answer limits still apply after completion',()=>{
 const many={...source,text:[answer,...Array.from({length:6},(_,i)=>'Điều kiện '+i+': giới hạn mô phỏng phải giữ nguyên văn.')].join('\n\n')};
 assert.throws(()=>completeSourceSelection(selection(),[many]),/Unsupported answer/);
 const long={...source,text:[answer,...Array.from({length:4},(_,i)=>'Điều kiện '+i+': '+('x'.repeat(1900)))].join('\n\n')};
 assert.throws(()=>completeSourceSelection(selection(),[long]),/Answer too long/);
});
