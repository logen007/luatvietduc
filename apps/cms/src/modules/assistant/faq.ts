import {articleText} from '../content/article-body';
import {pool} from '../shared/db';
import {sourceScopes} from './scope';
import {createHash} from 'node:crypto';
export type Faq={id:number;title:string;body:string;question_aliases:string|null;jurisdiction:string;source_url:string;updated_at:Date;effective_from:Date;review_due_at:Date;expires_at:Date|null;approved:boolean;_status:string;entry_type?:'knowledge'|'rule';article_origin_id?:number|null};
type Question=Pick<Faq,'id'|'title'|'question_aliases'>;
// Keep numbers, operators and internal punctuation: removing them could widen a legal condition.
export const normalizeQuestion=(text:string)=>text.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').replace(/Đ/g,'D').toLowerCase().trim().replace(/[?!]+$/g,'').replace(/\s+/g,' ').trim();
export function requiresHuman(text:string){
 const question=normalizeQuestion(text);
 return /[\w.+-]+@[\w.-]+\.[a-z]{2,}|\d{8,}/i.test(text)
  ||/\b(ho so|cua toi|ket luan vu viec|du doan ket qua|nguoi that|chuyen vien|tu van truc tiep|noi chuyen voi nguoi|gap nguoi tu van|bo qua quy tac|bo qua huong dan)\b/.test(question)
  ||/\b(mein(?:e|er|en|em)? (?:akte|akten|fall|unterlagen|dokumente)|personliche (?:rechts)?beratung)\b/.test(question)
  ||/\b(?:ich (?:mochte|will)|(?:kann|konnte) ich) (?:bitte |gerne? )?(?:mit (?:einem |einer )?|(?:einen |eine )?)(?:menschen|mitarbeiter(?:in)?|berater(?:in)?|anwalt(?:in)?|fachkraft) (?:sprechen|reden|chatten)\b/.test(question);
}
export function faqBody(faq:Faq){return faq.article_origin_id?articleText(faq.body):faq.body;}
export function faqRevision(faq:Faq){const fields:unknown[]=[faq.title,faqBody(faq),faq.question_aliases,faq.jurisdiction,faq.source_url,faq.effective_from,faq.expires_at,faq.review_due_at,faq.updated_at];if(faq.entry_type==='rule')fields.push('rule');return createHash('sha256').update(JSON.stringify(fields)).digest('hex');}
export function matchesQuestion(question:string,faq:Question){const key=normalizeQuestion(question);return [faq.title,...(faq.question_aliases||'').split('\n')].some(value=>key&&normalizeQuestion(value)===key);}
export function eligible(faq:Faq,now=Date.now()){
 return faq.entry_type!=='rule'&&faq.approved&&faq._status==='published'&&new Date(faq.effective_from).getTime()<=now&&new Date(faq.review_due_at).getTime()>now&&(!faq.expires_at||new Date(faq.expires_at).getTime()>now);
}
export function publicFaq(faq:Faq){
 // This is the complete model payload: no customer question, identity, transcript or files.
 return {title:faq.title,jurisdiction:faq.jurisdiction,paragraphs:faqBody(faq).trim().split(/\n\s*\n/).filter(Boolean)};
}
// Compatibility hook; no process-wide catalog of private/source bodies is retained.
export function clearFaqCatalog(){}
export async function suggestedQuestions(country='BOTH'){
 return (await pool.query("SELECT id,title FROM knowledge WHERE article_origin_id IS NOT NULL AND entry_type='knowledge' AND jurisdiction=ANY($1::enum_knowledge_jurisdiction[]) AND approved AND _status='published' AND effective_from<=now() AND review_due_at>now() AND (expires_at IS NULL OR expires_at>now()) ORDER BY updated_at DESC,id DESC LIMIT 4",[sourceScopes(country)])).rows;
}
export async function findFaq(country:string,question:string):Promise<Faq|null>{
 const key=normalizeQuestion(question);if(!key)return null;
 const matches=(await pool.query("SELECT * FROM knowledge WHERE entry_type='knowledge' AND lvd_knowledge_keys(title,question_aliases) @> ARRAY[lvd_question_key($1)] AND jurisdiction=ANY($2::enum_knowledge_jurisdiction[]) AND approved AND _status='published' AND effective_from<=now() AND review_due_at>now() AND (expires_at IS NULL OR expires_at>now()) ORDER BY id LIMIT 2",[key,sourceScopes(country,question)])).rows as Faq[];
 // Ambiguous sources hand off; an index finds a key across the whole corpus, without a latest-1000 cutoff.
 if(matches.length!==1)return null;
 const row=matches[0];
 if(!eligible(row)||!matchesQuestion(question,row)||!faqBody(row)?.trim()||faqBody(row).length>16000)return null;
 try{if(new URL(row.source_url).protocol!=='https:')return null;}catch{return null;}
 return row;
}
