import {DeleteObjectCommand} from '@aws-sdk/client-s3';
import {transaction} from '../shared/db';
import {isAdmin} from '../identity/permissions';
import {activeValues} from '../integrations/store';
import {r2Client} from '../integrations/check';
import {HttpError,isCustomer,type Actor} from './service';

export async function deleteInboxConversation(actor:Actor,id:string,version:unknown,updatedAt:unknown){
 if(!isAdmin(actor.user))throw new HttpError(403,'Chỉ Admin được xóa hội thoại.');
 return deleteConversation(actor,id,version,updatedAt,false);
}
export async function deleteCustomerConversation(actor:Actor,id:string,version:unknown,updatedAt:unknown){
 return deleteConversation(actor,id,version,updatedAt,true);
}
async function deleteConversation(actor:Actor,id:string,version:unknown,updatedAt:unknown,customerOnly:boolean){
 if(!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(id)||!Number.isSafeInteger(version)||typeof updatedAt!=='string'||!Number.isFinite(Date.parse(updatedAt)))throw new HttpError(400,'Hội thoại không hợp lệ.');
 return transaction(async db=>{
  // Match upload/backup lock order; the conversation lock also fences replies and AI delivery.
  await db.query('SELECT pg_advisory_xact_lock_shared(73041104)');
  const c=(await db.query('SELECT * FROM lvd_conversations WHERE id=$1 FOR UPDATE',[id])).rows[0];
  if(!c)return {id,deleted:true};
  if(customerOnly&&!isCustomer(actor,c))throw new HttpError(403,'Bạn không có quyền xóa hội thoại này.');
  if(c.version!==version||new Date(c.updated_at).getTime()!==Date.parse(updatedAt))throw new HttpError(409,'Hội thoại có cập nhật mới. Kiểm tra lại trước khi xóa.');
  const files=(await db.query('SELECT id,object_key,ready FROM lvd_chat_files WHERE conversation_id=$1 FOR UPDATE',[id])).rows;
  if(files.some(file=>!file.ready))throw new HttpError(409,'Có tệp đang tải lên. Vui lòng thử lại sau.');
  if(files.length){
   if((await db.query('SELECT media_locked_until>now() AS locked FROM lvd_backup_runtime WHERE id=1')).rows[0]?.locked)throw new HttpError(409,'Đang sao lưu tệp. Vui lòng thử lại sau.');
   if(files.some(file=>file.object_key!=='private-chat/'+id+'/'+file.id))throw new HttpError(409,'Không xác định được tệp của hội thoại.');
   const values=await activeValues('r2',db);
   if(!values)throw new HttpError(503,'Lưu trữ tệp đang tạm dừng. Vui lòng thử lại sau.');
   const client=r2Client(values),abortSignal=AbortSignal.timeout(15000);
   try{
    for(let i=0;i<files.length;i+=5){
     const results=await Promise.allSettled(files.slice(i,i+5).map(file=>client.send(new DeleteObjectCommand({Bucket:values.bucket,Key:file.object_key}),{abortSignal})));
     if(results.some(result=>result.status==='rejected'))throw Error('Attachment cleanup failed');
    }
   }catch{throw new HttpError(503,'Chưa xóa hết tệp đính kèm. Vui lòng thử lại.');}
   finally{client.destroy();}
  }
  // Foreign keys remove messages, pending answer jobs, events and attachment records together.
  // Keep the records if object storage fails, so the exact same deletion can be retried.
  await db.query('DELETE FROM lvd_conversations WHERE id=$1',[id]);
  return {id,deleted:true};
 });
}
