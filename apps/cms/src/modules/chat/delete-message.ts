import {DeleteObjectCommand} from '@aws-sdk/client-s3';
import {transaction} from '../shared/db';
import {isAdmin} from '../identity/permissions';
import {activeValues} from '../integrations/store';
import {r2Client} from '../integrations/check';
import {HttpError,type Actor} from './service';

export async function deleteInboxMessage(actor:Actor,id:string,messageId:string,version:unknown){
 if(!isAdmin(actor.user))throw new HttpError(403,'Chỉ Admin được xóa tin nhắn.');
 if(!/^[1-9]\d{0,18}$/.test(messageId)||BigInt(messageId)>9223372036854775807n||!Number.isSafeInteger(version))throw new HttpError(400,'Tin nhắn không hợp lệ.');
 return transaction(async db=>{
  // Use the same backup → conversation → attachment lock order as uploads.
  await db.query('SELECT pg_advisory_xact_lock_shared(73041104)');
  const c=(await db.query('SELECT * FROM lvd_conversations WHERE id=$1 FOR UPDATE',[id])).rows[0];
  if(!c)throw new HttpError(404,'Không tìm thấy hội thoại.');
  const message=(await db.query('SELECT id,metadata FROM lvd_messages WHERE conversation_id=$1 AND id=$2 FOR UPDATE',[id,messageId])).rows[0];
  if(!message)throw new HttpError(404,'Không tìm thấy tin nhắn.');
  // Preserve the send key as a tombstone: a delayed send retry cannot restore it.
  if(message.metadata?.kind==='deleted')return {id:messageId,version:c.version};
  if(c.version!==version)throw new HttpError(409,'Hội thoại đã thay đổi. Vui lòng thử lại.');
  const files=(await db.query('SELECT id,object_key FROM lvd_chat_files WHERE conversation_id=$1 AND message_id=$2 FOR UPDATE',[id,messageId])).rows;
  if(files.length){
   if((await db.query('SELECT media_locked_until>now() AS locked FROM lvd_backup_runtime WHERE id=1')).rows[0]?.locked)throw new HttpError(409,'Đang sao lưu tệp. Vui lòng thử lại sau.');
   const values=await activeValues('r2',db);
   if(!values)throw new HttpError(503,'Lưu trữ tệp đang tạm dừng. Vui lòng thử lại sau.');
   const client=r2Client(values);
   try{
    for(const file of files)await client.send(new DeleteObjectCommand({Bucket:values.bucket,Key:file.object_key}),{abortSignal:AbortSignal.timeout(5000)});
   }catch{throw new HttpError(503,'Chưa xóa được tệp đính kèm. Vui lòng thử lại.');}
   finally{client.destroy();}
   await db.query('DELETE FROM lvd_chat_files WHERE conversation_id=$1 AND message_id=$2',[id,messageId]);
  }
  await db.query("UPDATE lvd_messages SET body='',metadata=$3 WHERE conversation_id=$1 AND id=$2",[id,messageId,JSON.stringify({kind:'deleted',deletedAt:new Date().toISOString(),deletedBy:actor.user!.id})]);
  const result=(await db.query('UPDATE lvd_conversations SET ai_generation=NULL,ai_started_at=NULL,ai_message_id=NULL,version=version+1,updated_at=clock_timestamp() WHERE id=$1 RETURNING version',[id])).rows[0];
  await db.query("UPDATE lvd_answer_jobs SET status='done',lease=NULL,lease_until=NULL,updated_at=now() WHERE conversation_id=$1",[id]);
  await db.query('INSERT INTO lvd_chat_events(conversation_id,action,actor_id,version) VALUES($1,$2,$3,$4)',[id,'delete-message:'+messageId,actor.user!.id,result.version]);
  return {id:messageId,version:result.version};
 });
}
