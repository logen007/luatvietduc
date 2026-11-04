import {transaction} from '../shared/db';
// Called only after OAuth identity validation. The HttpOnly guest cookie proves
// which anonymous conversations belong to this browser; never link by email.
export async function linkGuestConversations(userId:number,guestHash:string){
 if(!Number.isSafeInteger(userId)||userId<1||!/^[a-f0-9]{64}$/.test(guestHash))throw new Error("Invalid guest account link");
 return transaction(async db=>{
  const result=await db.query('UPDATE lvd_conversations SET user_id=$1,guest_hash=NULL WHERE guest_hash=$2 AND user_id IS NULL RETURNING id',[userId,guestHash]);
  if(result.rows.length)await db.query("UPDATE lvd_chat_files SET actor_key=$1 WHERE conversation_id=ANY($2::uuid[]) AND actor_key=$3",['user:'+userId,result.rows.map(row=>row.id),'guest:'+guestHash]);
  return result.rows.map(row=>row.id as string);
 });
}
