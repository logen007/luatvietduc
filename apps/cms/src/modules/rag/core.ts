import {createHash} from 'node:crypto';
export const EMBEDDING_MODEL='gemini-embedding-001';
export const DIMENSIONS=768;
export const CONSENT_VERSION='gemini-rag-v1';
export const COLLECTION='lvd_knowledge_gemini001_768_v1';
export const MIN_SCORE=0.72;
export function chunks(body:string,size=1800,overlap=240){
 const text=body.replace(/\r\n/g,'\n').trim(),result:string[]=[];
 for(let start=0;start<text.length;){
  let end=Math.min(text.length,start+size);
  if(end<text.length){const boundary=text.lastIndexOf('\n',end);if(boundary>start+size/2)end=boundary;}
  result.push(text.slice(start,end));if(end===text.length)break;start=Math.max(start+1,end-overlap);
 }
 return result;
}
export function vector(value:unknown):number[]{
 if(!Array.isArray(value)||value.length!==DIMENSIONS||value.some(v=>typeof v!=='number'||!Number.isFinite(v)))throw new Error('Invalid embedding');
 const norm=Math.hypot(...value);if(norm<0.00001)throw new Error('Empty embedding');return value.map(v=>v/norm);
}
export function pointId(source:number,revision:string,ordinal:number){
 const h=createHash('sha256').update(`${COLLECTION}:${source}:${revision}:${ordinal}`).digest('hex');
 return `${h.slice(0,8)}-${h.slice(8,12)}-4${h.slice(13,16)}-a${h.slice(17,20)}-${h.slice(20,32)}`;
}
export type Evidence={key:string;sourceId:number;title:string;text:string;revision:string;score:number};
export type Selection={kind:'answer';passages:{key:string;quote:string}[]}|{kind:'clarify-country'}|{kind:'handoff'};
// The model selects relevant source passages, never authors legal claims. Exact text and citations are enforced here.
export function validateSelection(value:unknown,evidence:Evidence[]):Selection{
 const v=value as any;
 if(v?.kind==='handoff'||v?.kind==='clarify-country')return {kind:v.kind};
 if(v?.kind!=='answer'||!Array.isArray(v.passages)||!v.passages.length||v.passages.length>6)throw new Error('Unsupported answer');
 const seen=new Set<string>(),passages:{key:string;quote:string}[]=[];
 for(const p of v.passages){
  const source=evidence.find(e=>e.key===p.key);
  if(!source||source.score<MIN_SCORE||typeof p.quote!=='string'||p.quote.trim().length<20||p.quote.length>2400||!source.text.includes(p.quote)||seen.has(p.key+'\n'+p.quote))throw new Error('Unsupported passage');
  // Whole paragraphs preserve nearby conditions; arbitrary fragments can reverse a legal meaning.
  const paragraphs=source.text.split(/\n\s*\n/).map(x=>x.trim()).filter(Boolean);
  if(!paragraphs.includes(p.quote.trim()))throw new Error('Incomplete paragraph');
  seen.add(p.key+'\n'+p.quote);passages.push({key:p.key,quote:p.quote.trim()});
 }
 if(passages.reduce((sum,p)=>sum+p.quote.length,0)>7000)throw new Error('Answer too long');
 return {kind:'answer',passages};
}
