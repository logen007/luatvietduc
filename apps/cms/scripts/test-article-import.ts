import assert from 'node:assert/strict';
import type {Payload} from 'payload';
import {commitArticleImport,planArticleImport,articleImportRequest} from '../src/modules/content/article-import';
import {encodeCSV,parseCSV} from '../src/modules/content/article-csv';
export async function testArticleImport(payload:Payload){
 const suffix=crypto.randomUUID(),password=crypto.randomUUID();
 const owner=await payload.create({collection:'users',overrideAccess:true,context:{bootstrapOwner:true},data:{name:'CSV test owner',email:'csv-'+suffix+'@example.invalid',password,role:'owner'}});
 const specialist=await payload.create({collection:'users',overrideAccess:false,user:owner,data:{name:'CSV specialist',email:'csv-specialist-'+suffix+'@example.invalid',password,role:'support',jurisdictions:['VN']}});
 const member=await payload.create({collection:'users',overrideAccess:false,user:owner,data:{name:'CSV member',email:'csv-member-'+suffix+'@example.invalid',password,role:'member'}});
 const cat=await payload.create({collection:'categories',user:owner,overrideAccess:false,data:{name:'CSV parent '+suffix,slug:'csv-parent-'+suffix}});
 const child=await payload.create({collection:'categories',user:owner,overrideAccess:false,data:{name:'CSV child '+suffix,slug:'csv-child-'+suffix,parent:cat.id}});
 const tag=await payload.create({collection:'tags',user:owner,overrideAccess:false,data:{name:'CSV tag '+suffix,slug:'csv-tag-'+suffix}});
 const slugs=['csv-a-','csv-b-','csv-c-'].map(s=>s+suffix);
 const header=['title','slug','body','categories','tags','status','ai_allowed','jurisdiction'];
 const csv=encodeCSV([header,['Bài thứ nhất',slugs[0],'<h2>Đề mục</h2><p>Nội dung <strong>in đậm</strong></p>',cat.slug+'|'+child.slug,tag.slug,'draft','false','DE'],['Bài thứ hai',slugs[1],'Nội dung\nnhiều dòng',child.slug,tag.slug,'published','true','BOTH']]);
 try{
  await assert.rejects(()=>planArticleImport(payload,member,csv));await assert.rejects(()=>commitArticleImport(payload,null,csv));
  const plan=await planArticleImport(payload,specialist,csv);assert.equal(plan.length,2);assert.ok(plan.every(row=>!row.errors.length));
  const [one,two]=await Promise.all([commitArticleImport(payload,specialist,csv),commitArticleImport(payload,specialist,csv)]);assert.equal(one.created.length+two.created.length,2);assert.equal(one.skipped+two.skipped,2);
  const docs=await payload.find({collection:'articles',overrideAccess:false,user:owner,draft:true,where:{slug:{in:slugs}}});assert.equal(docs.totalDocs,2);
  const first=docs.docs.find(d=>d.slug===slugs[0])!,second=docs.docs.find(d=>d.slug===slugs[1])!;assert.equal(first._status,'draft');assert.match(first.body,/data-lvd-richtext/);assert.equal(first.categories?.length,2);assert.equal(second._status,'published');assert.equal(second.aiAllowed,true);
  assert.equal((await commitArticleImport(payload,owner,csv)).created.length,0,'Retry never overwrites an existing article');
  const invalid=encodeCSV([header,['Valid',slugs[2],'Text','','','draft','false','VN'],['Invalid','csv-invalid-'+suffix,'Text','missing-category','','draft','false','VN']]);
  await assert.rejects(()=>commitArticleImport(payload,owner,invalid));assert.equal((await payload.find({collection:'articles',user:owner,overrideAccess:false,draft:true,where:{slug:{equals:slugs[2]}}})).totalDocs,0,'Invalid batch writes nothing');
  const demo=await articleImportRequest(new Request('http://localhost/service/article-import'),payload,owner),demoRows=parseCSV(await demo.text());assert.ok(demoRows.some(row=>row.includes(cat.slug)));assert.ok(demoRows.some(row=>row.includes(child.slug)));assert.ok(demoRows.some(row=>row.includes(tag.slug)));
  console.log('Article CSV checks passed: owner/specialist access, member denial, parent/child/category/tag resolution, HTML, draft/publish/AI, concurrent duplicate protection, safe retry, invalid-batch rollback and live taxonomy demo.');
 }finally{
  const docs=await payload.find({collection:'articles',overrideAccess:true,draft:true,where:{slug:{in:slugs}}});for(const doc of docs.docs)await payload.delete({collection:'articles',id:doc.id,user:owner,overrideAccess:false});
  for(const id of [child.id,cat.id])await payload.delete({collection:'categories',id,user:owner,overrideAccess:false});await payload.delete({collection:'tags',id:tag.id,user:owner,overrideAccess:false});
  for(const id of [member.id,specialist.id,owner.id])await payload.delete({collection:'users',id,overrideAccess:true});
 }
}
