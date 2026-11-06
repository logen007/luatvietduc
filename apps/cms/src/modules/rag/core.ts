import {detailKinds,type DetailKind} from '../assistant/clarification';
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
export type Selection={kind:'answer';passages:{key:string;quote:string}[]}|{kind:'clarify-country'}|{kind:'clarify-details';detail:DetailKind}|{kind:'handoff'};
// A model may omit a paragraph's opening words. Repair only an exact,
// unambiguous substring by restoring its complete source paragraph. Validation
// below still checks sources, scores, duplicates, limits and every condition.
export function wholeParagraphSelection(value:unknown,evidence:Evidence[]):unknown{
 const data=value as any;
 if(data?.kind!=='answer'||!Array.isArray(data.passages)||data.passages.length>6)return value;
 return {...data,passages:data.passages.map((passage:any)=>{
  if(typeof passage?.quote!=='string'||passage.quote.trim().length<20||passage.quote.length>2400)return passage;
  const source=evidence.find(item=>item.key===passage.key);if(!source)return passage;
  const quote=passage.quote.trim(),paragraphs=source.text.split(/\n\s*\n/).map(text=>text.trim()).filter(Boolean);
  const matches=paragraphs.filter(paragraph=>paragraph.includes(quote));
  return matches.length===1&&matches[0].length<=2400?{...passage,quote:matches[0]}:passage;
 })};
}
// The model selects relevant source passages, never authors legal claims. Exact text and citations are enforced here.
export function validateSelection(value:unknown,evidence:Evidence[]):Selection{
 const v=value as any;
 if(v?.kind==='handoff'||v?.kind==='clarify-country')return {kind:v.kind};
 if(v?.kind==='clarify-details'){if(!detailKinds.includes(v.detail))throw new Error('Unsupported clarification');return {kind:'clarify-details',detail:v.detail};}
 if(v?.kind!=='answer'||!Array.isArray(v.passages)||!v.passages.length||v.passages.length>6)throw new Error('Unsupported answer');
 const seen=new Set<string>(),passages:{key:string;quote:string}[]=[];
 for(const p of v.passages){
  const source=evidence.find(e=>e.key===p.key);
  if(!source||!Number.isFinite(source.score)||source.score<MIN_SCORE||typeof p.quote!=='string'||p.quote.trim().length<20||p.quote.length>2400||!source.text.includes(p.quote)||seen.has(p.key+'\n'+p.quote.trim()))throw new Error('Unsupported passage');
  // Whole paragraphs preserve nearby conditions; arbitrary fragments can reverse a legal meaning.
  const paragraphs=source.text.split(/\n\s*\n/).map(x=>x.trim()).filter(Boolean);
  if(!paragraphs.includes(p.quote.trim()))throw new Error('Incomplete paragraph');
  seen.add(p.key+'\n'+p.quote.trim());passages.push({key:p.key,quote:p.quote.trim()});
 }
 for(const source of evidence.filter(e=>passages.some(p=>p.key===e.key))){
  const required=source.text.split(/\n\s*\n/).map(p=>p.trim()).filter(p=>/điều kiện|ngoại lệ|trừ khi|chỉ áp dụng|không áp dụng|lưu ý|hạn chế|cần chuyên viên|mandatory|exception|voraussetzung|bedingung|ausnahme|es sei denn|nur wenn|gilt nur|gelten nur|gilt nicht|gelten nicht|einschränkung|hinweis/i.test(p));
  if(required.some(quote=>!passages.some(p=>p.key===source.key&&p.quote===quote)))throw new Error('Missing source conditions');
 }
 if(passages.reduce((sum,p)=>sum+p.quote.length,0)>7000)throw new Error('Answer too long');
 return {kind:'answer',passages};
}
