import assert from 'node:assert/strict';
import type {Payload} from 'payload';
import type {User} from '../src/payload-types';
import {pool} from '../src/modules/shared/db';
import {eligible,findFaq} from '../src/modules/assistant/faq';
import seeds from '../src/modules/taxonomy/seeds.json';
import legacyPosts from '../src/modules/legacy/posts.json';
import {bundledFiles} from '../src/modules/storage/bundled';
export async function testEditorial(payload:Payload,owner:User,specialist:User){
 const database=new URL(process.env.DATABASE_URL||'');if(!['localhost','127.0.0.1'].includes(database.hostname)||database.pathname!=='/lvd_test')throw new Error('Isolated CI database only');
 for(const file of bundledFiles){const row=(await pool.query('SELECT id FROM media WHERE filename=$1',[file.filename])).rows[0];assert.ok(row);const doc=await payload.findByID({collection:'media',id:row.id,user:owner,overrideAccess:false});assert.equal(doc.url,file.url);assert.equal(doc.visibility,'public');await assert.rejects(()=>payload.delete({collection:'media',id:doc.id,user:owner,overrideAccess:false}));}
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
 console.log('Editorial checks passed: 16 seeded parent categories, news tree, tags, native relations/versions, hierarchy rename/cycle/delete, AI opt-in/uncheck/draft/delete and specialist self-publication');
}
