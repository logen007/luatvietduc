import {ArticlePhoto} from '../src/modules/public-site/ArticlePhoto.tsx';
import {featuredArticleImage} from '../src/modules/public-site/article-image.ts';
import {articleSummary} from '../src/modules/public-site/article-summary.ts';
import {StructuredData} from '../src/modules/public-site/StructuredData.tsx';
import {photo} from '../src/modules/public-site/photos.ts';
import {Photo} from '../src/modules/public-site/Photo.tsx';
import {articleSchema} from '../src/modules/public-site/seo.ts';
import {AppLink} from '../src/modules/shared/AppLink.tsx';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import * as jsxRuntime from 'react/jsx-runtime';
import {renderToStaticMarkup} from 'react-dom/server';
import {articleParent} from '../src/modules/content/navigation.ts';

const source=fs.readFileSync(new URL('../src/app/(frontend)/bai-viet/[slug]/page.tsx',import.meta.url),'utf8');
const compiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;
async function render(article){
 const exports={};
 vm.runInNewContext(compiled,{exports,process:{cwd:()=>'/synthetic'},require:name=>({
  '../../../../modules/public-site/ArticlePhoto':{ArticlePhoto},'../../../../modules/public-site/article-image':{featuredArticleImage},'react/jsx-runtime':jsxRuntime,'../../../../modules/shared/AppLink':{AppLink},'../../../../modules/public-site/search':{photoForArticle:()=> 'berlin'},
  '../../../../modules/content/article-body':{articleHTML:body=>body,articleText:body=>body},
  '../../../../modules/shared/locale':{LocaleText:({text})=>text,LocaleDate:({value})=>value},
  'next/navigation':{notFound:()=>assert.fail('Synthetic article must exist'),permanentRedirect:()=>assert.fail('No redirect expected')},
  '../../../../modules/content/navigation':{articleParent},
  '../../../../modules/public-site/server':{content:{newsSlugs:[],articleAliases:{}},publicArticle:async()=>article,publicArticleSummary:async()=>articleSummary(article.body)},
  '../../../../modules/public-site/StructuredData':{StructuredData},'../../../../modules/public-site/Photo':{Photo},'../../../../modules/public-site/photos':{photo},'../../../../modules/public-site/seo':{articleSchema},'../../../../modules/public-site/Frame':{PublicFrame:({children})=>children},
  '../../../../modules/shared/presentation-version.mjs':{getPresentationVersion:()=> 'synthetic'},'node:path':{default:{join:(...parts)=>parts.join('/')}},
 }[name]||assert.fail(name))});
 return renderToStaticMarkup(await exports.default({params:Promise.resolve({slug:'synthetic'})}));
}
test('article return navigation preserves German legal jurisdiction and keeps news in news',async()=>{
 for(const [kind,jurisdiction,href] of [['article','DE','/phap-luat/duc'],['question','DE','/phap-luat/duc'],['article','VN','/thu-vien'],['article','BOTH','/thu-vien'],['news','DE','/tin-tuc']]){
  const html=await render({slug:'synthetic',title:'Synthetic title',body:'<p>Body</p>',updatedAt:'2026-11-07',kind,jurisdiction,language:'vi'});
  assert.ok(html.includes('class="live-reading-return" href="'+href+'"'),kind+' '+jurisdiction);
 }
});
test('article heading and body retain their actual content language independently of interface language',async()=>{
 for(const language of ['vi','de']){
  const html=await render({slug:'synthetic',title:'Synthetic title',body:'<p>Body</p>',updatedAt:'2026-11-07',kind:'article',jurisdiction:'DE',language});
  assert.ok(html.includes('<h1 id="article-title" lang="'+language+'">'));
  assert.ok(html.includes('class="live-body" lang="'+language+'"'));
 }
});

test('selected public cover appears at the start of the article, while private media is omitted',async()=>{
 const base={slug:'synthetic',title:'Synthetic cover',body:'<p>Body</p>',updatedAt:'2026-11-09',kind:'article',jurisdiction:'VN',language:'vi'};
 const featuredImage={visibility:'public',mimeType:'image/webp',url:'/api/media/file/cover.webp',width:1200,height:800,alt:'Selected cover'};
 const html=await render({...base,featuredImage});assert.ok(html.includes('class="live-reading-cover"'));assert.ok(html.includes('src="/api/media/file/cover.webp"'));assert.ok(html.includes('alt="Selected cover"'));
 const hidden=await render({...base,featuredImage:{...featuredImage,visibility:'private'}});assert.ok(!hidden.includes('class="live-reading-cover"'));assert.ok(!hidden.includes('/api/media/file/cover.webp'));
});
