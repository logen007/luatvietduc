import {eligible,faqBody,faqRevision,type Faq} from './faq';
import {contextualIntakeHistory,currentIntakeContext,type ClarificationMessage} from './clarification';
export const MAX_CONTEXT_BYTES=12000,MAX_RETRIEVAL_BYTES=1800;
const bytes=(value:string)=>Buffer.byteLength(value,'utf8');
// Preserve early customer facts and recent corrections, within a fixed request
// budget. Only individually consented customer turns enter provider context.
export function answerHistory(previous:ClarificationMessage[],consentVersion:string){
 const contextual=contextualIntakeHistory(previous);
 const users=previous.filter(row=>row.role==='user'&&row.metadata?.aiConsent?.version===consentVersion&&typeof row.body==='string').reverse();
 const chosen=new Set<number>();let total=0;
 const text=(index:number)=>contextual.get(users[index])||String(users[index].body);
 const active=currentIntakeContext(users.map((_,index)=>text(index)).join('\n'));
 if(active.topic){
  // Never keep older facts while dropping the turn that started a new matter.
  // Reserve its whole turn first, including boundaries inside multiline turns.
  let remaining=active.text.split('\n').length,boundary=users.length-1;
  for(let index=users.length-1;index>=0;index--){const count=text(index).split('\n').filter(line=>line.trim()).length;if(remaining<=count){boundary=index;break;}remaining-=count;}
  const size=bytes(text(boundary))+2;
  if(size>MAX_CONTEXT_BYTES)return '';
  chosen.add(boundary);total+=size;
 }
 for(let index=0;index<Math.min(2,users.length);index++){if(chosen.has(index))continue;const size=bytes(text(index))+2;if(total+size>MAX_CONTEXT_BYTES/3)break;chosen.add(index);total+=size;}
 for(let index=users.length-1;index>=0;index--){if(chosen.has(index))continue;const size=bytes(contextual.get(users[index])||String(users[index].body))+2;if(total+size>MAX_CONTEXT_BYTES)continue;chosen.add(index);total+=size;}
 const selected=[...chosen].sort((a,b)=>a-b).map(index=>text(index)).join('\n\n');
 // Omitting an intermediate same-topic reset can rename property-3 to
 // property-2 and attach older question/answer keys to the current matter.
 // Refuse that inherited history rather than reinterpret a scoped identity.
 return currentIntakeContext(selected).scope===active.scope?selected:'';
}
export const questionWithHistory=(question:string,context:string)=>context?'Hội thoại trước:\n'+context+'\nCâu hỏi tiếp: '+question:question;
// Search embeddings have a smaller input window than the answer selector.
// Keep both initial facts and the latest question; never cut a UTF-8 character.
export function retrievalText(question:string){
 if(bytes(question)<=MAX_RETRIEVAL_BYTES)return question;
 const take=(text:string,budget:number,tail=false)=>{const chars=Array.from(text);if(tail)chars.reverse();const picked:string[]=[];let total=0;for(const char of chars){const size=bytes(char);if(total+size>budget)break;picked.push(char);total+=size;}return (tail?picked.reverse():picked).join('');};
 return take(question,600)+'\n…\n'+take(question,MAX_RETRIEVAL_BYTES-605,true);
}

// A previous answer is reference data only. Do not forward staff text, old rules,
// or quotations whose exact source revision is no longer in current retrieval.
export function groundedPreviousAnswer(value:unknown,sources:Faq[]):string|undefined{
 const row=value as {role?:unknown;body?:unknown;metadata?:{kind?:unknown;sources?:unknown}}|null;
 if(row?.role!=='assistant'||row.metadata?.kind!=='ai'||typeof row.body!=='string'||!row.body.trim()||row.body.length>7000||!Array.isArray(row.metadata.sources)||!row.metadata.sources.length||row.metadata.sources.length>3)return;
 const cited:Faq[]=[];
 for(const item of row.metadata.sources){
  if(!item||typeof item!=='object')return;
  const {id,revision}=item as {id?:unknown;revision?:unknown},source=sources.find(source=>source.id===id);
  if(!source||!eligible(source)||revision!==new Date(source.updated_at).toISOString()+'#'+faqRevision(source).slice(0,12))return;
  cited.push(source);
 }
 const paragraphs=cited.flatMap(source=>faqBody(source).split(/\n\s*\n/).map(text=>text.trim()).filter(Boolean));
 if(row.body.split(/\n\s*\n/).some(paragraph=>!paragraphs.includes(paragraph.trim())))return;
 return row.body;
}
