import {test} from 'node:test';
import assert from 'node:assert/strict';
import {answerCitation,customerMetadata} from '../src/modules/knowledge/citations.ts';
import {knowledgeArticleInput} from '../src/modules/knowledge/article-input.ts';
import {eligible} from '../src/modules/assistant/faq.ts';
import {answerRuleInstruction,rulesRevision} from '../src/modules/assistant/rules.ts';
test('private AI citations never publish an internal or external document URL',()=>{
 const source={id:1,title:'Internal knowledge',source_url:'https://example.invalid/reference'};
 assert.deepEqual(answerCitation(source),{id:1,title:'Internal knowledge'});
 assert.equal(answerCitation({...source,article_origin_id:5}).url,source.source_url);
 const metadata={kind:'ai',sources:[{id:1,title:'Source',url:'https://luatvietduc.com/service/knowledge-source/token'}]};
 assert.equal(customerMetadata(metadata).sources[0].url,undefined);assert.ok(metadata.sources[0].url,'Stored history is preserved');
});
test('rule input remains internal, bounded and cannot become source evidence',()=>{
 const user={role:'support',jurisdictions:['VN']};
 assert.equal(knowledgeArticleInput({title:'Policy',body:'Only use approved evidence',entryType:'rule',publish:true},user).entryType,'rule');
 assert.throws(()=>knowledgeArticleInput({title:'Policy',body:'x'.repeat(4001),entryType:'rule'},user));
 assert.throws(()=>knowledgeArticleInput({title:'Policy',body:'Text',entryType:'public'},user));
 assert.equal(eligible({entry_type:'rule',approved:true,_status:'published',effective_from:'2020-01-01',review_due_at:'2030-01-01'}),false);
});
test('operator instructions are distinct from source data and revisions invalidate cached formats',()=>{
 const rules=[{id:1,title:'Policy',body:'Prefer a specialist when facts conflict',updated_at:'2026-11-05'}];
 assert.ok(answerRuleInstruction(rules).includes(rules[0].body));assert.match(answerRuleInstruction(rules),/Không được dùng/);
 assert.notEqual(rulesRevision(rules),rulesRevision([{...rules[0],body:'Changed policy'}]));assert.equal(answerRuleInstruction([]),'');
});
