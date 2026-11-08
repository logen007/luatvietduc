import {transaction} from '../shared/db';
import {HttpError,isCustomer,type Actor} from './service';
export async function renameCustomerConversation(actor:Actor,id:string,data:{title?:unknown;version?:unknown;updatedAt?:unknown}){
 const title=typeof data.title==='string'?data.title.trim():'';
 if(!/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i.test(id)||!title||title.length>100||/[\x00-\x1f\x7f]/.test(title)||!Number.isSafeInteger(data.version)||typeof data.updatedAt!=='string'||!Number.isFinite(Date.parse(data.updatedAt)))throw new HttpError(400,'Nhập tên hội thoại từ 1 đến 100 ký tự.');
 return transaction(async db=>{
  const c=(await db.query('SELECT * FROM lvd_conversations WHERE id=$1 FOR UPDATE',[id])).rows[0];
  if(!c)throw new HttpError(404,'Không tìm thấy hội thoại.');
  if(!isCustomer(actor,c))throw new HttpError(403,'Bạn không có quyền đổi tên hội thoại này.');
  if(c.version!==data.version||new Date(c.updated_at).getTime()!==Date.parse(data.updatedAt as string))throw new HttpError(409,'Hội thoại có cập nhật mới. Tải lại trước khi đổi tên.');
  // Naming is metadata, so it does not invalidate an answer already in progress.
  // The event protects this title from subsequent automatic AI naming.
  const row=(await db.query("UPDATE lvd_conversations SET title=$2,updated_at=clock_timestamp(),low_priority_expires_at=CASE WHEN qualification='low' AND NOT retain_history AND user_id IS NULL THEN clock_timestamp()+interval '2 hours' ELSE low_priority_expires_at END WHERE id=$1 RETURNING id,title,version,updated_at",[id,title])).rows[0];
  await db.query("INSERT INTO lvd_chat_events(conversation_id,action,actor_id,version) VALUES($1,'customer.rename',$2,$3)",[id,actor.user?.id||null,c.version]);
  return {id:row.id,title:row.title,customTitle:true,version:row.version,updatedAt:row.updated_at};
 });
}
