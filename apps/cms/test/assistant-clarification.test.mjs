import test from 'node:test';
import assert from 'node:assert/strict';
import {initialClarification,clarificationText,detailKinds} from '../src/modules/assistant/clarification.ts';
import {validateSelection} from '../src/modules/rag/core.ts';
test('incomplete requests and bare topics ask a question before retrieval or handoff',()=>{
 for(const text of ['tôi muốn','Tôi cần hỏi','tôi đang cần hỏi','Xin chào','thế chấp tài sản','tôi muốn hỏi về thế chấp tài sản','ich möchte','Ich habe eine Frage zum Aufenthalt'])assert.ok(initialClarification(text),text);
 for(const text of ['Điều kiện thế chấp tài sản tại Việt Nam là gì?','Tôi cần chuẩn bị giấy tờ gì để đăng ký kết hôn?','Welche Voraussetzungen gelten für die Einbürgerung?'])assert.equal(initialClarification(text),null,text);
 assert.match(initialClarification('ich möchte'),/möchten/);
});
test('clarification only allows predefined context questions, never generated legal answers',()=>{
 for(const detail of detailKinds){assert.deepEqual(validateSelection({kind:'clarify-details',detail,answer:'untrusted legal answer'},[]),{kind:'clarify-details',detail});assert.ok(clarificationText(detail,'tôi muốn'))}
 for(const detail of [undefined,'send-passport','invented'])assert.throws(()=>validateSelection({kind:'clarify-details',detail},[]),/Unsupported clarification/);
});
