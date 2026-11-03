import {pool} from '../shared/db';
import {createHash} from 'node:crypto';
export type Faq={id:number;title:string;body:string;question_aliases:string|null;jurisdiction:string;source_url:string;updated_at:Date;effective_from:Date;review_due_at:Date;expires_at:Date|null;approved:boolean;_status:string};
type Question=Pick<Faq,'id'|'title'|'question_aliases'>;
const catalog=new Map<string,{until:number;questions:Question[]}>();
export const normalizeQuestion=(text:string)=>text.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').replace(/Đ/g,'D').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
export function requiresHuman(text:string){return /[\w.+-]+@[\w.-]+\.[a-z]{2,}|\d{8,}/i.test(text)||/\b(ho so|cua toi|ket luan vu viec|du doan ket qua|nguoi that|chuyen vien|bo qua quy tac|bo qua huong dan)\b/.test(normalizeQuestion(text));}
export function faqRevision(faq:Faq){return createHash('sha256').update(JSON.stringify([faq.title,faq.body,faq.question_aliases,faq.jurisdiction,faq.source_url,faq.effective_from,faq.expires_at,faq.review_due_at,faq.updated_at])).digest('hex');}
export function matchesQuestion(question:string,faq:Question){const key=normalizeQuestion(question);return [faq.title,...(faq.question_aliases||'').split('\n')].some(value=>key&&normalizeQuestion(value)===key);}
export function eligible(faq:Faq,now=Date.now()){
 return faq.approved&&faq._status==='published'&&new Date(faq.effective_from).getTime()<=now&&new Date(faq.review_due_at).getTime()>now&&(!faq.expires_at||new Date(faq.expires_at).getTime()>now);
}
export function publicFaq(faq:Faq){
 // This is the complete model payload: no customer question, identity, transcript or files.
 return {title:faq.title,jurisdiction:faq.jurisdiction,paragraphs:faq.body.trim().split(/\n\s*\n/).filter(Boolean)};
}
export function clearFaqCatalog(){catalog.clear();}
async function questions(country:string,fresh=false){
 if(!['VN','DE'].includes(country))return [];
 const cached=catalog.get(country);if(!fresh&&cached&&cached.until>Date.now())return cached.questions;
 const rows=(await pool.query("SELECT id,title,question_aliases FROM knowledge WHERE jurisdiction=$1 AND approved AND _status='published' AND effective_from<=now() AND review_due_at>now() AND (expires_at IS NULL OR expires_at>now()) ORDER BY updated_at DESC LIMIT 1000",[country])).rows as Question[];
 catalog.set(country,{until:Date.now()+10000,questions:rows});return rows;
}
export async function suggestedQuestions(country:string){return (await questions(country,true)).slice(0,4).map(({id,title})=>({id,title}));}
export async function findFaq(country:string,question:string):Promise<Faq|null>{
 const matches=(await questions(country,true)).filter(faq=>matchesQuestion(question,faq));
 // Exact canonical question / specialist-approved alias is the coverage gate, not keyword confidence.
 if(matches.length!==1)return null;
 const row=(await pool.query('SELECT * FROM knowledge WHERE id=$1 AND jurisdiction=$2',[matches[0].id,country])).rows[0] as Faq|undefined;
 if(!row||!eligible(row)||!matchesQuestion(question,row)||!row.body?.trim()||row.body.length>16000)return null;
 try{if(new URL(row.source_url).protocol!=='https:')return null;}catch{return null;}
 return row;
}
