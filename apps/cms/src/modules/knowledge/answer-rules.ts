import type {Payload,Where} from 'payload';
import type {User} from '../../payload-types';
import {defaultAnswerRules,defaultRuleSource} from '../assistant/default-rules';
import {requireKnowledge,writeKnowledgeArticle} from './articles';
import {articleText} from '../content/article-body';
import {HttpError} from '../http/errors';
export async function answerRulesEditor(payload:Payload,user:User|null){
 requireKnowledge(user);
 const query={collection:'knowledge' as const,user,overrideAccess:false,limit:100,sort:'-id',where:{and:[{entryType:{equals:'rule'}},{articleOrigin:{exists:false}},{sourceUrl:{in:defaultAnswerRules.map(rule=>defaultRuleSource(rule.key))}}]} as Where};
 const [{docs},{docs:applied}]=await Promise.all([payload.find({...query,draft:true}),payload.find({...query,draft:false})]);
 return defaultAnswerRules.map(rule=>{
  const doc=docs.find(doc=>doc.sourceUrl===defaultRuleSource(rule.key)),main=applied.find(doc=>doc.sourceUrl===defaultRuleSource(rule.key));
  const pending=Boolean(doc&&main&&(articleText(doc.body)!==articleText(main.body)||doc.ruleEnabled!==main.ruleEnabled));
  const appliedEnabled=main?main.ruleEnabled===true&&new Date(main.effectiveFrom).getTime()<=Date.now()&&new Date(main.reviewDueAt).getTime()>Date.now()&&(!main.expiresAt||new Date(main.expiresAt).getTime()>Date.now()):true;
  return {pending,appliedEnabled,key:rule.key,title:rule.title,body:doc?articleText(doc.body):rule.body,enabled:doc?doc.ruleEnabled===true:true,id:doc?.id||null,updatedAt:doc?.updatedAt||null,reviewDueAt:doc?.reviewDueAt||null};
 });
}
export async function saveAnswerRule(payload:Payload,user:User|null,input:Record<string,unknown>){
 requireKnowledge(user);
 const definition=defaultAnswerRules.find(rule=>rule.key===input.key);
 if(!definition||typeof input.body!=='string'||typeof input.enabled!=='boolean')throw new HttpError(400,'Quy tắc không hợp lệ.');
 const existing=(await answerRulesEditor(payload,user)).find(rule=>rule.key===definition.key)!;
 if(existing.id!==input.id||existing.updatedAt!==input.updatedAt)throw new HttpError(409,'Quy tắc đã thay đổi. Tải lại trước khi lưu.');
 const doc=await writeKnowledgeArticle(payload,user,{id:existing.id,updatedAt:existing.updatedAt,title:definition.title,body:input.body,entryType:'rule',sourceUrl:defaultRuleSource(definition.key),publish:input.enabled,categories:[],tags:[]});
 return {...doc,body:articleText(doc.body)};
}
