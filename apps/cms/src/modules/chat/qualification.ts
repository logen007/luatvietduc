import {transaction} from '../shared/db';
export type Qualification='low'|'needs_details'|'ready';
export async function expireLowPriorityConversations(){
 return transaction(async db=>{
  const ids=(await db.query(`SELECT c.id FROM lvd_conversations c
   WHERE c.user_id IS NULL AND c.qualification='low' AND NOT c.retain_history AND c.state='queued' AND c.ai_enabled AND c.assigned_to IS NULL
   AND c.low_priority_expires_at<=now()
   AND (c.ai_generation IS NULL OR c.ai_started_at<now()-interval '90 seconds')
   AND NOT EXISTS(SELECT 1 FROM lvd_chat_files f WHERE f.conversation_id=c.id)
   AND NOT EXISTS(SELECT 1 FROM lvd_messages m WHERE m.conversation_id=c.id AND m.role='staff')
   ORDER BY c.low_priority_expires_at,c.id LIMIT 100 FOR UPDATE OF c SKIP LOCKED`)).rows.map(row=>row.id);
  if(ids.length)await db.query('DELETE FROM lvd_conversations WHERE id=ANY($1::uuid[])',[ids]);
  return ids.length;
 });
}
