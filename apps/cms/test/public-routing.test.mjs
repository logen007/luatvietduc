import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {publicHref,legacyTarget} from '../src/modules/shared/public-shell.mjs';
import {publicPages,resolvePublicRoute,redirectTarget,positivePage,legacyKeyword} from '../src/modules/public-site/routes.ts';
import {catalogueTopics} from '../src/modules/public-site/search.ts';
import {publicMetadata,privatePaths,sitemapIndex,sitemapDocument,sitemapPageSize} from '../src/modules/public-site/seo.ts';
import {canonicalCopy} from '../src/modules/public-site/Information.tsx';
import {keepsLegacyCopy} from '../src/modules/public-site/legacy-news.ts';
import {News} from '../src/modules/public-site/News.tsx';
import {Home} from '../src/modules/public-site/Home.tsx';
import {Contact} from '../src/modules/public-site/Contact.tsx';
const content=JSON.parse(fs.readFileSync(new URL('../src/modules/public-site/content.json',import.meta.url)));

test('legacy hash navigation preserves searches, filters, context and aliases without external redirects',()=>{
 const cases=[['#/tra-cuu','/thu-vien'],['#/ve-chuyen-trang?muc=doi-ngu','/gioi-thieu#doi-ngu'],['#/chinh-sach-thong-tin','/quyen-rieng-tu'],['#/chu-de/nha-dat/02','/chu-de/nha-o-dat-dai/02'],['#/hoi-dap/old-article','/bai-viet/old-article'],['#/hoi-dap-ai','/tro-chuyen'],['#/thu-vien-quan-tri','/admin/knowledge'],['#/song-o-duc?q=Berlin','/tin-tuc?loai=guide&q=Berlin'],['#/cong-dong','/tin-tuc?nhom=cong-dong'],['#/tin-phap-luat','/tin-tuc']];
 for(const [old,current] of cases)assert.equal(legacyTarget(old),current,old);
 for(const value of ['#section','#//evil.invalid','#/\\evil.invalid','https://evil.invalid'])assert.equal(legacyTarget(value),null,value);
 const query=new URLSearchParams('q=quốc+tịch&linh-vuc=quoc-tich&sap-xep=a-z&trang=2');
 assert.equal(redirectTarget('/tra-cuu',query),'/thu-vien?'+query);
 assert.equal(redirectTarget('/thu-vien',query),null);
 assert.equal(publicHref('/assets/flags/vn.svg'),'/assets/flags/vn.svg');
 assert.equal(legacyKeyword(new URLSearchParams('tinh-huong=uy-quyen')),'ủy quyền');
});

test('public route registry excludes every private area and rejects malformed topic paths',()=>{
 for(const page of publicPages)assert.equal(resolvePublicRoute(page.path)?.kind,page.kind);
 for(const path of ['/admin','/admin/settings','/api/users','/service/me','/auth/google','/health/ready','/tai-khoan','/tro-chuyen','/chu-de/quoc-tich/00','/chu-de/quoc-tich/01/extra','/not-a-page'])assert.equal(resolvePublicRoute(path),null,path);
 assert.equal(resolvePublicRoute('/phap-luat/duc/quoc-tich')?.country,'DE');
 assert.equal(resolvePublicRoute('/thu-vien')?.country,'VN');assert.equal(resolvePublicRoute('/tim-kiem')?.country,'VN');
 assert.equal(resolvePublicRoute('/chu-de/gia-dinh/01')?.group,'hon-nhan-gia-dinh');
 assert.equal(positivePage('100000000'),1);assert.equal(positivePage('NaN'),1);assert.equal(positivePage('2'),2);
});

