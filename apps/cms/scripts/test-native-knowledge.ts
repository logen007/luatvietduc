import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import type {Payload} from 'payload';
import type {User} from '../src/payload-types';
import {pool} from '../src/modules/shared/db';
import {knowledgeArticles,writeKnowledgeArticle} from '../src/modules/knowledge/articles';
import {activeAnswerRules} from '../src/modules/assistant/rules';
import {faqBody,findFaq,suggestedQuestions} from '../src/modules/assistant/faq';
import {answerCitation} from '../src/modules/knowledge/citations';

export async function testNativeKnowledge(payload:Payload,owner:User){
 const database=new URL(process.env.DATABASE_URL||'');if(database.pathname!=='/lvd_test'||!['localhost','127.0.0.1'].includes(database.hostname))throw new Error('Isolated native knowledge checks only');
 const prefix='Native private knowledge '+randomUUID(),ids:number[]=[],users:number[]=[];
 let category:number|undefined,tag:number|undefined;
 const rich=(text:string)=>'<div data-lvd-richtext="1"><p><strong>'+text+'</strong></p><p>Keep the complete mandatory condition.</p></div>';
 const main=async(id:number)=>(await pool.query('SELECT * FROM knowledge WHERE id=$1',[id])).rows[0];
 try{
  const support=await payload.create({collection:'users',overrideAccess:true,context:{bootstrapOwner:true},data:{name:prefix+' support',email:randomUUID()+'@example.invalid',password:randomUUID(),role:'support',jurisdictions:['VN']}});users.push(support.id);
  const member=await payload.create({collection:'users',overrideAccess:true,context:{bootstrapOwner:true},data:{name:prefix+' member',email:randomUUID()+'@example.invalid',password:randomUUID(),role:'member'}});users.push(member.id);
  const cat=await payload.create({collection:'categories',user:owner,overrideAccess:false,data:{name:prefix,slug:'knowledge-'+randomUUID()}});category=cat.id;
  const item=await payload.create({collection:'tags',user:owner,overrideAccess:false,data:{name:prefix,slug:'knowledge-'+randomUUID()}});tag=item.id;
  const privateDraft=await writeKnowledgeArticle(payload,support,{title:prefix+' legacy draft',body:'Not approved for answers.',publish:false});ids.push(privateDraft.id);
  assert.equal((await main(privateDraft.id))._status,'draft');assert.equal((await main(privateDraft.id)).approved,false);assert.equal(await findFaq('BOTH',privateDraft.title),null,'Custom Save Draft cannot become approval through native normalization');
  const doc=await payload.create({collection:'knowledge',user:support,overrideAccess:false,draft:true,data:{title:prefix,body:rich('First private answer.')+'<script>REMOVED_SYNTHETIC_SCRIPT</script>'}});ids.push(doc.id);
  assert.equal(doc.jurisdiction,'BOTH');assert.ok(doc.sourceUrl.startsWith('https://'));assert.ok(new Date(doc.reviewDueAt)>new Date());assert.ok(!doc.body.includes('REMOVED_SYNTHETIC_SCRIPT'));assert.equal(doc._status,'draft');
  await assert.rejects(()=>payload.findByID({collection:'knowledge',id:doc.id,user:member,overrideAccess:false}));await assert.rejects(()=>payload.findByID({collection:'knowledge',id:doc.id,overrideAccess:false}));
  const published=await payload.update({collection:'knowledge',id:doc.id,user:support,overrideAccess:false,data:{body:rich('First private answer.'),categories:[cat.id],tags:[item.id],_status:'published'}});
  assert.equal(published.approved,true);assert.equal(published._status,'published');assert.equal((typeof published.reviewedBy==='object'?published.reviewedBy?.id:published.reviewedBy),support.id);
  assert.equal(faqBody(await main(doc.id)),'First private answer.\n\nKeep the complete mandatory condition.');assert.equal((await findFaq('BOTH',prefix))?.id,doc.id);assert.equal(answerCitation(await main(doc.id)).url,undefined);
  assert.ok(!(await suggestedQuestions()).some(row=>row.id===doc.id));assert.equal((await payload.find({collection:'articles',where:{title:{equals:prefix}},overrideAccess:false})).totalDocs,0);
  const draft=await payload.update({collection:'knowledge',id:doc.id,user:support,overrideAccess:false,draft:true,data:{body:rich('Second private answer.'),categories:[],tags:[],_status:'draft'}});
  assert.equal((await main(doc.id)).body,published.body,'Save Draft preserves the current published knowledge');
  const fresh=await payload.findByID({collection:'knowledge',id:doc.id,user:support,overrideAccess:false,draft:true,depth:0});assert.deepEqual(fresh.categories,[]);assert.deepEqual(fresh.tags,[]);assert.equal(fresh.body,draft.body);
  const legacyDraft=await knowledgeArticles(payload,support,String(doc.id)) as typeof fresh;
  assert.equal(legacyDraft.updatedAt,fresh.updatedAt);
  const savedThroughLegacy=await writeKnowledgeArticle(payload,support,{id:doc.id,updatedAt:legacyDraft.updatedAt,title:legacyDraft.title,body:legacyDraft.body,publish:false});
  assert.equal(savedThroughLegacy.id,doc.id);assert.equal(savedThroughLegacy.body,fresh.body,'The custom API accepts the latest native draft receipt');assert.equal(savedThroughLegacy._status,'draft');assert.equal(savedThroughLegacy.approved,false);
  await assert.rejects(()=>writeKnowledgeArticle(payload,support,{id:doc.id,updatedAt:published.updatedAt,title:prefix,body:'Stale pre-draft text',publish:true}),/đã thay đổi/);
  const republished=await payload.update({collection:'knowledge',id:doc.id,user:support,overrideAccess:false,data:{body:fresh.body,categories:[cat.id],tags:[item.id],_status:'published'}});
  assert.equal(faqBody(await main(doc.id)),'Second private answer.\n\nKeep the complete mandatory condition.');
  const legacy=await writeKnowledgeArticle(payload,support,{id:doc.id,updatedAt:republished.updatedAt,title:prefix,body:rich('Legacy API answer.'),publish:true});assert.equal(legacy.id,doc.id);assert.equal(legacy.categories?.length,1);assert.equal(legacy.tags?.length,1);assert.equal((await knowledgeArticles(payload,support,String(doc.id)) as typeof legacy).id,doc.id);

  const rule=await payload.create({collection:'knowledge',user:support,overrideAccess:false,draft:true,data:{title:prefix+' rule',body:rich('Staged rule.'),entryType:'rule',ruleEnabled:true}});ids.push(rule.id);
  assert.equal((await main(rule.id)).rule_enabled,false,'Creating a native draft never activates a rule');
  await payload.update({collection:'knowledge',id:rule.id,user:support,overrideAccess:false,data:{body:rich('Applied rule.'),entryType:'rule',ruleEnabled:true,_status:'published'}});
  assert.equal((await main(rule.id)).rule_enabled,true);assert.equal((await main(rule.id))._status,'draft');assert.equal((await main(rule.id)).approved,false);assert.ok((await activeAnswerRules('BOTH','Question')).some(row=>row.id===rule.id&&row.body.includes('Applied rule.')&&!row.body.includes('<p>')));
  const staged=await payload.update({collection:'knowledge',id:rule.id,user:support,overrideAccess:false,draft:true,data:{body:rich('Pending revised rule.'),ruleEnabled:false,_status:'draft'}});
  assert.equal(staged.ruleEnabled,false);assert.ok((await activeAnswerRules('BOTH','Question')).some(row=>row.id===rule.id&&row.body.includes('Applied rule.')),'Draft edits cannot replace the live rule');
  await payload.update({collection:'knowledge',id:rule.id,user:support,overrideAccess:false,data:{body:staged.body,ruleEnabled:false,_status:'published'}});
  assert.equal((await main(rule.id)).rule_enabled,false);assert.ok(!(await activeAnswerRules('BOTH','Question')).some(row=>row.id===rule.id),'Publish applies an unchecked rule immediately');
  const compat=await writeKnowledgeArticle(payload,support,{id:rule.id,updatedAt:(await payload.findByID({collection:'knowledge',id:rule.id,user:support,overrideAccess:false,draft:true})).updatedAt,title:prefix+' rule',body:'Legacy API operator policy.',entryType:'rule',publish:true});
  assert.equal((await main(rule.id)).rule_enabled,true);assert.equal(compat.approved,false);await writeKnowledgeArticle(payload,support,{id:rule.id,updatedAt:compat.updatedAt,title:compat.title,body:compat.body,entryType:'rule',publish:false});assert.equal((await main(rule.id)).rule_enabled,false);
  assert.equal(await findFaq('BOTH',prefix+' rule'),null,'Rules remain excluded from answer evidence');
  console.log('Native private knowledge checks passed: minimal scoped create, rich sanitization/plain RAG, taxonomy/version persistence, guest/member isolation, no public article/suggestions/source links, legacy service compatibility and SQL/runtime rule draft-publish-enable-disable semantics.');
 }finally{
  for(const id of ids.reverse())await payload.delete({collection:'knowledge',id,user:owner,overrideAccess:false});
  if(category)await payload.delete({collection:'categories',id:category,user:owner,overrideAccess:false});if(tag)await payload.delete({collection:'tags',id:tag,user:owner,overrideAccess:false});
  for(const id of users.reverse())await payload.delete({collection:'users',id,user:owner,overrideAccess:false});
 }
}
