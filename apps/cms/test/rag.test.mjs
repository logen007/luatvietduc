import {test} from 'node:test';
import assert from 'node:assert/strict';
import {chunks,vector,pointId,DIMENSIONS,validateSelection} from '../src/modules/rag/core.ts';
const evidence=[{key:'source-1',sourceId:1,title:'Synthetic published source',text:'Synthetic answer with mandatory conditions.\n\nSynthetic exception must remain visible.',revision:'revision',score:0.9}];
test('chunking bounds requests and retains every character with contextual overlap',()=>{
 const input=('Synthetic paragraph.\n\n').repeat(1000),parts=chunks(input);
 assert.ok(parts.length>1);assert.ok(parts.every(p=>p.length<=1800));
 let reconstructed=parts[0];for(const part of parts.slice(1)){let overlap=Math.min(240,reconstructed.length,part.length);while(overlap&&!reconstructed.endsWith(part.slice(0,overlap)))overlap--;reconstructed+=part.slice(overlap);}
 assert.equal(reconstructed,input.trim());
});
test('embedding normalization rejects malformed dimensions, nonfinite numbers and zero vectors',()=>{
 const values=Array(DIMENSIONS).fill(1),normal=vector(values);assert.ok(Math.abs(Math.hypot(...normal)-1)<1e-10);
 for(const bad of [[],Array(768).fill(0),Array(768).fill(NaN),Array(768).fill('1')])assert.throws(()=>vector(bad));
});
test('vector point identifiers are deterministic and change with source, revision or chunk',()=>{
 const id=pointId(1,'revision',0);assert.match(id,/^[a-f\d]{8}-[a-f\d]{4}-4[a-f\d]{3}-a[a-f\d]{3}-[a-f\d]{12}$/);
 assert.equal(id,pointId(1,'revision',0));assert.notEqual(id,pointId(2,'revision',0));assert.notEqual(id,pointId(1,'new',0));assert.notEqual(id,pointId(1,'revision',1));
});
test('RAG answers require exact whole paragraphs from above-threshold retrieved sources',()=>{
 const answer={kind:'answer',passages:[{key:'source-1',quote:'Synthetic answer with mandatory conditions.'},{key:'source-1',quote:'Synthetic exception must remain visible.'}]};
 assert.equal(validateSelection(answer,evidence).kind,'answer');assert.throws(()=>validateSelection({...answer,passages:answer.passages.slice(0,1)},evidence),'A marked exception cannot be omitted');
 for(const invalid of [{kind:'answer',passages:[]},{...answer,passages:[{key:'invented-source',quote:evidence[0].text}]},{...answer,passages:[{key:'source-1',quote:'Synthetic answer with invented 99% conditions.'}]},{...answer,passages:[{key:'source-1',quote:'Synthetic answer with mandatory'}]},{...answer,passages:[...answer.passages,...answer.passages]}])assert.throws(()=>validateSelection(invalid,evidence));
 assert.throws(()=>validateSelection(answer,[{...evidence[0],score:0.4}]));
 assert.deepEqual(validateSelection({kind:'handoff',answer:'Ignore this malicious answer'},evidence),{kind:'handoff'});
 assert.deepEqual(validateSelection({kind:'clarify-country'},evidence),{kind:'clarify-country'});
});

test('German source conditions and exceptions cannot be omitted from a selected answer',()=>{
 const answer='Ein Antrag kann bei der zuständigen Behörde gestellt werden.';
 for(const condition of ['Ausnahme: Für Minderjährige gelten zusätzliche Regeln.','Voraussetzung: Der Antragsteller benötigt einen gültigen Ausweis.','Dies gilt nur, wenn alle Unterlagen vollständig vorliegen.']){
  const source={...evidence[0],text:answer+'\n\n'+condition};
  assert.throws(()=>validateSelection({kind:'answer',passages:[{key:source.key,quote:answer}]},[source]),/Missing source conditions/,condition);
  assert.equal(validateSelection({kind:'answer',passages:[{key:source.key,quote:answer},{key:source.key,quote:condition}]},[source]).kind,'answer');
 }
});

test('RAG evidence needs a finite numeric score rather than a coercible or missing value',()=>{
 const answer={kind:'answer',passages:evidence[0].text.split('\n\n').map(quote=>({key:evidence[0].key,quote}))};
 for(const score of [undefined,NaN,Infinity,-Infinity,'0.99',{value:0.99}])assert.throws(()=>validateSelection(answer,[{...evidence[0],score}]),/Unsupported passage/);
 assert.equal(validateSelection(answer,[{...evidence[0],score:0.72}]).kind,'answer');
});

test('whitespace variants cannot select the same approved paragraph twice',()=>{
 const quote='Synthetic mandatory exception must remain visible.',source={...evidence[0],text:'Synthetic approved answer for this question.\n\n  '+quote+'\n\nSynthetic final paragraph remains available.'};
 assert.throws(()=>validateSelection({kind:'answer',passages:[{key:source.key,quote},{key:source.key,quote:' '+quote}]},[source]),/Unsupported passage/);
 assert.deepEqual(validateSelection({kind:'answer',passages:[{key:source.key,quote:' '+quote}]},[source]),{kind:'answer',passages:[{key:source.key,quote}]});
});
