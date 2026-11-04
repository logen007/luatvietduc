import {randomUUID} from 'node:crypto';
import {transaction} from '../shared/db';
import {activeValues,readRow} from '../integrations/store';
import {HttpError,isCustomer,type Actor} from '../chat/service';
import {findFaq,eligible,matchesQuestion,requiresHuman,faqRevision,type Faq} from './faq';
import {sourceScopes,sourceInScope} from './scope';
import {formatFaq} from './format';
import {CONSENT_VERSION} from '../rag/core';
import {retrieve} from '../rag/retrieve';
import {reserveBudget,selectPassages} from '../rag/provider';
type Policy={customerAIEnabled?:boolean|null;chatEnabled?:boolean|null;aiDailyRequests?:number|null;aiMaxOutputTokens?:number|null};
type Formatter=(faq:Faq,connection:Record<string,string>,maxTokens:number,dailyLimit:number)=>Promise<string>;
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
  const previous=(await db.query("SELECT role,body,metadata FROM lvd_messages WHERE conversation_id=$1 AND id<$2 AND NOT internal ORDER BY id DESC LIMIT 3",[id,message.id])).rows;
  const clarify=previous[0]?.role==='assistant'&&previous[0]?.metadata?.kind==='clarify';
  const context=clarify?previous.find(row=>row.role==='user'&&row.metadata?.aiConsent?.version===CONSENT_VERSION)?.body:null;
  return {question:String(message.body),consented:message.metadata?.aiConsent?.version===CONSENT_VERSION,context,clarify,country:conversation.jurisdiction,version:conversation.version};
 });
 if(!work)return;
 let answer:string|null=null,faq:Faq|null=null,providerVersion:number|undefined;
 let ragSources:Faq[]=[],rag=false,clarification=false;
 try{
  if(policy.customerAIEnabled===false||policy.chatEnabled===false)throw new Error('Disabled');
  if(requiresHuman(work.question))throw new Error('Specialist required');
  providerVersion=(await readRow('ai'))?.version;
  const connection=await activeValues('ai');if(!connection)throw new Error('Provider not connected');
  const limit=policy.aiDailyRequests||0;if(!limit)throw new Error('Budget disabled');
  if(work.consented){
   rag=true;
   const question=work.context?String(work.context)+'\nCâu hỏi tiếp: '+work.question:work.question;
   if(requiresHuman(question))throw new Error('Specialist required');
   await reserveBudget(limit);
   const found=await retrieve(question,work.country,connection);
   if(!found.evidence.length)throw new Error('Outside approved coverage');
   const selection=await selectPassages(question,found.evidence,connection,policy.aiMaxOutputTokens||700);
   if(selection.kind==='answer'){
    const used=new Set(selection.passages.map(p=>p.key));
    ragSources=found.sources.filter(source=>used.has('source-'+source.id));
    answer=selection.passages.map(p=>p.quote).join('\n\n');
   }else if(selection.kind==='clarify-country'&&!work.clarify){
    ragSources=found.sources;clarification=true;answer='Bạn muốn tìm hiểu quy định tại Việt Nam, tại Đức hay liên quan đến cả hai nước?';
   }else throw new Error('Insufficient evidence');
  }else{
   // Legacy clients without this message's consent retain the public-source-only formatter.
   faq=await findFaq(work.country,work.question);
   if(!faq)throw new Error('Outside approved coverage');
   answer=await formatter(faq,connection,policy.aiMaxOutputTokens||700,limit);
  }
 }catch{/* Fall through to a recorded specialist handoff. Never generate an unsupported fallback. */}
 await transaction(async db=>{
  const conversation=(await db.query('SELECT * FROM lvd_conversations WHERE id=$1 FOR UPDATE',[id])).rows[0];
  if(!conversation||conversation.state!=='queued'||!conversation.ai_enabled||conversation.ai_generation!==token||conversation.version!==work.version)return;
  const latest=(await db.query("SELECT id FROM lvd_messages WHERE conversation_id=$1 AND role='user' ORDER BY id DESC LIMIT 1",[id])).rows[0];
  if(String(latest?.id)!==String(messageId))return;
  if(answer&&faq){
   const current=(await db.query('SELECT * FROM knowledge WHERE id=$1 FOR SHARE',[faq.id])).rows[0] as Faq|undefined;
   const settings=(await db.query('SELECT customer_a_i_enabled,chat_enabled FROM site_settings LIMIT 1 FOR SHARE')).rows[0];
   const provider=(await db.query("SELECT enabled,version FROM lvd_integrations WHERE provider='ai' FOR SHARE")).rows[0];
   const unambiguous=(await db.query("SELECT id FROM knowledge WHERE lvd_knowledge_keys(title,question_aliases) @> ARRAY[lvd_question_key($1)] AND jurisdiction=ANY($2::enum_knowledge_jurisdiction[]) AND approved AND _status='published' AND effective_from<=now() AND review_due_at>now() AND (expires_at IS NULL OR expires_at>now()) ORDER BY id LIMIT 2",[work.question,sourceScopes(work.country,work.question)])).rows;
   if(unambiguous.length!==1||unambiguous[0].id!==faq.id)answer=null;
   const providerChanged=providerVersion===undefined?Boolean(provider):!provider?.enabled||provider.version!==providerVersion;
   if(!current||!eligible(current)||!sourceInScope(current.jurisdiction,work.country,work.question)||!matchesQuestion(work.question,current)||faqRevision(current)!==faqRevision(faq)||settings?.customer_a_i_enabled===false||settings?.chat_enabled===false||providerChanged)answer=null;
  }
  if(answer&&rag){
   const question=work.context?String(work.context)+'\nCâu hỏi tiếp: '+work.question:work.question;
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
  const metadata=answer?{kind:clarification?'clarify':'ai',...(rag?{retrieval:'semantic-v1'}:{}),sources:clarification?[]:cited.map(source=>({id:source.id,title:source.title,url:source.source_url,revision:new Date(source.updated_at).toISOString()+'#'+faqRevision(source).slice(0,12)}))}:{kind:'handoff'};
  await db.query("INSERT INTO lvd_messages(conversation_id,role,body,internal,actor_key,client_key,metadata) VALUES($1,'assistant',$2,false,'assistant',$3,$4) ON CONFLICT(conversation_id,client_key) DO NOTHING",[id,answer||handoffText,replyKey,JSON.stringify(metadata)]);
  await db.query('UPDATE lvd_conversations SET ai_enabled=$2,ai_generation=NULL,ai_started_at=NULL,ai_message_id=NULL,version=version+$3,updated_at=clock_timestamp() WHERE id=$1',[id,Boolean(answer),answer?0:1]);
  await db.query('INSERT INTO lvd_chat_events(conversation_id,action,version) SELECT id,$2,version FROM lvd_conversations WHERE id=$1',[id,answer?'ai.reply':'ai.handoff']);
 });
}
