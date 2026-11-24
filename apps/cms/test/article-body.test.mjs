import {test} from 'node:test';
import assert from 'node:assert/strict';
import {isRichBody,editorHTML,sanitizeArticleBody,articleText,articleHTML} from '../src/modules/content/article-body.ts';

const rich=html=>'<div data-lvd-richtext="1">'+html+'</div>';

test('legacy articles remain literal and retain their exact AI text',()=>{
 const body='Điều kiện < 18 và A & B.\r\nDòng tiếp.\r\n\r\n<script>alert("legacy")</script>';
 assert.equal(isRichBody(body),false);
 assert.equal(sanitizeArticleBody(body),body);
 assert.equal(articleText(body),body);
 assert.equal(editorHTML(body),'<p>Điều kiện &lt; 18 và A &amp; B.<br />Dòng tiếp.</p><p>&lt;script&gt;alert(&quot;legacy&quot;)&lt;/script&gt;</p>');
 assert.equal(articleHTML(body),editorHTML(body));
 assert.equal(isRichBody('<p>Unmarked article</p>'),false);
 assert.equal(articleHTML('<p>Unmarked article</p>'),'<p>&lt;p&gt;Unmarked article&lt;/p&gt;</p>');
 for(const empty of [undefined,null,42,{},'']){
  assert.equal(isRichBody(empty),false);assert.equal(articleText(empty),'');assert.equal(articleHTML(empty),'');assert.equal(editorHTML(empty),'');assert.equal(sanitizeArticleBody(empty),'');
 }
});

test('only a leading explicit marker opts into rich HTML and canonicalization is stable',()=>{
 const body="  <DIV data-lvd-richtext='1'><div><h2>Tiêu đề</h2><p><strong>Nội dung</strong></p></div></DIV>";
 assert.equal(isRichBody(body),true);
 const clean=rich('<h2>Tiêu đề</h2><p><strong>Nội dung</strong></p>');
 assert.equal(sanitizeArticleBody(body),clean);
 assert.equal(sanitizeArticleBody(clean),clean);
 assert.equal(articleHTML(clean),clean);
 assert.equal(editorHTML(clean),'<h2>Tiêu đề</h2><p><strong>Nội dung</strong></p>');
 for(const literal of ['before '+rich('<p>text</p>'),'<div data-lvd-richtext="0">text</div>','<div onclick="alert(1)" data-lvd-richtext="1">text</div>'])assert.equal(isRichBody(literal),false);
});

test('rich HTML removes executable content and dangerous attributes without dropping safe text',()=>{
 const body=rich('<p onclick="alert(1)" id="forged">Safe <strong onmouseover="alert(1)">bold</strong></p><script>alert(1)</script><style>body{display:none}</style><iframe src="https://example.invalid">secret frame</iframe><svg onload="alert(1)"><script>alert(2)</script></svg><math><mtext>hidden math</mtext></math><object data="/evil">hidden object</object><template>hidden template</template><img src="/safe.webp" onerror="alert(1)">');
 const clean=sanitizeArticleBody(body);
 assert.match(clean,/<p>Safe <strong>bold<\/strong><\/p>/);
 assert.match(clean,/<img [^>]*src="\/safe.webp"/);
 assert.doesNotMatch(clean,/onerror|onclick|onmouseover|id=|script|<style|<iframe|<svg|<math|<object|<template|alert\(|hidden |secret frame/);
 assert.equal(sanitizeArticleBody(clean),clean);
 assert.equal(articleText(body),'Safe bold');
});

test('links and images reject disguised schemes, protocol-relative URLs and credentials',()=>{
 const unsafe=['javascript:alert(1)','java&#x73;cript:alert(1)','jav&#x09;ascript:alert(1)','data:text/html,evil','blob:https://example.invalid/id','//attacker.invalid/path','/\\attacker.invalid/path','https://user:pass@example.invalid/path','https://user%40example.invalid@attacker.invalid/path','https:attacker.invalid','ftp://example.invalid/path'];
 for(const url of unsafe){
  const clean=sanitizeArticleBody(rich('<p><a href="'+url+'" target="_blank">Link</a><img src="'+url+'"></p>'));
  assert.doesNotMatch(clean,/href=|src=|target=|<img/,'Unsafe URL must not remain: '+url);
  assert.match(clean,/>Link<\/a>/);
 }
 const clean=sanitizeArticleBody(rich('<p><a href="https://example.invalid/path?a=1&amp;b=2" target="_blank" rel="opener">Outside</a> <a href="/bai-viet/topic#part" target="host">Inside</a> <a href="http://example.invalid">HTTP</a></p>'));
 assert.match(clean,/href="https:\/\/example.invalid\/path\?a=1&amp;b=2"/);
 assert.match(clean,/target="_blank" rel="noopener noreferrer"/);
 assert.match(clean,/href="\/bai-viet\/topic#part"/);
 assert.match(clean,/href="http:\/\/example.invalid"/);
 assert.doesNotMatch(clean,/target="host"|rel="opener"/);
});

test('presentation attributes are narrowly bounded rather than accepting arbitrary CSS or dimensions',()=>{
 const clean=sanitizeArticleBody(rich('<h2 style="text-align:center;color:#123abc;position:fixed">Title</h2><span style="color:#abc;background:url(https://attacker.invalid)">Color</span><p style="color:expression(alert(1));text-align:potato">Text</p><img src="/x.webp" width="600" height="4096"><img src="/y.webp" width="999999" height="-1"><table><tr><th colspan="50" rowspan="2">Good</th><td colspan="5000" rowspan="-2">Bad</td></tr></table>'));
 assert.match(clean,/text-align:center/);assert.match(clean,/color:#123abc/);assert.match(clean,/color:#abc/);
 assert.doesNotMatch(clean,/position|background|expression|potato|999999|5000|height="-1"|rowspan="-2"/);
 assert.match(clean,/width="600" height="4096"/);assert.match(clean,/colspan="50" rowspan="2"/);
});

test('AI projection preserves paragraph boundaries, sentence case, list items and table facts',()=>{
 const body=rich('<h2>Điều kiện áp dụng</h2><p>Người dưới <strong>18 tuổi</strong> &amp; người giám hộ.</p><p>Ngoại lệ: phải có đồng ý.<br>Không áp dụng tự động.</p><ol start="3"><li>Chuẩn bị hồ sơ.</li><li>Gửi bản sao.</li></ol><ul><li>Giữ bản gốc.</li></ul><table><thead><tr><th>Loại</th><th>Mức</th></tr></thead><tbody><tr><td>A</td><td>25 euro</td></tr><tr><td>B</td><td>50 euro</td></tr></tbody></table><p><a href="https://example.invalid/source">Nguồn gốc</a></p>');
 const plain=articleText(body);
 assert.match(plain,/^Điều kiện áp dụng\n\nNgười dưới 18 tuổi & người giám hộ\.\n\nNgoại lệ:/);
 assert.ok(plain.includes('Không áp dụng tự động.'));
 for(const required of ['Chuẩn bị hồ sơ.','Gửi bản sao.','Giữ bản gốc.','Loại','Mức','25 euro','50 euro','Nguồn gốc'])assert.ok(plain.includes(required),required);
 assert.doesNotMatch(plain,/<\/?\w|&amp;|https:\/\/example\.invalid|ĐIỀU KIỆN/);
 assert.equal(articleText(sanitizeArticleBody(body)),plain,'Save and read use the same AI projection');
});
