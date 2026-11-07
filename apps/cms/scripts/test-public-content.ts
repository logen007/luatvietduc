import assert from 'node:assert/strict';
import type {Payload} from 'payload';
import type {User} from '../src/payload-types';
import {publicArticle,publicArticleList,publicSiteSettings,publicLegacyNews} from '../src/modules/public-site/server';
import {pool} from '../src/modules/shared/db';
import {pageMetadata} from '../src/modules/public-site/Page';
import {GET as sitemapIndex} from '../src/app/sitemap.xml/route';
import {GET as sitemapPart} from '../src/app/sitemaps/[file]/route';
import {generateMetadata as articleMetadata} from '../src/app/(frontend)/bai-viet/[slug]/page';
export async function testPublicContent(payload:Payload,owner:User){
 const db=new URL(process.env.DATABASE_URL||'');if(!['localhost','127.0.0.1'].includes(db.hostname)||db.pathname!=='/lvd_test')throw new Error('Isolated public content test only');
 const suffix=crypto.randomUUID(),title='Synthetic native '+suffix,ids:number[]=[];
 const settings=await payload.findGlobal({slug:'site-settings',overrideAccess:true});
 const category=await payload.create({collection:'categories',overrideAccess:false,user:owner,data:{name:title,slug:'native-'+suffix}});
 try{
  const legacy=(await publicLegacyNews())[0];
  assert.ok(legacy,'Expected unchanged imported public news in the isolated fixture database');
  if(legacy){
   const original=(await payload.find({collection:'articles',overrideAccess:true,where:{slug:{equals:legacy.id}},limit:1,depth:0})).docs[0];
   try{
    await pool.query('UPDATE articles SET body=$2 WHERE id=$1',[original.id,'PRIVATE synthetic edit '+suffix]);
    assert.ok(!(await publicLegacyNews()).some(story=>story.id===legacy.id),'A changed draft must not fall back to old public news');
    await pool.query("UPDATE articles SET body=$2,review_state='withdrawn' WHERE id=$1",[original.id,original.body]);
    assert.ok(!(await publicLegacyNews()).some(story=>story.id===legacy.id),'Withdrawn news must not fall back');
   }finally{await pool.query('UPDATE articles SET body=$2,review_state=$3,updated_at=$4 WHERE id=$1',[original.id,original.body,original.reviewState,original.updatedAt]);}
  }
  const create=async(slug:string,published:boolean,kind:'article'|'news'='article',body?:string)=>{
   const article=await payload.create({collection:'articles',overrideAccess:false,user:owner,data:{title:title+' '+slug,slug:slug+'-'+suffix,body:body??(published?'PUBLIC ':'PRIVATE ')+suffix,categories:[category.id],jurisdiction:'VN',language:'vi',kind,_status:published?'published':'draft',reviewState:published?'approved':'draft',aiAllowed:false}});
   ids.push(article.id);return article;
  };
  const visible=await create('published',true),draft=await create('draft',false),withdrawn=await create('withdrawn',true),news=await create('news',true,'news');
  await payload.update({collection:'articles',id:withdrawn.id,overrideAccess:false,user:owner,data:{reviewState:'withdrawn'}});
  assert.equal((await publicArticle(visible.slug))?.id,visible.id);assert.equal(await publicArticle(draft.slug),null);assert.equal(await publicArticle(withdrawn.slug),null);
  const legal=await publicArticleList({query:suffix,group:category.slug});assert.deepEqual(legal.docs.map(doc=>doc.id),[visible.id]);
  assert.equal(legal.docs[0].category?.href,'/phap-luat/viet-nam?'+new URLSearchParams({'linh-vuc':category.slug}),'Custom category cards must link to the supported filter route');
  assert.deepEqual((await publicArticleList({kind:'news',query:suffix})).docs.map(doc=>doc.id),[news.id]);
  assert.equal((await publicArticleList({query:suffix,country:'DE'})).totalDocs,0);
  await payload.update({collection:'articles',id:visible.id,overrideAccess:false,user:owner,data:{jurisdiction:'BOTH'}});
  const germanBoth=await publicArticleList({query:suffix,country:'DE'});
  assert.deepEqual(germanBoth.docs.map(doc=>doc.id),[visible.id]);
  assert.equal(germanBoth.docs[0].category?.href,'/phap-luat/duc?'+new URLSearchParams({'linh-vuc':category.slug}),'A BOTH article keeps the selected German library context');
  await payload.update({collection:'articles',id:visible.id,overrideAccess:false,user:owner,data:{jurisdiction:'VN'}});
  const zebra=await create('zebra-sort',true),alpha=await create('alpha-sort',true);
  const sorted=await publicArticleList({query:suffix,group:category.slug,order:'a-z',limit:1,page:1});
  const next=await publicArticleList({query:suffix,group:category.slug,order:'a-z',limit:1,page:2});
  assert.equal(sorted.docs[0].id,alpha.id);assert.equal(next.docs[0].id,visible.id);
  assert.ok(zebra.id!==alpha.id);

  const richBody='<div data-lvd-richtext="1"><p>'+suffix+' quốc <strong>tịch</strong> Đức.</p><p>'+suffix+' gia đình</p><p>tài sản.</p><p>'+suffix+' A &amp; B &lt; 18.</p><p>'+suffix+' literal %_!</p><p>'+suffix+' Không&nbsp;gian.</p></div>';
  const rich=await create('rich-search',true,'article',richBody),privateRich=await create('private-rich-search',false,'article',richBody),withdrawnRich=await create('withdrawn-rich-search',true,'article',richBody);
  await payload.update({collection:'articles',id:withdrawnRich.id,overrideAccess:false,user:owner,data:{reviewState:'withdrawn'}});
  for(const phrase of ['quốc tịch Đức','gia đình tài sản','A & B < 18','literal %_!','Không gian']){
   const found=await publicArticleList({query:suffix+' '+phrase,group:category.slug});
   assert.deepEqual(found.docs.map(doc=>doc.id),[rich.id],'Visible phrases match across rich formatting, entities and paragraph boundaries');
   assert.equal(found.totalDocs,1);assert.equal(found.totalPages,1);assert.equal(found.page,1);
   assert.ok(!found.docs.some(doc=>doc.id===privateRich.id||doc.id===withdrawnRich.id));
   assert.doesNotMatch(found.docs[0].summary,/<\/?(?:div|p|strong)\b|&amp;|&lt;/);
  }
  assert.equal((await publicArticleList({query:suffix+' quốc tịch Đức',country:'DE'})).totalDocs,0,'Country filters still apply after the SQL candidate search');
  assert.equal((await publicArticleList({kind:'news',query:suffix+' quốc tịch Đức'})).totalDocs,0,'Kind filters still apply after the SQL candidate search');
  const literal=await create('legacy-literal-search',true,'article',suffix+' literal <strong>tag</strong>');
  assert.deepEqual((await publicArticleList({query:suffix+' literal <strong>tag</strong>'})).docs.map(doc=>doc.id),[literal.id],'Unmarked legacy HTML-looking text remains literal');
  assert.equal((await publicArticleList({query:suffix+' literal tag'})).totalDocs,0,'Legacy bodies are never stripped as rich HTML');
  const counts=await publicArticleList({query:suffix,group:category.slug,limit:1,page:2});
  assert.equal(counts.totalDocs,5);assert.equal(counts.totalPages,5);assert.equal(counts.docs.length,1);assert.equal(counts.page,2);
  const articleMeta=await articleMetadata({params:Promise.resolve({slug:rich.slug})});
  assert.ok(String(articleMeta.description).includes('quốc tịch Đức'));
  assert.doesNotMatch(String(articleMeta.description),/<\/?(?:div|p|strong)\b|&amp;|&lt;/);

  for(const enabled of [false,true]){
   await payload.updateGlobal({slug:'site-settings',overrideAccess:false,user:owner,data:{publicIndexingEnabled:enabled}});
   assert.equal((await publicSiteSettings()).publicIndexingEnabled,enabled);
   const metadata=await pageMetadata('/thu-vien',new URLSearchParams());assert.equal((metadata.robots as {index:boolean}).index,enabled);
   assert.equal(((await pageMetadata('/tim-kiem',new URLSearchParams('q='+suffix))).robots as {index:boolean}).index,false);
   const index=await (await sitemapIndex()).text();assert.equal(index.includes('<sitemap>'),enabled);
   const files=enabled?[...index.matchAll(/\/sitemaps\/(\d+\.xml)/g)].map(match=>match[1]):['0.xml'];
   let all='';for(const file of files)all+=await (await sitemapPart(new Request('http://127.0.0.1/sitemaps/'+file),{params:Promise.resolve({file})})).text();
   assert.equal(all.includes('/thu-vien'),enabled);assert.ok(!all.includes('/admin')&&!all.includes('/hoi-dap'));
   assert.ok(!all.includes(draft.slug)&&!all.includes(withdrawn.slug));
   if(enabled)assert.ok(all.includes(visible.slug)&&all.includes(news.slug));
  }
  console.log('Public queries, rich phrase search, draft isolation, withdrawal, legacy news privacy, metadata and sitemap switches passed.');
 }finally{
  await payload.updateGlobal({slug:'site-settings',overrideAccess:false,user:owner,data:{publicIndexingEnabled:settings.publicIndexingEnabled===true}});
  for(const id of ids)await payload.delete({collection:'articles',id,overrideAccess:true});
  await payload.delete({collection:'categories',id:category.id,overrideAccess:true});
 }
}
