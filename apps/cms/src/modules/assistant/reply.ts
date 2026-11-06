import {answerHistory,questionWithHistory,groundedPreviousAnswer} from './conversation-context';
import {MAX_CLARIFICATIONS,contextualIntakeReply,nextClarification,clarificationHistory,intakeClarification,currentIntakeContext,clarificationText,isVagueIntakeReply,isBriefIntakeFollowup,acknowledgementText,unrepeatedClarification,isRepeatedClarification} from './clarification';
import type {Qualification} from '../chat/qualification';
import {randomUUID} from 'node:crypto';
import {pool,transaction} from '../shared/db';
import {activeValues,readRow} from '../integrations/store';
import {HttpError,isCustomer,type Actor} from '../chat/service';
import {findFaq,eligible,matchesQuestion,requiresHuman,faqRevision,type Faq} from './faq';
import {sourceScopes,sourceInScope} from './scope';
import {formatFaq} from './format';
import {CONSENT_VERSION} from '../rag/core';
import {retrieve} from '../rag/retrieve';
import {reserveBudget,selectPassages,assessIntake} from '../rag/provider';
import {activeAnswerRules,rulesRevision,type AnswerRule} from './rules';
import {answerCitation} from '../knowledge/citations';
type Policy={customerAIEnabled?:boolean|null;chatEnabled?:boolean|null;aiDailyRequests?:number|null;aiMaxOutputTokens?:number|null};
type Formatter=(faq:Faq,connection:Record<string,string>,maxTokens:number,dailyLimit:number,rules?:AnswerRule[])=>Promise<string>;
const handoffText='Câu hỏi này cần chuyên viên xem xét thêm. Mình đã chuyển cuộc trò chuyện để chuyên viên tiếp tục hỗ trợ tại đây.';
export async function replyToMessage(actor:Actor,id:string,messageId:string|number,policy:Policy,formatter:Formatter=formatFaq){
 const token=randomUUID(),replyKey='assistant:'+messageId;
 const work=await transaction(async db=>{
  const conversation=(await db.query('SELECT * FROM lvd_conversations WHERE id=$1 FOR UPDATE',[id])).rows[0];
  if(!conversation||!isCustomer(actor,conversation))throw new HttpError(403,'Bạn không có quyền truy cập hội thoại này.');
  if(conversation.state!=='queued'||!conversation.ai_enabled)return null;
  if((await db.query('SELECT 1 FROM lvd_messages WHERE conversation_id=$1 AND client_key=$2',[id,replyKey])).rowCount)return null;
  const message=(await db.query("SELECT id,body,metadata FROM lvd_messages WHERE conversation_id=$1 AND role='user' ORDER BY id DESC LIMIT 1",[id])).rows[0];
  if(!message||String(message.id)!==String(messageId))return null;
  if(conversation.ai_generation&&new Date(conversation.ai_started_at).getTime()>Date.now()-35000)return null;
  await db.query('UPDATE lvd_conversations SET ai_generation=$2,ai_message_id=$3,ai_started_at=now() WHERE id=$1',[id,token,message.id]);
  const previous=(await db.query("SELECT role,body,metadata FROM ((SELECT id,role,body,metadata FROM lvd_messages WHERE conversation_id=$1 AND id<$2 AND NOT internal ORDER BY id DESC LIMIT 80) UNION (SELECT id,role,body,metadata FROM lvd_messages WHERE conversation_id=$1 AND id<$2 AND role='user' AND NOT internal ORDER BY id LIMIT 4)) history ORDER BY id DESC",[id,message.id])).rows;
  const history=clarificationHistory(previous,CONSENT_VERSION);
  return {previousQuestions:previous.filter(row=>row.role==='assistant'&&row.metadata?.kind==='clarify').map(row=>String(row.body)).slice(0,6),retainHistory:Boolean(conversation.retain_history),meaningfulHistory:previous.some(row=>row.role==='user'&&!isVagueIntakeReply(String(row.body))),previousAnswer:previous.find(row=>row.role==='assistant'&&row.metadata?.kind==='ai'),question:String(message.body),intakeQuestion:contextualIntakeReply(String(message.body),history.pendingKey),consented:message.metadata?.aiConsent?.version===CONSENT_VERSION,context:answerHistory(previous,CONSENT_VERSION),localContext:history.localContext,clarificationKeys:history.keys,clarificationCount:history.count,intakeAnswers:{...history.answers,...(history.pendingKey?{[history.pendingKey]:String(message.body)}:{})},country:conversation.jurisdiction,version:conversation.version};
 });
 if(!work)return;
 let answer:string|null=null,faq:Faq|null=null,providerVersion:number|undefined,clarificationKey:string|undefined;
 let qualification:Qualification='ready',assessed=false,unqualifiedAssessment=false;
 let ragSources:Faq[]=[],rules:AnswerRule[]=[],rag=false,clarification=false,localClarification=false;
 const followsAnswer=work.consented&&work.previousAnswer&&!work.clarificationCount&&work.context&&isBriefIntakeFollowup(work.question);
 const localQuestion=[work.localContext||(followsAnswer?work.context:''),work.intakeQuestion].filter(Boolean).join('\n');
 const intake=currentIntakeContext(localQuestion);
 const initial=intakeClarification(localQuestion,work.clarificationKeys,work.intakeAnswers);
 const clarify=(value:{key:string;text:string})=>unrepeatedClarification(value,work.previousQuestions,localQuestion);
 const admitReady=async()=>Boolean((await pool.query("UPDATE lvd_conversations SET qualification='ready',retain_history=true,low_priority_expires_at=NULL WHERE id=$1 AND state='queued' AND ai_enabled AND ai_generation=$2 AND version=$3 AND $4::bigint=(SELECT max(id) FROM lvd_messages WHERE conversation_id=$1 AND role='user')",[id,token,work.version,messageId])).rowCount);
 try{
  if(policy.customerAIEnabled===false||policy.chatEnabled===false)throw new Error('Disabled');
  if(requiresHuman(localQuestion))throw new Error('Specialist required');
  const acknowledgement=work.previousAnswer&&!work.clarificationCount?acknowledgementText(work.question):null;
  const semanticIntake=work.consented&&initial&&!initial.retracted&&!isVagueIntakeReply(work.question)&&work.clarificationCount>0&&(!intake.topic||work.clarificationKeys.some(key=>key.split('.')[0]===initial.key.split('.')[0]));
  if(acknowledgement){qualification='needs_details';answer=acknowledgement;clarificationKey='acknowledgement';clarification=true;localClarification=true;}else if(initial&&!semanticIntake){qualification=!work.retainHistory&&!work.meaningfulHistory&&!intake.topic&&isVagueIntakeReply(work.question)?'low':'needs_details';answer=clarify(initial);clarificationKey=initial.key;clarification=true;localClarification=true;}else{
  unqualifiedAssessment=Boolean(initial)||work.consented&&!work.retainHistory&&!intake.topic;
  providerVersion=(await readRow('ai'))?.version;
  const connection=await activeValues('ai');if(!connection)throw new Error('Provider not connected');
  const ruleQuestion=questionWithHistory(work.intakeQuestion,work.context);
  rules=await activeAnswerRules(work.country,ruleQuestion);
  const limit=policy.aiDailyRequests||0;if(!limit)throw new Error('Budget disabled');
  if(work.consented){
   rag=true;
   const question=questionWithHistory(work.intakeQuestion,work.context);
   if(requiresHuman(question)){unqualifiedAssessment=false;throw new Error('Specialist required');}
   await reserveBudget(limit);
   let assessment;
   try{assessment=await assessIntake(question,connection,rules,{asked:work.clarificationKeys,required:initial?.key,requiredQuestion:initial?.text});}catch{
    if(unqualifiedAssessment)throw new Error('Intake unavailable');
    console.info('Intake assessment unavailable; using local completeness gate');
   }
   unqualifiedAssessment=false;
   if(initial&&(!assessment||assessment.status==='ready'))assessment={status:'needs_details' as const,detail:'situation' as const};
   if(assessment&&assessment.status!=='ready'){
    qualification=assessment.status==='low'&&(work.retainHistory||work.meaningfulHistory)?'needs_details':assessment.status;
    clarification=true;localClarification=true;assessed=true;rag=false;
    const detail=assessment.detail||'goal';clarificationKey=initial?.key||'intake.'+detail;
    const followup=initial||{key:clarificationKey,text:clarificationText(detail,question)};
    const proposed=assessment.question;answer=proposed&&!isRepeatedClarification(proposed,work.previousQuestions)?proposed:clarify(followup);
   }else{
   if(!await admitReady())return;
   const found=await retrieve(question,work.country,connection);
   if(!found.evidence.length)throw new Error('Outside approved coverage');
   const selection=await selectPassages(question,found.evidence,connection,policy.aiMaxOutputTokens||700,rules,groundedPreviousAnswer(work.previousAnswer,found.sources));
   if(selection.kind==='answer'){
    const used=new Set(selection.passages.map(p=>p.key));
    ragSources=found.sources.filter(source=>used.has('source-'+source.id));
    answer=selection.passages.map(p=>p.quote).join('\n\n');
   }else if(selection.kind==='clarify-details'||selection.kind==='clarify-country'){
    const followup=work.clarificationCount<MAX_CLARIFICATIONS?nextClarification(localQuestion,work.clarificationKeys,selection.kind==='clarify-country'?'country':selection.detail):null;
    if(!followup)throw new Error('Insufficient evidence');
    qualification='needs_details';ragSources=found.sources;clarification=true;clarificationKey=followup.key;answer=followup.text;
   }else throw new Error('Insufficient evidence');
   }
  }else{
   if(!await admitReady())return;
   // Legacy clients never send a customer question to the provider.
   faq=await findFaq(work.country,work.question);
   if(!faq)throw new Error('Outside approved coverage');
   answer=await formatter(faq,connection,policy.aiMaxOutputTokens||700,limit,rules);
  }
  }
 }catch(error){
  // Bounded operational codes only; no question, transcript or credentials in logs.
  const reasons:Record<string,string>={'Disabled':'disabled','Specialist required':'personal-case','Provider not connected':'provider-disabled','Budget disabled':'budget-disabled','Budget exceeded':'budget-exhausted','Provider quota':'provider-quota','Provider unavailable':'provider-unavailable','Outside approved coverage':'no-source','Insufficient evidence':'insufficient-evidence'};
  if(unqualifiedAssessment){
   qualification='needs_details';rag=false;clarification=true;localClarification=true;clarificationKey=initial?.key||'intake.goal';answer=clarify(initial||{key:clarificationKey,text:clarificationText('goal',work.question)});
   console.info('Intake assessment unavailable; retaining unqualified request');
  }else console.info('Assistant handoff',error instanceof Error?reasons[error.message]||'processing-error':'processing-error');
 }
 await transaction(async db=>{
  const conversation=(await db.query('SELECT * FROM lvd_conversations WHERE id=$1 FOR UPDATE',[id])).rows[0];
  if(!conversation||conversation.state!=='queued'||!conversation.ai_enabled||conversation.ai_generation!==token||conversation.version!==work.version)return;
  const latest=(await db.query("SELECT id FROM lvd_messages WHERE conversation_id=$1 AND role='user' ORDER BY id DESC LIMIT 1",[id])).rows[0];
  if(String(latest?.id)!==String(messageId))return;
  let invalidAssessment=false;
  if(answer&&(!localClarification||assessed)){
   const ruleQuestion=questionWithHistory(work.intakeQuestion,work.context);
   const currentRules=await activeAnswerRules(work.country,ruleQuestion,db,true);
   if(rulesRevision(currentRules)!==rulesRevision(rules)){answer=null;invalidAssessment=assessed;}
  }
  if(answer&&assessed){const provider=(await db.query("SELECT enabled,version FROM lvd_integrations WHERE provider='ai' FOR SHARE")).rows[0];if(!provider?.enabled||provider.version!==providerVersion){answer=null;invalidAssessment=true;}}
  if(invalidAssessment&&(initial||!work.retainHistory&&!intake.topic)){qualification='needs_details';clarificationKey=initial?.key||'intake.goal';answer=clarify(initial||{key:clarificationKey,text:clarificationText('goal',work.question)});}
  if(answer&&localClarification){
   const settings=(await db.query('SELECT customer_a_i_enabled,chat_enabled FROM site_settings LIMIT 1 FOR SHARE')).rows[0];
   if(settings?.customer_a_i_enabled===false||settings?.chat_enabled===false)answer=null;
  }
  if(answer&&faq){
   const current=(await db.query('SELECT * FROM knowledge WHERE id=$1 FOR SHARE',[faq.id])).rows[0] as Faq|undefined;
   const settings=(await db.query('SELECT customer_a_i_enabled,chat_enabled FROM site_settings LIMIT 1 FOR SHARE')).rows[0];
   const provider=(await db.query("SELECT enabled,version FROM lvd_integrations WHERE provider='ai' FOR SHARE")).rows[0];
   const unambiguous=(await db.query("SELECT id FROM knowledge WHERE entry_type='knowledge' AND lvd_knowledge_keys(title,question_aliases) @> ARRAY[lvd_question_key($1)] AND jurisdiction=ANY($2::enum_knowledge_jurisdiction[]) AND approved AND _status='published' AND effective_from<=now() AND review_due_at>now() AND (expires_at IS NULL OR expires_at>now()) ORDER BY id LIMIT 2",[work.question,sourceScopes(work.country,work.question)])).rows;
   if(unambiguous.length!==1||unambiguous[0].id!==faq.id)answer=null;
   const providerChanged=providerVersion===undefined?Boolean(provider):!provider?.enabled||provider.version!==providerVersion;
   if(!current||!eligible(current)||!sourceInScope(current.jurisdiction,work.country,work.question)||!matchesQuestion(work.question,current)||faqRevision(current)!==faqRevision(faq)||settings?.customer_a_i_enabled===false||settings?.chat_enabled===false||providerChanged)answer=null;
  }
  if(answer&&rag){
   const question=questionWithHistory(work.intakeQuestion,work.context);
   const settings=(await db.query('SELECT customer_a_i_enabled,chat_enabled FROM site_settings LIMIT 1 FOR SHARE')).rows[0];
   const provider=(await db.query("SELECT enabled,version FROM lvd_integrations WHERE provider='ai' FOR SHARE")).rows[0];
   if(!provider?.enabled||provider.version!==providerVersion||settings?.customer_a_i_enabled===false||settings?.chat_enabled===false)answer=null;
   // Recheck all citations immediately before sending, including the durable index generation.
   for(const source of [...ragSources].sort((a,b)=>a.id-b.id)){
    const current=(await db.query('SELECT * FROM knowledge WHERE id=$1 FOR SHARE',[source.id])).rows[0] as Faq|undefined;
    const job=(await db.query('SELECT status,indexed_revision FROM lvd_rag_jobs WHERE source_id=$1 FOR SHARE',[source.id])).rows[0];
    if(!current||!eligible(current)||!sourceInScope(current.jurisdiction,work.country,question)||faqRevision(current)!==faqRevision(source)||job?.status!=='ready'||job.indexed_revision!==faqRevision(current))answer=null;
   }
   if(!ragSources.length)answer=null;
  }
  const cited=rag?ragSources:faq?[faq]:[];
  const metadata=answer?{kind:clarification?'clarify':'ai',...(clarification?{clarificationKey}:{}),...(rag?{retrieval:'semantic-v1'}:{}),sources:clarification?[]:cited.map(source=>({...answerCitation(source),revision:new Date(source.updated_at).toISOString()+'#'+faqRevision(source).slice(0,12)}))}:{kind:'handoff'};
  await db.query("INSERT INTO lvd_messages(conversation_id,role,body,internal,actor_key,client_key,metadata) VALUES($1,'assistant',$2,false,'assistant',$3,$4) ON CONFLICT(conversation_id,client_key) DO NOTHING",[id,answer||handoffText,replyKey,JSON.stringify(metadata)]);
  const finalQualification=qualification==='low'&&conversation.retain_history?'needs_details':qualification;
  await db.query("UPDATE lvd_conversations SET ai_enabled=$2,ai_generation=NULL,ai_started_at=NULL,ai_message_id=NULL,qualification=$4,low_priority_expires_at=CASE WHEN $4='low' AND $2 THEN clock_timestamp()+interval '2 hours' ELSE NULL END,version=version+$3,updated_at=clock_timestamp() WHERE id=$1",[id,Boolean(answer),answer?0:1,finalQualification]);
  await db.query('INSERT INTO lvd_chat_events(conversation_id,action,version) SELECT id,$2,version FROM lvd_conversations WHERE id=$1',[id,answer?'ai.reply':'ai.handoff']);
 });
}
