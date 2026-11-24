import assert from 'node:assert/strict';
import {ValidationError,type Payload,type CollectionBeforeChangeHook} from 'payload';
import type {User} from '../src/payload-types';
import {pool} from '../src/modules/shared/db';
import {eligible,findFaq,faqBody,publicFaq} from '../src/modules/assistant/faq';
import seeds from '../src/modules/taxonomy/seeds.json';
import legacyPosts from '../src/modules/legacy/posts.json';
import {bundledFiles} from '../src/modules/storage/bundled';
import {articleLock} from '../src/modules/content/audit';
export async function testEditorial(payload:Payload,owner:User,specialist:User){
 const database=new URL(process.env.DATABASE_URL||'');if(!['localhost','127.0.0.1'].includes(database.hostname)||database.pathname!=='/lvd_test')throw new Error('Isolated CI database only');
 for(const file of bundledFiles){const row=(await pool.query('SELECT id FROM media WHERE filename=$1',[file.filename])).rows[0];assert.ok(row);const doc=await payload.findByID({collection:'media',id:row.id,user:owner,overrideAccess:false});assert.equal(doc.url,file.url);assert.equal(doc.visibility,'public');}
 for(const post of legacyPosts){const found=await payload.find({collection:'articles',draft:true,user:owner,overrideAccess:false,where:{slug:{equals:post.slug}},limit:1,depth:0});assert.equal(found.totalDocs,1);assert.equal(found.docs[0]._status,'draft');assert.equal(found.docs[0].aiAllowed,false);assert.equal(found.docs[0].body,post.body);if(post.category)assert.ok(found.docs[0].categories?.length);}
 for(const category of seeds.legal)assert.equal((await payload.find({collection:'categories',where:{slug:{equals:category.slug}},overrideAccess:false,limit:1})).totalDocs,1);
 const vietnam=(await payload.find({collection:'tags',where:{slug:{equals:'vietnam'}},overrideAccess:false})).docs[0],germany=(await payload.find({collection:'tags',where:{slug:{equals:'germany'}},overrideAccess:false})).docs[0];assert.ok(vietnam&&germany);
 await assert.rejects(()=>payload.create({collection:'categories',overrideAccess:false,data:{name:'Forbidden category',slug:'forbidden'}}));
 const suffix=crypto.randomUUID(),parent=await payload.create({collection:'categories',user:owner,overrideAccess:false,data:{name:'Synthetic parent '+suffix,slug:'parent-'+suffix}}),child=await payload.create({collection:'categories',user:owner,overrideAccess:false,data:{name:'Synthetic child',slug:'child-'+suffix,parent:parent.id}});
 assert.ok(child.label?.includes(' > Synthetic child'));
 await assert.rejects(()=>payload.update({collection:'categories',id:parent.id,user:owner,overrideAccess:false,data:{parent:child.id}}));
 await assert.rejects(()=>payload.update({collection:'categories',id:child.id,user:owner,overrideAccess:false,data:{parent:child.id}}));
 await payload.update({collection:'categories',id:parent.id,user:owner,overrideAccess:false,data:{name:'Renamed synthetic parent'}});
 assert.equal((await payload.findByID({collection:'categories',id:child.id})).label,'Renamed synthetic parent > Synthetic child');
 const draft=await payload.create({collection:'articles',user:owner,overrideAccess:false,data:{title:'Synthetic editorial '+suffix,slug:'',jurisdiction:'BOTH',language:'vi',body:'Synthetic public text.\n\nMandatory condition remains attached.',categories:[child.id],tags:[vietnam.id,germany.id],reviewState:'draft',_status:'draft'}});
 const post=await payload.update({collection:'articles',id:draft.id,user:owner,overrideAccess:false,data:{reviewState:'draft',_status:'published',aiAllowed:true}});assert.equal(post.reviewState,'approved');assert.equal(typeof post.reviewedBy==='object'?post.reviewedBy?.id:post.reviewedBy,owner.id);
 assert.ok(post.slug?.startsWith('synthetic-editorial-'));assert.equal(post.tags?.length,2);assert.equal(post.categories?.length,1);assert.equal(post.jurisdiction,'BOTH');
 const readSource=async()=>((await pool.query('SELECT * FROM knowledge WHERE article_origin_id=$1',[post.id])).rows[0]);
 let source=await readSource();assert.ok(source&&eligible(source));assert.ok(source.source_url.endsWith('/bai-viet/'+post.slug));assert.equal((await findFaq('BOTH',post.title))?.id,source.id);
 await payload.update({collection:'articles',id:post.id,user:owner,overrideAccess:false,data:{aiAllowed:false}});assert.ok(!eligible(await readSource()));assert.equal(await findFaq('BOTH',post.title),null);
 await payload.update({collection:'articles',id:post.id,user:owner,overrideAccess:false,data:{aiAllowed:true}});assert.ok(eligible(await readSource()));
 await assert.rejects(()=>payload.update({collection:'knowledge',id:source.id,user:owner,overrideAccess:false,data:{body:'Bypass article eligibility'}}),/đồng bộ tự động/);
 const updated=await payload.update({collection:'articles',id:post.id,user:owner,overrideAccess:false,data:{title:post.title,body:'Revised synthetic published content.',_status:'published',reviewState:'approved',aiAllowed:true}});assert.equal(updated._status,'published');assert.equal((await readSource()).body,'Revised synthetic published content.');
 await payload.update({collection:'articles',id:post.id,user:owner,overrideAccess:false,data:{_status:'draft'}});assert.ok(!eligible(await readSource()),'Drafting removes AI access atomically');
 await payload.delete({collection:'categories',id:parent.id,user:owner,overrideAccess:false});assert.equal((await payload.findByID({collection:'categories',id:child.id})).parent,null);
 await payload.delete({collection:'categories',id:child.id,user:owner,overrideAccess:false});assert.equal((await payload.findByID({collection:'articles',id:post.id,depth:0})).body,'Revised synthetic published content.','Deleting categories preserves article content');
 await payload.delete({collection:'articles',id:post.id,user:owner,overrideAccess:false});assert.equal(await readSource(),undefined,'Deleting article removes derived knowledge');
 const specialistPost=await payload.create({collection:'articles',user:specialist,overrideAccess:false,data:{title:'Synthetic specialist article '+suffix,slug:'',jurisdiction:'BOTH',language:'vi',body:'Synthetic specialist public text.',reviewState:'approved',_status:'published',aiAllowed:true}});assert.equal(specialistPost._status,'published');assert.equal(specialistPost.aiAllowed,true);
 await payload.delete({collection:'articles',id:specialistPost.id,user:owner,overrideAccess:false});
 const rich=await payload.create({collection:'articles',user:owner,overrideAccess:false,data:{title:'Synthetic rich editor '+suffix,slug:'',jurisdiction:'BOTH',language:'vi',body:'<div data-lvd-richtext="1"><h2>Heading</h2><p><strong>Approved rich answer with complete conditions.</strong></p><p>Mandatory exception stays with this answer.</p><script>unsafe()</script><img src="javascript:unsafe" onerror="unsafe()"></div>',reviewState:'approved',_status:'published',aiAllowed:true}});
 assert.ok(!rich.body.includes('unsafe'));assert.match(rich.body,/<strong>/);
 const richSource=(await pool.query('SELECT * FROM knowledge WHERE article_origin_id=$1',[rich.id])).rows[0];assert.ok(eligible(richSource));assert.ok(!faqBody(richSource).includes('<'));assert.deepEqual(publicFaq(richSource).paragraphs,['Heading','Approved rich answer with complete conditions.','Mandatory exception stays with this answer.']);
 await assert.rejects(()=>payload.update({collection:'articles',id:rich.id,user:owner,overrideAccess:false,data:{body:'<div data-lvd-richtext="1"><p></p></div>',_status:'published'}}),error=>error instanceof ValidationError&&error.data.errors.some(item=>item.path==='body'&&item.message.includes('Nhập nội dung')));
 await payload.delete({collection:'articles',id:rich.id,user:owner,overrideAccess:false});
 const lifecycle=await payload.create({collection:'articles',user:owner,overrideAccess:false,data:{title:'Synthetic native draft lifecycle '+suffix,slug:'',jurisdiction:'BOTH',language:'vi',body:'Initial draft content.',_status:'draft'}});
 try{
  const mainBefore=(await pool.query('SELECT body,updated_at FROM articles WHERE id=$1',[lifecycle.id])).rows[0];
  const firstDraft=await payload.update({collection:'articles',id:lifecycle.id,user:owner,overrideAccess:false,draft:true,data:{body:'First saved native draft.',_status:'draft'}});
  const mainAfter=(await pool.query('SELECT body,updated_at FROM articles WHERE id=$1',[lifecycle.id])).rows[0];
  assert.equal(mainAfter.body,mainBefore.body,'Native Save draft changes the version, not the main-table body');
  assert.equal(new Date(mainAfter.updated_at).getTime(),new Date(mainBefore.updated_at).getTime(),'Native Save draft leaves the main-table timestamp unchanged');
  assert.equal((await payload.findByID({collection:'articles',id:lifecycle.id,user:owner,overrideAccess:false,draft:true})).body,firstDraft.body);
  const secondDraft=await payload.update({collection:'articles',id:lifecycle.id,user:owner,overrideAccess:false,draft:true,data:{body:'Second saved native draft.',_status:'draft'}});
  assert.equal(secondDraft.body,'Second saved native draft.','A second Save draft accepts the latest version timestamp');
  const published=await payload.update({collection:'articles',id:lifecycle.id,user:owner,overrideAccess:false,data:{_status:'published',aiAllowed:false}});
  assert.equal(published.body,secondDraft.body);assert.equal(published._status,'published');assert.equal(published.reviewState,'approved');
  assert.equal((await payload.findByID({collection:'articles',id:lifecycle.id,overrideAccess:false,draft:false})).body,secondDraft.body,'Publish uses the saved draft instead of the old main-table body');

  const hooks=payload.collections.articles.config.hooks.beforeChange;
  assert.ok(hooks);const lockIndex=hooks.indexOf(articleLock);assert.notEqual(lockIndex,-1);
  const snapshots:string[]=[];let release!:()=>void,reject!:(error:Error)=>void,timer:ReturnType<typeof setTimeout>|undefined;
  const barrier=new Promise<void>((resolve,fail)=>{release=resolve;reject=fail;});
  const pause:CollectionBeforeChangeHook=async({data,originalDoc,context})=>{
   if(originalDoc?.id===lifecycle.id&&context.editorialDraftRace===suffix){
    snapshots.push(String(originalDoc.updatedAt));
    if(snapshots.length===1)timer=setTimeout(()=>reject(new Error('Concurrent draft snapshots did not reach the barrier')),10000);
    if(snapshots.length===2)release();
    await barrier;
   }
   return data;
  };
  hooks.splice(lockIndex,0,pause);
  let winner='';
  try{
   const race=await Promise.allSettled(['First competing native draft.','Second competing native draft.'].map(body=>payload.update({collection:'articles',id:lifecycle.id,user:owner,overrideAccess:false,draft:true,context:{editorialDraftRace:suffix},data:{body,_status:'draft'}})));
   assert.equal(snapshots.length,2);assert.equal(snapshots[0],snapshots[1],'Both draft writers must read the same version before either takes the lock');
   const fulfilled=race.filter(result=>result.status==='fulfilled'),rejected=race.filter(result=>result.status==='rejected');
   assert.equal(fulfilled.length,1,'Competing drafts must not overwrite each other even though neither changes the main-table timestamp');assert.equal(rejected.length,1);
   assert.match(rejected[0].reason.message,/Article changed concurrently\. Reload before saving\./);
   winner=fulfilled[0].value.body;
   assert.equal((await payload.findByID({collection:'articles',id:lifecycle.id,user:owner,overrideAccess:false,draft:true})).body,winner,'The rejected draft cannot overwrite the winner');
   assert.equal((await pool.query('SELECT body FROM articles WHERE id=$1',[lifecycle.id])).rows[0].body,published.body,'Draft races never replace the published main-table content');
  }finally{clearTimeout(timer);const index=hooks.indexOf(pause);if(index>=0)hooks.splice(index,1);}
  const afterConflict=await payload.update({collection:'articles',id:lifecycle.id,user:owner,overrideAccess:false,data:{_status:'published',aiAllowed:false}});
  assert.equal(afterConflict.body,winner,'A fresh Publish succeeds after the stale draft writer was rejected');
  await pool.query("UPDATE articles SET updated_at=updated_at+interval '1 second' WHERE id=$1",[lifecycle.id]);
  await assert.rejects(()=>payload.update({collection:'articles',id:lifecycle.id,user:owner,overrideAccess:false,draft:true,data:{body:'Stale version must not overwrite a newer SQL revision.'}}),/Article changed concurrently/,'A newer main-table revision still invalidates an older native version');
 }finally{await payload.delete({collection:'articles',id:lifecycle.id,user:owner,overrideAccess:false});}
 const auto=await payload.create({collection:'articles',user:owner,overrideAccess:false,data:{title:'Synthetic autosave '+suffix,slug:'autosave-'+suffix,jurisdiction:'BOTH',language:'vi',body:'Published content remains stable.',_status:'published',reviewState:'approved',aiAllowed:false}});
 try{
  await payload.update({collection:'articles',id:auto.id,user:owner,overrideAccess:false,draft:true,autosave:true,data:{body:'Automatically saved draft.',_status:'draft'}});
  const saved=await payload.findByID({collection:'articles',id:auto.id,user:owner,overrideAccess:false,draft:true});
  assert.equal(saved.body,'Automatically saved draft.');
  assert.equal((await pool.query('SELECT body FROM articles WHERE id=$1',[auto.id])).rows[0].body,'Published content remains stable.');
  assert.ok((await pool.query('SELECT 1 FROM _articles_v WHERE parent_id=$1 AND autosave=true',[auto.id])).rowCount);
 }finally{await payload.delete({collection:'articles',id:auto.id,user:owner,overrideAccess:false});}
 console.log('Editorial checks passed: 16 seeded parent categories, news tree, tags, native relations/versions, hierarchy rename/cycle/delete, AI opt-in/uncheck/draft/delete, specialist self-publication, native Save draft/publish and stale draft rejection');
}
