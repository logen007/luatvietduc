import {deleteConversationFiles} from './delete-conversation';
import {HttpError} from '../http/errors';
import {pool,transaction} from '../shared/db';
export type Qualification='low'|'needs_details'|'ready';
const eligible=`c.user_id IS NULL AND c.guest_expiry_enabled AND c.state='queued' AND c.ai_enabled AND c.assigned_to IS NULL
 AND c.low_priority_expires_at<=now()
 AND (c.ai_generation IS NULL OR c.ai_started_at<now()-interval '90 seconds')
 AND NOT EXISTS(SELECT 1 FROM lvd_chat_files f WHERE f.conversation_id=c.id AND NOT f.ready)
 AND NOT EXISTS(SELECT 1 FROM lvd_messages m WHERE m.conversation_id=c.id AND m.role='staff')`;
export async function expireLowPriorityConversations(){
 const ids=(await pool.query(`SELECT c.id FROM lvd_conversations c WHERE ${eligible} ORDER BY c.low_priority_expires_at,c.id LIMIT 100`)).rows;
 let deleted=0;const deadline=Date.now()+15000;
 for(const {id} of ids){
  if(Date.now()>=deadline)break;
  deleted+=await transaction(async db=>{
   // Match uploads/backup lock order; lock only the thread being cleaned.
   await db.query('SELECT pg_advisory_xact_lock_shared(73041104)');
   if(!(await db.query(`SELECT c.id FROM lvd_conversations c WHERE c.id=$1 AND ${eligible} FOR UPDATE OF c SKIP LOCKED`,[id])).rowCount)return 0;
   try{await deleteConversationFiles(db,id);}catch(error){
    // Storage/backup failures keep the exact object keys for the next sweep.
    if(error instanceof HttpError)return 0;
    throw error;
   }
   await db.query('DELETE FROM lvd_conversations WHERE id=$1',[id]);return 1;
  });
 }
 return deleted;
}
