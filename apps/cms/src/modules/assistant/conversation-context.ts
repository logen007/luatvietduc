import type {ClarificationMessage} from './clarification';
export const MAX_CONTEXT_BYTES=12000,MAX_RETRIEVAL_BYTES=1800;
const bytes=(value:string)=>Buffer.byteLength(value,'utf8');
// Preserve early customer facts and recent corrections, within a fixed request
// budget. Only individually consented customer turns enter provider context.
export function answerHistory(previous:ClarificationMessage[],consentVersion:string){
 const users=previous.filter(row=>row.role==='user'&&row.metadata?.aiConsent?.version===consentVersion&&typeof row.body==='string').reverse();
 const chosen=new Set<number>();let total=0;
 for(let index=0;index<Math.min(2,users.length);index++){const size=bytes(String(users[index].body))+2;if(total+size>MAX_CONTEXT_BYTES/3)break;chosen.add(index);total+=size;}
 for(let index=users.length-1;index>=0;index--){if(chosen.has(index))continue;const size=bytes(String(users[index].body))+2;if(total+size>MAX_CONTEXT_BYTES)continue;chosen.add(index);total+=size;}
 return [...chosen].sort((a,b)=>a-b).map(index=>String(users[index].body)).join('\n\n');
}
export const questionWithHistory=(question:string,context:string)=>context?'Hội thoại trước:\n'+context+'\nCâu hỏi tiếp: '+question:question;
// Search embeddings have a smaller input window than the answer selector.
// Keep both initial facts and the latest question; never cut a UTF-8 character.
export function retrievalText(question:string){
 if(bytes(question)<=MAX_RETRIEVAL_BYTES)return question;
 const take=(text:string,budget:number,tail=false)=>{const chars=Array.from(text);if(tail)chars.reverse();const picked:string[]=[];let total=0;for(const char of chars){const size=bytes(char);if(total+size>budget)break;picked.push(char);total+=size;}return (tail?picked.reverse():picked).join('');};
 return take(question,600)+'\n…\n'+take(question,MAX_RETRIEVAL_BYTES-605,true);
}
