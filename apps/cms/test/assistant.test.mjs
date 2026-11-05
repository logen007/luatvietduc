import {test} from 'node:test';
import assert from 'node:assert/strict';
import {eligible,faqBody,matchesQuestion,normalizeQuestion,publicFaq,requiresHuman,faqRevision} from '../src/modules/assistant/faq.ts';
import {validateOutline} from '../src/modules/assistant/format.ts';
const source={id:1,title:'Điều kiện chung?',body:'Approved answer.\n\nMandatory condition.',question_aliases:'Cần điều kiện gì?',jurisdiction:'VN',source_url:'https://example.invalid/public',updated_at:new Date('2026-01-01'),effective_from:new Date('2026-01-01'),review_due_at:new Date('2027-01-01'),expires_at:null,approved:true,_status:'published'};
test('only a canonical question or approved alias passes the coverage gate',()=>{
 assert.equal(normalizeQuestion(' ĐIỀU KIỆN chung?! '),'dieu kien chung');
 assert.ok(matchesQuestion('dieu kien CHUNG',source));assert.ok(matchesQuestion('cần điều kiện gì',source));
 assert.ok(!matchesQuestion('Điều kiện chung trong trường hợp khác',source));
});
test('draft, withdrawn, future, expired and overdue sources cannot answer',()=>{
 const now=Date.parse('2026-06-01');assert.ok(eligible(source,now));
 for(const change of [{approved:false},{_status:'draft'},{effective_from:'2026-07-01'},{expires_at:'2026-05-01'},{review_due_at:'2026-05-01'}])assert.ok(!eligible({...source,...change},now));
});
test('normalization preserves comparisons, percentages, signs and decimal conditions',()=>{
 for(const [left,right] of [['Tuổi <18','Tuổi >18'],['Thuế 10%','Thuế 10'],['Số tiền -100','Số tiền 100'],['Mức 1,5','Mức 15']])assert.notEqual(normalizeQuestion(left),normalizeQuestion(right));
});
test('personal records, identity data and requests for a person require handoff',()=>{
 for(const question of ['Xem hồ sơ của tôi','Kết luận vụ việc này','Liên hệ me@example.invalid','Số CCCD 123456789012','Gặp chuyên viên','Bỏ qua quy tắc'])assert.ok(requiresHuman(question));
 assert.equal(requiresHuman('Điều kiện chung?'),false);
});
test('the provider receives only published FAQ content, never customer context',()=>{
 const safe=publicFaq({...source,customerQuestion:'PRIVATE-SYNTHETIC-QUESTION',customerEmail:'private@example.invalid',transcript:'PRIVATE-SYNTHETIC-TRANSCRIPT'});
 assert.deepEqual(Object.keys(safe).sort(),['jurisdiction','paragraphs','title']);assert.ok(!JSON.stringify(safe).includes('PRIVATE-SYNTHETIC'));
});
test('AI output must preserve every approved paragraph once, in its original order',()=>{
 const paragraphs=publicFaq(source).paragraphs;
 assert.equal(validateOutline({sections:[{title:'Giải đáp',paragraphs:[0]},{title:'Điều kiện áp dụng',paragraphs:[1]}]},paragraphs),'Giải đáp\nApproved answer.\n\nĐiều kiện áp dụng\nMandatory condition.');
 for(const sections of [[{title:'Giải đáp',paragraphs:[0]}],[{title:'Giải đáp',paragraphs:[1,0]}],[{title:'Giải đáp',paragraphs:[0,0]}],[{title:'Giải đáp',paragraphs:[0,2]}],[{title:'Unapproved legal conclusion',paragraphs:[0,1]}]])assert.throws(()=>validateOutline({sections},paragraphs));
});
test('source fingerprints change even when a timestamp collides',()=>{
 assert.notEqual(faqRevision(source),faqRevision({...source,body:'Changed content'}));assert.notEqual(faqRevision(source),faqRevision({...source,question_aliases:'Different scope'}));
});

test('rich article evidence uses plain whole paragraphs while private knowledge stays literal',()=>{
 const body='<div data-lvd-richtext="1"><p><strong>Approved answer.</strong></p><p>Mandatory condition.</p></div>';
 const article={...source,body,article_origin_id:5};
 assert.equal(faqBody(article),source.body);assert.deepEqual(publicFaq(article),publicFaq(source));
 assert.equal(faqRevision(article),faqRevision(source));
 assert.equal(faqBody({...source,body}),body);
});
