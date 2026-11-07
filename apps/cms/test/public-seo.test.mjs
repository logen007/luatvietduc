import test from 'node:test';
import assert from 'node:assert/strict';
import {renderToStaticMarkup} from 'react-dom/server';
import {createElement} from 'react';
import {StructuredData} from '../src/modules/public-site/StructuredData.tsx';
import {canonicalPage,filteredPage,publicMetadata,robotsDocument,articleSchema,pageSchema,jsonLd,sitemapDocument,descriptionText} from '../src/modules/public-site/seo.ts';
import {photo,photoSet} from '../src/modules/public-site/photos.ts';
test('canonical library aliases converge while pagination keeps a separate canonical',()=>{
 assert.equal(canonicalPage('/thu-vien'),'/phap-luat/viet-nam');
 assert.equal(canonicalPage('/phap-luat/viet-nam/quoc-tich'),'/chu-de/quoc-tich');
 assert.equal(canonicalPage('/tin-tuc',new URLSearchParams('trang=2&utm_source=test')),'/tin-tuc?trang=2');
 assert.equal(filteredPage(new URLSearchParams('trang=2&utm_source=test')),false);
 for(const query of ['q=Berlin','linh-vuc=custom','nhom=gia-dinh','sap-xep=a-z'])assert.equal(filteredPage(new URLSearchParams(query)),true);
});
test('robots keeps private entry points closed and honors the owner indexing switch',()=>{
 assert.equal(robotsDocument(false),'User-agent: *\nDisallow: /\n');
 const open=robotsDocument(true);assert.match(open,/Allow: \/\n/);assert.match(open,/Sitemap: https?:\/\//);
 for(const path of ['/admin','/api','/service','/auth','/tai-khoan','/hoi-dap'])assert.ok(open.includes('Disallow: '+path+'\n'));
});
test('article metadata has actual language, social preview and only supplied published translations',()=>{
 const metadata=publicMetadata({title:'Bài mẫu',path:'/bai-viet/mau',description:'Nội dung mẫu',enabled:true,image:'/assets/optimized-photos/family-1440.webp',language:'de',article:{published:'2026-11-01',modified:'2026-11-07'},translations:{vi:'/bai-viet/mau',de:'/bai-viet/beispiel'}});
 assert.equal(metadata.openGraph.type,'article');assert.equal(metadata.openGraph.locale,'de_DE');assert.equal(metadata.twitter.card,'summary_large_image');assert.equal(metadata.robots.index,true);assert.match(metadata.alternates.languages.de,/\/bai-viet\/beispiel$/);
 assert.equal(publicMetadata({title:'Mẫu',path:'/bai-viet/mau'}).alternates.languages,undefined);
});
test('structured data remains parseable with malicious delimiters and describes no invented author',()=>{
 const title='</script><script>alert(1)</script>',schema=articleSchema({title,path:'/bai-viet/test',description:'Body',image:'/image.webp',published:'not-a-date',language:'de',parent:{href:'/thu-vien',label:'Thư viện'}});
 const html=renderToStaticMarkup(createElement(StructuredData,{value:schema}));assert.equal((html.match(/<script/g)||[]).length,1);
 assert.deepEqual(JSON.parse(html.match(/>([\s\S]*)<\/script>/)[1]),schema);
 assert.equal(schema['@graph'][0].datePublished,undefined);assert.equal(schema['@graph'][0].author,undefined);assert.equal(schema['@graph'][0].inLanguage,'de');assert.equal(schema['@graph'][1].itemListElement.length,3);
 assert.equal(JSON.parse(jsonLd({title})).title,title);
 const home=pageSchema({title:'Trang chủ',path:'/',description:'Description',home:true});assert.deepEqual(home['@graph'].map(item=>item['@type']),['Organization','WebSite','WebPage']);
});
test('descriptions stop at word boundaries and duplicate sitemap entries collapse',()=>{
 const text='Nội dung pháp luật được trình bày rõ ràng. '.repeat(10),summary=descriptionText(text,100);assert.ok(summary.length<=100);assert.ok(summary.endsWith('…'));
 const xml=sitemapDocument([{path:'/same'},{path:'/same'}]);assert.equal((xml.match(/<url>/g)||[]).length,1);
});
test('responsive photo dimensions preserve source proportions and exclude the original heavy files',()=>{
 const image=photo('family',960);assert.equal(image.width,960);assert.equal(image.height,1280);assert.match(image.src,/optimized-photos/);assert.ok(photoSet('family').includes('1440w'));assert.equal(photo('unknown').src,photo('berlin').src);
});
