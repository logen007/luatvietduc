import {pool} from '../shared/db';
import {faqRevision,eligible,type Faq} from '../assistant/faq';
import {sourceScopes} from '../assistant/scope';
import type {Values} from '../integrations/catalog';
import {embed} from './provider';
import {searchVectors} from './vectors';
import {MIN_SCORE,type Evidence} from './core';
export type Retrieval={evidence:Evidence[];sources:Faq[]};
export async function retrieve(question:string,country:string,connection:Values):Promise<Retrieval>{
 const hits=await searchVectors(await embed(question,'RETRIEVAL_QUERY',connection),sourceScopes(country,question));
 if(!hits.length)return {evidence:[],sources:[]};
 const rows=(await pool.query("SELECT k.*,c.id AS point_id,c.revision AS indexed_revision FROM lvd_rag_chunks c JOIN knowledge k ON k.id=c.source_id JOIN lvd_rag_jobs j ON j.source_id=k.id AND j.status='ready' AND j.indexed_revision=c.revision WHERE c.id=ANY($1::uuid[]) AND k.jurisdiction=ANY($2::enum_knowledge_jurisdiction[]) AND k.approved AND k._status='published' AND k.effective_from<=now() AND k.review_due_at>now() AND (k.expires_at IS NULL OR k.expires_at>now())",[hits.map(h=>h.id),sourceScopes(country,question)])).rows;
 const sources:Faq[]=[],evidence:Evidence[]=[];
 for(const hit of hits){
  const source=rows.find(r=>r.point_id===hit.id) as (Faq&{indexed_revision:string})|undefined;
  if(!source||!eligible(source)||faqRevision(source)!==source.indexed_revision||hit.score<MIN_SCORE||sources.some(s=>s.id===source.id))continue;
  try{const url=new URL(source.source_url);if(url.protocol!=='https:'||url.username||url.password)continue;}catch{continue;}
  // Retrieval is by small chunks; generation sees the entire selected article to retain exceptions and conditions.
  if(!source.body.trim()||source.body.length>16000)continue;
  sources.push(source);evidence.push({key:'source-'+source.id,sourceId:source.id,title:source.title,text:source.body,revision:source.indexed_revision,score:hit.score});
  if(sources.length===3)break;
 }
 return {sources,evidence};
}
