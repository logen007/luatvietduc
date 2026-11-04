import {randomUUID} from 'node:crypto';
import {pool,transaction} from '../shared/db';
import {activeValues,readRow} from '../integrations/store';
import {eligible,faqRevision,type Faq} from '../assistant/faq';
import {chunks,pointId,vector} from './core';
import {embed} from './provider';
import {ensureCollection,vectorRequest} from './vectors';
export async function indexNext(){
 const lock=await pool.connect();
 try{
  if(!(await lock.query('SELECT pg_try_advisory_lock(20491104) AS acquired')).rows[0].acquired)return false;
  const connection=await activeValues('ai');
  await lock.query("INSERT INTO lvd_rag_worker(id,state) VALUES(true,$1) ON CONFLICT(id) DO UPDATE SET heartbeat_at=now(),state=EXCLUDED.state",[connection?'running':'provider-disabled']);
  if(!connection)return false;
  if(await ensureCollection())await lock.query("UPDATE lvd_rag_jobs SET generation=generation+1,status='pending',available_at=now(),lease=NULL,lease_until=NULL,error_code=NULL,updated_at=now()");
  // Date boundaries do not fire publication triggers. Reconcile future-effective/expired/overdue sources too.
  await lock.query("UPDATE lvd_rag_jobs j SET status='pending',available_at=now(),updated_at=now() FROM knowledge k WHERE j.source_id=k.id AND j.status='ready' AND ((j.indexed_revision IS NULL AND k.approved AND k._status='published' AND k.effective_from<=now() AND k.review_due_at>now() AND (k.expires_at IS NULL OR k.expires_at>now())) OR (j.indexed_revision IS NOT NULL AND (NOT k.approved OR k._status<>'published' OR k.effective_from>now() OR k.review_due_at<=now() OR k.expires_at<=now())))");
  const token=randomUUID();
  const job=await transaction(async db=>{
   const row=(await db.query("SELECT * FROM lvd_rag_jobs WHERE available_at<=now() AND (status IN ('pending','waiting') OR (status='processing' AND lease_until<now())) ORDER BY available_at,source_id FOR UPDATE SKIP LOCKED LIMIT 1")).rows[0];
   if(!row)return null;
   await db.query("UPDATE lvd_rag_jobs SET status='processing',lease=$2,lease_until=now()+interval '5 minutes',updated_at=now() WHERE source_id=$1",[row.source_id,token]);return row;
  });
  if(!job)return false;
  try{
   const providerVersion=(await readRow('ai'))?.version;
   const source=(await pool.query('SELECT * FROM knowledge WHERE id=$1',[job.source_id])).rows[0] as Faq|undefined;
   const revision=source&&eligible(source)?faqRevision(source):null;
   const pieces=revision?chunks(source!.body):[];
   const points:{id:string;vector:number[];payload:{source_id:number;revision:string|null;jurisdiction:string}}[]=[];
   for(let i=0;i<pieces.length;i++){
    const id=pointId(job.source_id,revision!,i);
    const cached=(await pool.query('SELECT embedding FROM lvd_rag_embeddings WHERE id=$1',[id])).rows[0];
    let embedding:number[];
    if(cached)embedding=vector(cached.embedding);
    else{
     const budget=await pool.query('INSERT INTO lvd_rag_usage(day,count) VALUES(current_date,1) ON CONFLICT(day) DO UPDATE SET count=lvd_rag_usage.count+1 WHERE lvd_rag_usage.count<2000 RETURNING count');
     if(!budget.rowCount)throw new Error('Index daily quota');
     embedding=await embed(pieces[i],'RETRIEVAL_DOCUMENT',connection,source!.title);
     await pool.query('INSERT INTO lvd_rag_embeddings(id,source_id,revision,embedding) VALUES($1,$2,$3,$4) ON CONFLICT(id) DO NOTHING',[id,job.source_id,revision,JSON.stringify(embedding)]);
    }
    points.push({id,vector:embedding,payload:{source_id:job.source_id,revision,jurisdiction:source!.jurisdiction}});
   }
   if(points.length)await vectorRequest('/points?wait=true','PUT',{points});
   const committed=await transaction(async db=>{
    const current=(await db.query('SELECT * FROM knowledge WHERE id=$1 FOR SHARE',[job.source_id])).rows[0] as Faq|undefined;
    const currentJob=(await db.query('SELECT * FROM lvd_rag_jobs WHERE source_id=$1 FOR UPDATE',[job.source_id])).rows[0];
    const provider=(await db.query("SELECT version,enabled FROM lvd_integrations WHERE provider='ai' FOR SHARE")).rows[0];
    if(currentJob?.lease!==token||String(currentJob.generation)!==String(job.generation)||(current&&eligible(current)?faqRevision(current):null)!==revision||providerVersion!==provider?.version||!provider?.enabled)return false;
    await vectorRequest('/points/delete?wait=true','POST',{filter:{must:[{key:'source_id',match:{value:job.source_id}}],...(revision?{must_not:[{key:'revision',match:{value:revision}}]}:{})}});
    await db.query('DELETE FROM lvd_rag_embeddings WHERE source_id=$1 AND ($2::text IS NULL OR revision<>$2)',[job.source_id,revision]);
    await db.query('DELETE FROM lvd_rag_chunks WHERE source_id=$1',[job.source_id]);
    for(let i=0;i<pieces.length;i++)await db.query('INSERT INTO lvd_rag_chunks(id,source_id,revision,ordinal,body) VALUES($1,$2,$3,$4,$5)',[points[i].id,job.source_id,revision,i,pieces[i]]);
    await db.query("UPDATE lvd_rag_jobs SET status='ready',indexed_revision=$2,lease=NULL,lease_until=NULL,error_code=NULL,attempts=0,updated_at=now() WHERE source_id=$1",[job.source_id,revision]);return true;
   });
   // Only index jobs write vectors, serialized by a dedicated session lock. Stale revisions are never trusted by retrieval.
   if(!committed)await pool.query("UPDATE lvd_rag_jobs SET status='pending',lease=NULL,lease_until=NULL WHERE source_id=$1 AND lease=$2",[job.source_id,token]);
   return true;
  }catch(error){
   const message=error instanceof Error?error.message:'';
   const code=message==='Index daily quota'?'daily-quota':message==='Provider quota'?'provider-quota':'retry';
   await pool.query("UPDATE lvd_rag_jobs SET status='waiting',attempts=attempts+1,error_code=$3,available_at=CASE WHEN $3='daily-quota' THEN date_trunc('day',now())+interval '1 day' ELSE now()+make_interval(secs=>LEAST(3600,60*power(2,LEAST(attempts,6))::integer)) END,lease=NULL,lease_until=NULL,updated_at=now() WHERE source_id=$1 AND lease=$2",[job.source_id,token,code]);return false;
  }
 }finally{try{await lock.query('SELECT pg_advisory_unlock(20491104)');}finally{lock.release();}}
}
