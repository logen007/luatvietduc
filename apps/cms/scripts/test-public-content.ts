import assert from 'node:assert/strict';
import type {Payload} from 'payload';
import type {User} from '../src/payload-types';
import {publicArticle,publicArticleList,publicSiteSettings,publicLegacyNews} from '../src/modules/public-site/server';
import {pool} from '../src/modules/shared/db';
import {pageMetadata} from '../src/modules/public-site/Page';
import {GET as sitemapIndex} from '../src/app/sitemap.xml/route';
import {GET as sitemapPart} from '../src/app/sitemaps/[file]/route';
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
  const create=async(slug:string,published:boolean,kind:'article'|'news'='article')=>{
   const article=await payload.create({collection:'articles',overrideAccess:false,user:owner,data:{title:title+' '+slug,slug:slug+'-'+suffix,body:(published?'PUBLIC ':'PRIVATE ')+suffix,categories:[category.id],jurisdiction:'VN',language:'vi',kind,_status:published?'published':'draft',reviewState:published?'approved':'draft',aiAllowed:false}});
   ids.push(article.id);return article;
  };
  const visible=await create('published',true),draft=await create('draft',false),withdrawn=await create('withdrawn',true),news=await create('news',true,'news');
  await payload.update({collection:'articles',id:withdrawn.id,overrideAccess:false,user:owner,data:{reviewState:'withdrawn'}});
  assert.equal((await publicArticle(visible.slug))?.id,visible.id);assert.equal(await publicArticle(draft.slug),null);assert.equal(await publicArticle(withdrawn.slug),null);
  const legal=await publicArticleList({query:suffix,group:category.slug});assert.deepEqual(legal.docs.map(doc=>doc.id),[visible.id]);
  assert.deepEqual((await publicArticleList({kind:'news',query:suffix})).docs.map(doc=>doc.id),[news.id]);
  assert.equal((await publicArticleList({query:suffix,country:'DE'})).totalDocs,0);
  for(const enabled of [false,true]){
   await payload.updateGlobal({slug:'site-settings',overrideAccess:false,user:owner,data:{publicIndexingEnabled:enabled}});
   assert.equal((await publicSiteSettings()).publicIndexingEnabled,enabled);
   const metadata=await pageMetadata('/thu-vien',new URLSearchParams());assert.equal((metadata.robots as {index:boolean}).index,enabled);
   assert.equal(((await pageMetadata('/tim-kiem',new URLSearchParams('q='+suffix))).robots as {index:boolean}).index,false);
   const index=await (await sitemapIndex()).text();assert.equal(index.includes('<sitemap>'),enabled);
   const files=enabled?[...index.matchAll(/\/sitemaps\/(\d+\.xml)/g)].map(match=>match[1]):['0.xml'];
   let all='';for(const file of files)all+=await (await sitemapPart(new Request('http://127.0.0.1/sitemaps/'+file),{params:Promise.resolve({file})})).text();
   assert.equal(all.includes('/thu-vien'),enabled);assert.ok(!all.includes('/admin')&&!all.includes('/tro-chuyen'));
   assert.ok(!all.includes(draft.slug)&&!all.includes(withdrawn.slug));
   if(enabled)assert.ok(all.includes(visible.slug)&&all.includes(news.slug));
  }
  console.log('Public queries, draft isolation, withdrawal, legacy news privacy, metadata and sitemap switches passed.');
 }finally{
  await payload.updateGlobal({slug:'site-settings',overrideAccess:false,user:owner,data:{publicIndexingEnabled:settings.publicIndexingEnabled===true}});
  for(const id of ids)await payload.delete({collection:'articles',id,overrideAccess:true});
  await payload.delete({collection:'categories',id:category.id,overrideAccess:true});
 }
}