test('changing news categories keeps the search and resets pagination without restoring the retired type filter',()=>{
 const html=renderToStaticMarkup(createElement(News,{articles:{docs:[],totalDocs:30,totalPages:3,page:2},query:'q=nhà+ở+%26+Berlin&nhom=viec-lam&trang=2&loai=guide',categories:[['viec-lam','Việc làm'],['gia-dinh','Gia đình']]}));
 const navigation=html.match(/<nav class="press-categories"[^>]*>([\s\S]*?)<\/nav>/)?.[1];assert.ok(navigation);
 const links=[...navigation.matchAll(/href="([^"]+)"/g)].map(([,href])=>new URL(href.replaceAll('&amp;','&'),'https://example.invalid'));
 assert.equal(links.length,3);
 links.forEach((url,index)=>{
  assert.equal(url.searchParams.get('q'),'nhà ở & Berlin');
  assert.equal(url.searchParams.get('nhom'),[null,'viec-lam','gia-dinh'][index]);
  assert.equal(url.searchParams.has('trang'),false);assert.equal(url.searchParams.has('loai'),false);
 });
 const form=html.match(/<form class="native-news-search"[^>]*>([\s\S]*?)<\/form>/)?.[1];assert.ok(form);
 assert.match(form,/name="nhom" value="viec-lam"/);assert.doesNotMatch(form,/name="(?:trang|loai)"/);
 const pagination=html.match(/<nav class="pagination"[^>]*>([\s\S]*?)<\/nav>/)?.[1];assert.ok(pagination);
 for(const [,href] of pagination.matchAll(/href="([^"]+)"/g)){
  const url=new URL(href.replaceAll('&amp;','&'),'https://example.invalid');
  assert.equal(url.searchParams.get('q'),'nhà ở & Berlin');assert.equal(url.searchParams.get('nhom'),'viec-lam');assert.equal(url.searchParams.has('loai'),false);
 }
});

test('news category navigation uses clean links when there is no search',()=>{
 const html=renderToStaticMarkup(createElement(News,{articles:{docs:[],totalDocs:0,totalPages:1,page:1},query:'nhom=viec-lam&trang=4',categories:[['gia-dinh','Gia đình']]}));
 const navigation=html.match(/<nav class="press-categories"[^>]*>([\s\S]*?)<\/nav>/)?.[1];assert.ok(navigation);
 assert.match(navigation,/href="\/tin-tuc"/);assert.match(navigation,/href="\/tin-tuc\?nhom=gia-dinh"/);
});
test('legacy situation searches stay visible and survive news category and pagination navigation',()=>{
 const query='tinh-huong=uy-quyen&nhom=viec-lam&trang=2&loai=guide',keyword=legacyKeyword(new URLSearchParams(query));assert.equal(keyword,'ủy quyền');
 const html=renderToStaticMarkup(createElement(News,{articles:{docs:[],totalDocs:30,totalPages:3,page:2},query,categories:[['gia-dinh','Gia đình']]}));
 const form=html.match(/<form class="native-news-search"[^>]*>([\s\S]*?)<\/form>/)?.[1];assert.ok(form);
 assert.match(form,/value="ủy quyền"/,'The search box must show the keyword already used by the server');
 const categories=html.match(/<nav class="press-categories"[^>]*>([\s\S]*?)<\/nav>/)?.[1];assert.ok(categories);
 for(const [,href] of categories.matchAll(/href="([^"]+)"/g)){
  const url=new URL(href.replaceAll('&amp;','&'),'https://example.invalid');assert.equal(url.searchParams.get('q'),keyword);assert.equal(url.searchParams.has('trang'),false);assert.equal(url.searchParams.has('loai'),false);
 }
 const pagination=html.match(/<nav class="pagination"[^>]*>([\s\S]*?)<\/nav>/)?.[1];assert.ok(pagination);
 for(const [,href] of pagination.matchAll(/href="([^"]+)"/g)){
  const url=new URL(href.replaceAll('&amp;','&'),'https://example.invalid');assert.equal(url.searchParams.get('q'),keyword);assert.equal(url.searchParams.get('nhom'),'viec-lam');assert.equal(url.searchParams.has('loai'),false);
 }
});

test('question and contact forms keep entered details out of URLs before hydration',()=>{
 const home=renderToStaticMarkup(createElement(Home,{groups:content.groups,partners:[],news:{docs:[],totalDocs:0,totalPages:1,page:1}}));
 const contact=renderToStaticMarkup(createElement(Contact));
 for(const [label,html] of [['home question',home],['contact message',contact]]){
  const form=html.match(/<form\b[^>]*>/)?.[0];assert.ok(form);
  assert.match(form,/\bmethod="post"/,`${label} must use a body submission if its submit handler is not yet attached`);
 }
});

