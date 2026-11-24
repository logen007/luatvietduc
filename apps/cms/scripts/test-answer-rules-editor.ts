import assert from 'node:assert/strict';
import type {Payload} from 'payload';
import type {User} from '../src/payload-types';
import {answerRulesEditor,saveAnswerRule} from '../src/modules/knowledge/answer-rules';
import {defaultAnswerRules,defaultRuleSource} from '../src/modules/assistant/default-rules';
import {activeAnswerRules,rulesRevision} from '../src/modules/assistant/rules';
import {pool} from '../src/modules/shared/db';
export async function testEditableAnswerRules(payload:Payload,owner:User){
 const db=new URL(process.env.DATABASE_URL||'');if(db.pathname!=='/lvd_test'||!['127.0.0.1','localhost'].includes(db.hostname))throw new Error('Isolated rule checks only');
 const ids:number[]=[];
 try{
  const initial=await answerRulesEditor(payload,owner);assert.ok(initial.every(rule=>rule.id===null),'Synthetic database must not contain operator default overrides');
  const input={...initial[0],body:'SYNTHETIC RULE: Hỏi từng dữ kiện, không lặp câu trước.',enabled:true};
  const [first,second]=await Promise.allSettled([saveAnswerRule(payload,owner,input),saveAnswerRule(payload,owner,input)]);
  const fulfilled=[first,second].filter(result=>result.status==='fulfilled');assert.equal(fulfilled.length,1,'Concurrent first saves create exactly one override');
  const doc=(fulfilled[0] as PromiseFulfilledResult<any>).value;ids.push(doc.id);
  assert.equal((await payload.find({collection:'knowledge',user:owner,overrideAccess:false,where:{sourceUrl:{equals:defaultRuleSource('intake')}}})).totalDocs,1);
  const active=await activeAnswerRules('BOTH','Synthetic question');assert.ok(active.some(rule=>rule.id===doc.id&&rule.body===input.body));assert.ok(!active.some(rule=>rule.body===defaultAnswerRules[0].body),'Old default is replaced, not appended');
  assert.equal(doc.approved,false);assert.equal(doc._status,'draft','Rules remain private non-evidence records');
  await assert.rejects(saveAnswerRule(payload,owner,input),(error:any)=>error.status===409,'Stale editor cannot overwrite newer policy');
  await payload.update({collection:'knowledge',id:doc.id,user:owner,overrideAccess:false,draft:true,data:{body:'SYNTHETIC STAGED POLICY: Hỏi theo thông tin mới.',ruleEnabled:false}});
  const staged=(await answerRulesEditor(payload,owner))[0];assert.equal(staged.pending,true);assert.equal(staged.appliedEnabled,true);assert.equal(staged.enabled,false);
  assert.ok((await activeAnswerRules('BOTH','Synthetic question')).some(rule=>rule.id===doc.id&&rule.body===input.body),'Native draft never changes applied policy');
  const current=staged,before=rulesRevision(active);
  await saveAnswerRule(payload,owner,{...current,body:'SYNTHETIC POLICY V2: Hỏi thêm địa điểm nếu chưa rõ.',enabled:true});
  assert.notEqual(rulesRevision(await activeAnswerRules('BOTH','Synthetic question')),before);
  const updated=(await answerRulesEditor(payload,owner))[0];
  await saveAnswerRule(payload,owner,{...updated,enabled:false});
  assert.ok(!(await activeAnswerRules('BOTH','Synthetic question')).some(rule=>rule.id===doc.id||rule.body===defaultAnswerRules[0].body),'Disabled override does not silently reactivate original default');
  await assert.rejects(answerRulesEditor(payload,null),(error:any)=>error.status===403);
  console.log('Editable AI rules passed: shared defaults, concurrent first save, explicit apply/disable, stale revision protection, private-only and runtime policy revision.');
 }finally{
  // Recover an ID even if a post-create assertion fails, only inside lvd_test.
  const rows=(await pool.query('SELECT id FROM knowledge WHERE source_url=$1',[defaultRuleSource('intake')])).rows;
  for(const id of new Set([...ids,...rows.map(row=>row.id)]))await payload.delete({collection:'knowledge',id,user:owner,overrideAccess:false});
 }
}
