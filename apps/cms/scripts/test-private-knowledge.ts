import assert from 'node:assert/strict';
import type {Payload} from 'payload';
import type {User} from '../src/payload-types';
import {pool} from '../src/modules/shared/db';
import {knowledgeArticles,writeKnowledgeArticle} from '../src/modules/knowledge/articles';
import {activeAnswerRules,answerRuleInstruction,rulesRevision} from '../src/modules/assistant/rules';
import {eligible,findFaq,suggestedQuestions} from '../src/modules/assistant/faq';
import {GET} from '../src/app/service/knowledge-source/[token]/route';
export async function testPrivateKnowledge(payload:Payload,owner:User){
 const db=new URL(process.env.DATABASE_URL||'');if(db.pathname!=='/lvd_test'||!['127.0.0.1','localhost'].includes(db.hostname))throw new Error('Isolated private knowledge checks only');
 const prefix='Private AI fixture '+crypto.randomUUID(),ids:number[]=[];
 try{
  const doc=await writeKnowledgeArticle(payload,owner,{title:prefix,body:'Synthetic internal answer with a mandatory condition.',publish:true});ids.push(doc.id);
  assert.equal(doc.entryType,'knowledge');assert.ok(!doc.articleOrigin);
  assert.equal((await payload.find({collection:'articles',overrideAccess:false,where:{title:{equals:prefix}}})).totalDocs,0,'Private knowledge never creates a public article');
  await assert.rejects(()=>payload.find({collection:'knowledge',overrideAccess:false,where:{id:{equals:doc.id}}}),(error:any)=>error.status===403,'Guest cannot enumerate/read private knowledge');
  const token=doc.sourceUrl.split('#').at(-1)!,params={params:Promise.resolve({token})};
  assert.equal((await GET(new Request(doc.sourceUrl),params)).status,404,'Private source URL is not a public publication');
  assert.equal((await knowledgeArticles(payload,owner,String(doc.id)) as any).body,doc.body,'Authorized editor can read the private article');
  assert.ok(!(await suggestedQuestions()).some(item=>item.id===doc.id),'Private article titles are not public suggestions');
  const rule=await writeKnowledgeArticle(payload,owner,{title:prefix+' rule',body:'Synthetic operator policy: select the complete condition or hand off.',entryType:'rule',publish:true});ids.push(rule.id);
  assert.equal(rule._status,'draft');assert.equal(rule.approved,false);assert.equal(rule.ruleEnabled,true);
  const row=(await pool.query('SELECT * FROM knowledge WHERE id=$1',[rule.id])).rows[0];assert.equal(eligible(row),false);assert.equal(await findFaq('BOTH',rule.title),null,'Rules are never answer evidence');
  const rules=await activeAnswerRules('BOTH','Synthetic question');assert.ok(rules.some(item=>item.id===rule.id));assert.match(answerRuleInstruction(rules),/Synthetic operator policy/);
  const before=rulesRevision(rules);
  await writeKnowledgeArticle(payload,owner,{id:rule.id,updatedAt:rule.updatedAt,title:rule.title,body:rule.body,entryType:'rule',publish:false});
  assert.ok(!(await activeAnswerRules('BOTH','Synthetic question')).some(item=>item.id===rule.id));assert.notEqual(rulesRevision(await activeAnswerRules('BOTH','Synthetic question')),before,'Withdrawal immediately changes rule policy');
  const listing=await knowledgeArticles(payload,owner,undefined,{query:prefix});assert.ok('total' in listing);assert.equal(listing.total,2);
  await assert.rejects(()=>writeKnowledgeArticle(payload,owner,{title:prefix+' invalid',body:'x'.repeat(4001),entryType:'rule',publish:true}),/4.000/);
  await pool.query("INSERT INTO knowledge(title,body,jurisdiction,source_url,entry_type,rule_enabled,approved,_status,effective_from,review_due_at) SELECT $1||n::text,'Synthetic rule','BOTH','https://example.invalid/rule','rule',true,false,'draft',now()-interval '1 day',now()+interval '1 day' FROM generate_series(1,20) n",[prefix+' cap ']);
  await assert.rejects(()=>writeKnowledgeArticle(payload,owner,{title:prefix+' capacity',body:'Synthetic policy',entryType:'rule',publish:true}),/20 quy tắc/);
  console.log('Private AI knowledge checks passed: no public articles/API/source pages/suggestions, authorized staff editing, rules excluded from answers, immediate withdrawal and rule capacity limits.');
 }finally{
  await pool.query('DELETE FROM knowledge WHERE title LIKE $1',[prefix+' cap %']);
  for(const id of ids.reverse())await payload.delete({collection:'knowledge',id,user:owner,overrideAccess:false});
 }
}