test('all source catalogue titles and their order survive without invented German topics or answers',()=>{
 const window={};vm.runInNewContext(fs.readFileSync(new URL('../../../assets/catalog-source.js',import.meta.url),'utf8'),{window});
 const original=JSON.parse(JSON.stringify(window.LVD_CATALOG_SOURCE.groups));
 assert.equal(content.groups.length,16);
 content.groups.forEach((group,index)=>{assert.equal(group.id,original[index].id);assert.deepEqual(group.titles,original[index].titles);assert.equal(group.slugs.length,group.count);assert.ok(group.titleDe);});
 const topics=catalogueTopics(content.groups);assert.equal(topics.length,303);assert.equal(new Set(topics.map(topic=>topic.id)).size,303);assert.ok(topics.every(topic=>!('answer' in topic)));
 assert.ok(catalogueTopics(content.groups,'ủy quyền').length>0);assert.ok(catalogueTopics(content.groups,'Erbrecht').some(topic=>topic.groupId==='thua-ke'));
 assert.ok(catalogueTopics(content.groups,'','quoc-tich').every(topic=>topic.groupId==='quoc-tich'));
});

test('preserved policy copy has no active markup and links resolve to native pages',()=>{
 for(const policy of Object.values(content.policies))for(const html of Object.values(policy)){
  assert.doesNotMatch(html,/<script|\son\w+\s*=|javascript:/i);
  const result=canonicalCopy(html);assert.doesNotMatch(result,/href="#\//);assert.ok(result.includes('href="/lien-he"'));
 }
 assert.equal(canonicalCopy('<a href="#section">anchor</a>'),'<a href="#section">anchor</a>');
 assert.equal(content.team.length,9);assert.equal(content.partners.length,13);
});

test('public indexing switch controls metadata without opening private areas',()=>{
 for(const enabled of [false,true]){
  const metadata=publicMetadata({title:'Synthetic',path:'/thu-vien',enabled});assert.equal(metadata.robots.index,enabled);assert.equal(metadata.robots.follow,enabled);assert.match(metadata.alternates.canonical,/\/thu-vien$/);
  assert.equal(publicMetadata({title:'Search',path:'/tim-kiem',enabled,indexable:false}).robots.index,false);
 }
 for(const path of ['/admin','/api','/service','/auth','/tai-khoan','/tro-chuyen'])assert.ok(privatePaths.includes(path));
});

test('sitemap index scales beyond one thousand articles and XML escapes content',()=>{
 const index=sitemapIndex(sitemapPageSize*2+1,'https://example.invalid');assert.equal((index.match(/<sitemap>/g)||[]).length,3);assert.ok(index.includes('/sitemaps/2.xml'));
 const xml=sitemapDocument([{path:'/bai-viet/a?x=1&y=2',updatedAt:'2026-11-04T00:00:00Z'}],'https://example.invalid');assert.ok(xml.includes('&amp;y=2'));assert.ok(xml.includes('<lastmod>2026-11-04T00:00:00.000Z</lastmod>'));
 const empty=sitemapDocument([]);assert.ok(!empty.includes('<url>'));
});

test('public snapshot remains reproducible from the retained sources',async()=>{
 const {importPublicContent}=await import('../scripts/import-public-content.mjs');assert.deepEqual(JSON.parse(JSON.stringify(importPublicContent())),content);
});
test('legacy news fallback is limited to an untouched imported mirror, never a private edit or withdrawal',()=>{
 const seed={title:'Original public title',body:'Original public content',sourceUrl:'https://example.invalid/source',kind:'news',jurisdiction:'DE'};
 const mirror={...seed,_status:'draft',reviewState:'draft',reviewedAt:null,aiAllowed:false};
 assert.equal(keepsLegacyCopy(mirror,seed),true);
 for(const change of [{body:'PRIVATE edited draft'},{title:'PRIVATE title'},{_status:'published'},{reviewState:'withdrawn'},{reviewedAt:'2026-11-04T00:00:00Z'},{aiAllowed:true}])assert.equal(keepsLegacyCopy({...mirror,...change},seed),false);
 assert.equal(keepsLegacyCopy(undefined,seed),false);assert.equal(keepsLegacyCopy(mirror,undefined),false);
});
