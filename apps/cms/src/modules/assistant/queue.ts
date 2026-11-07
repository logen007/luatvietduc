import {randomUUID} from 'node:crypto';
import {pool,transaction} from '../shared/db';
import {HttpError,isCustomer,type Actor} from '../chat/service';
import type {User} from '../../payload-types';
import {replyToMessage} from './reply';
type RunAnswer=typeof replyToMessage;

// Compatibility/reconnect endpoint only enqueues. The message transaction owns
// initial creation, so a saved question cannot disappear between these steps.
export async function requestAnswer(actor:Actor,id:string,messageId:string){
 return transaction(async db=>{
  const c=(await db.query('SELECT * FROM lvd_conversations WHERE id=$1 FOR UPDATE',[id])).rows[0];
  if(!c||!isCustomer(actor,c))throw new HttpError(403,'Bạn không có quyền truy cập hội thoại này.');
  if(c.state!=='queued'||!c.ai_enabled)return;
  await db.query(`INSERT INTO lvd_answer_jobs(message_id,conversation_id)
   SELECT m.id,m.conversation_id FROM lvd_messages m WHERE m.id=$2 AND m.conversation_id=$1 AND m.role='user' AND COALESCE(m.metadata->>'kind','')<>'deleted'
   AND m.id=(SELECT max(id) FROM lvd_messages WHERE conversation_id=$1 AND role='user')
   AND NOT EXISTS(SELECT 1 FROM lvd_messages WHERE conversation_id=$1 AND client_key='assistant:'||m.id::text)
   ON CONFLICT(message_id) DO UPDATE SET status='pending',available_at=now(),updated_at=now()
   WHERE lvd_answer_jobs.status='done'`,[id,messageId]);
 });
}

export async function processNextAnswer(run:RunAnswer=replyToMessage){
 const lease=randomUUID();
 const job=await transaction(async db=>{
  const row=(await db.query(`SELECT * FROM lvd_answer_jobs WHERE available_at<=now()
   AND (status='pending' OR (status='processing' AND lease_until<now()))
   ORDER BY available_at,message_id FOR UPDATE SKIP LOCKED LIMIT 1`)).rows[0];
  if(!row)return null;
  await db.query("UPDATE lvd_answer_jobs SET status='processing',lease=$2,lease_until=now()+interval '90 seconds',attempts=attempts+1,updated_at=now() WHERE message_id=$1",[row.message_id,lease]);
  return row;
 });
 if(!job)return false;
 try{
  const c=(await pool.query('SELECT user_id,guest_hash,state,ai_enabled FROM lvd_conversations WHERE id=$1',[job.conversation_id])).rows[0];
  if(c?.state==='queued'&&c.ai_enabled){
   // Trusted worker reconstructs ownership from the current conversation; it
   // does not accept a user ID or transcript from an HTTP caller.
   const actor:Actor={user:c.user_id?{id:c.user_id} as User:null,guestHash:c.guest_hash||''};
   const policy=(await pool.query(`SELECT customer_a_i_enabled AS "customerAIEnabled",chat_enabled AS "chatEnabled",ai_daily_requests AS "aiDailyRequests",ai_max_output_tokens AS "aiMaxOutputTokens" FROM site_settings LIMIT 1`)).rows[0]||{};
   await run(actor,job.conversation_id,job.message_id,policy);
  }
  // Another in-flight generation may have briefly owned this conversation.
  // Keep the latest unanswered question pending rather than losing that job.
  const pending=(await pool.query(`SELECT 1 FROM lvd_conversations c WHERE c.id=$1 AND c.state='queued' AND c.ai_enabled
   AND EXISTS(SELECT 1 FROM lvd_messages q WHERE q.id=$2 AND q.conversation_id=c.id AND COALESCE(q.metadata->>'kind','')<>'deleted')
   AND $2=(SELECT max(id) FROM lvd_messages WHERE conversation_id=c.id AND role='user')
   AND NOT EXISTS(SELECT 1 FROM lvd_messages WHERE conversation_id=c.id AND client_key='assistant:'||$2::text)`,[job.conversation_id,job.message_id])).rowCount;
  await pool.query("UPDATE lvd_answer_jobs SET status=$3,available_at=now()+interval '3 seconds',lease=NULL,lease_until=NULL,error_code=NULL,updated_at=now() WHERE message_id=$1 AND lease=$2",[job.message_id,lease,pending?'pending':'done']);
 }catch{
  // Store a bounded operational code, never customer text or provider secrets.
  await pool.query("UPDATE lvd_answer_jobs SET status='pending',available_at=now()+make_interval(secs=>LEAST(60,2*power(2,LEAST(attempts,5))::integer)),lease=NULL,lease_until=NULL,error_code='retry',updated_at=now() WHERE message_id=$1 AND lease=$2",[job.message_id,lease]);
 }
 return true;
}
