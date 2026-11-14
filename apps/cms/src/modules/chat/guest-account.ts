import {transaction} from '../shared/db';
// Called only after verified OAuth or password authentication. The HttpOnly guest cookie proves
// which anonymous conversations belong to this browser; never link by email.
export async function linkGuestConversations(userId:number,guestHash:string){
 if(!Number.isSafeInteger(userId)||userId<1||!/^[a-f0-9]{64}$/.test(guestHash))throw new Error("Invalid guest account link");
 return transaction(async db=>{
  const result=await db.query('UPDATE lvd_conversations SET user_id=$1,guest_hash=NULL,retain_history=true,low_priority_expires_at=NULL WHERE guest_hash=$2 AND user_id IS NULL RETURNING id',[userId,guestHash]);
  if(result.rows.length){
   const actorKeys=['user:'+userId,result.rows.map(row=>row.id),'guest:'+guestHash];
   // Saved sends must keep the same identity as their linked conversation so
   // retrying an acknowledged guest send after sign-in remains idempotent.
   await db.query("UPDATE lvd_messages SET actor_key=$1 WHERE conversation_id=ANY($2::uuid[]) AND role='user' AND actor_key=$3",actorKeys);
   await db.query("UPDATE lvd_chat_files SET actor_key=$1 WHERE conversation_id=ANY($2::uuid[]) AND actor_key=$3",actorKeys);
  }
  return result.rows.map(row=>row.id as string);
 });
}
