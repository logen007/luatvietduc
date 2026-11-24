import {compressUpload} from '../storage/compress-upload';
import {randomUUID} from 'node:crypto';
import {PutObjectCommand,GetObjectCommand,DeleteObjectCommand} from '@aws-sdk/client-s3';
import {Readable} from 'node:stream';
import {pool,transaction} from '../shared/db';
import {activeValues} from '../integrations/store';
import {r2Client} from '../integrations/check';
import {allowed,isCustomer,HttpError,type Actor} from './service';
export const MAX_CHAT_FILE=10*1024*1024;
export function validateChatFile(name:string,buffer:Buffer){
 const ext=name.split('.').pop()?.toLowerCase();
 const types:Record<string,string>={pdf:'application/pdf',txt:'text/plain',docx:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg',webp:'image/webp'};
 if(!ext||!types[ext]||!buffer.length||buffer.length>MAX_CHAT_FILE)throw new HttpError(400,'Chọn PDF, DOCX, TXT hoặc ảnh; tối đa 10 MB/tệp.');
 const ok=ext==='pdf'?buffer.subarray(0,5).toString()==='%PDF-':ext==='png'?buffer.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])):['jpg','jpeg'].includes(ext)?buffer[0]===255&&buffer[1]===216&&buffer[2]===255:ext==='webp'?buffer.subarray(0,4).toString()==='RIFF'&&buffer.subarray(8,12).toString()==='WEBP':ext==='docx'?buffer.subarray(0,4).equals(Buffer.from([80,75,3,4])):!buffer.includes(0)&&(()=>{try{new TextDecoder('utf-8',{fatal:true}).decode(buffer);return true;}catch{return false;}})();
 if(!ok)throw new HttpError(400,'Định dạng tệp không khớp với phần mở rộng.');
 return types[ext];
}
export async function uploadChatFile(actor:Actor,conversationId:string,name:string,buffer:Buffer){
 const mime=validateChatFile(name,buffer);
 const id=randomUUID(),key='private-chat/'+conversationId+'/'+id;
 let actorKey=actor.user?'user:'+actor.user.id:'guest:'+actor.guestHash;
 const values=await transaction(async db=>{
  await db.query('SELECT pg_advisory_xact_lock_shared(73041104)');
  const connection=await activeValues('r2',db);
  if(!connection)throw new HttpError(503,'Tải tệp chưa sẵn sàng. Quản trị viên cần bật kết nối R2.');
  if((await db.query('SELECT media_locked_until>now() AS locked FROM lvd_backup_runtime WHERE id=1')).rows[0]?.locked)throw new HttpError(409,'Đang sao lưu tệp. Vui lòng thử lại sau.');
  const c=(await db.query('SELECT * FROM lvd_conversations WHERE id=$1 FOR UPDATE',[conversationId])).rows[0];
  if(!c||!allowed(actor,c))throw new HttpError(403,'Không có quyền gửi tệp trong hội thoại này.');
  actorKey=isCustomer(actor,c)?(actor.user?'user:'+actor.user.id:'guest:'+actor.guestHash):'staff:'+actor.user!.id;
  if(c.state==='closed'||(!isCustomer(actor,c)&&c.state!=='human'))throw new HttpError(409,'Hội thoại chưa thể nhận tệp.');
  const count=(await db.query('SELECT count(*)::int AS n FROM lvd_chat_files WHERE conversation_id=$1',[conversationId])).rows[0].n;
  if(count>=50)throw new HttpError(400,'Hội thoại đã đạt giới hạn 50 tệp.');
  await db.query('INSERT INTO lvd_chat_files(id,conversation_id,actor_key,object_key,name,mime_type,size) VALUES($1,$2,$3,$4,$5,$6,$7)',[id,conversationId,actorKey,key,name.replace(/[\x00-\x1f/\\]/g,'_').slice(0,180),mime,buffer.length]);
  return connection;
 });
 const client=r2Client(values);
 try{
  buffer=await compressUpload(buffer,mime);
  await client.send(new PutObjectCommand({Bucket:values.bucket,Key:key,Body:buffer,ContentType:mime,CacheControl:'private, no-store'}),{abortSignal:AbortSignal.timeout(30000)});
  await transaction(async db=>{await db.query('SELECT pg_advisory_xact_lock_shared(73041104)');if((await db.query('SELECT media_locked_until>now() AS locked FROM lvd_backup_runtime WHERE id=1')).rows[0]?.locked)throw new HttpError(409,'Đang sao lưu tệp.');await db.query('UPDATE lvd_chat_files SET ready=true,size=$2 WHERE id=$1',[id,buffer.length]);});
  return {id,name:name.slice(0,180),size:buffer.length,mimeType:mime,url:'/service/chat-files/'+id};
 }catch{
  try{await client.send(new DeleteObjectCommand({Bucket:values.bucket,Key:key}),{abortSignal:AbortSignal.timeout(5000)});await pool.query('DELETE FROM lvd_chat_files WHERE id=$1 AND ready=false',[id]);}catch{}
  throw new HttpError(503,'Chưa tải được tệp. Vui lòng thử lại.');
 }finally{client.destroy();}
}
export async function downloadChatFile(actor:Actor,id:string){
 const row=(await pool.query('SELECT f.*,row_to_json(c) AS conversation FROM lvd_chat_files f JOIN lvd_conversations c ON c.id=f.conversation_id WHERE f.id=$1 AND f.ready=true',[id])).rows[0];
 if(!row||!allowed(actor,row.conversation)||row.internal&&isCustomer(actor,row.conversation))throw new HttpError(404,'Không tìm thấy tệp.');
 const actorKey=isCustomer(actor,row.conversation)?(actor.user?'user:'+actor.user.id:'guest:'+actor.guestHash):'staff:'+actor.user!.id;
 if(!row.message_id&&row.actor_key!==actorKey)throw new HttpError(404,'Không tìm thấy tệp.');
 const values=await activeValues('r2');if(!values)throw new HttpError(503,'Lưu trữ tệp đang tạm dừng.');
 const client=r2Client(values);
 try{
  const object=await client.send(new GetObjectCommand({Bucket:values.bucket,Key:row.object_key}),{abortSignal:AbortSignal.timeout(20000)});
  if(!object.Body)throw Error('missing');const stream=object.Body as Readable;
  stream.once('close',()=>client.destroy());stream.once('end',()=>client.destroy());stream.once('error',()=>client.destroy());
  return new Response(Readable.toWeb(stream) as ReadableStream,{headers:{'Content-Type':row.mime_type,'Content-Disposition':"attachment; filename*=UTF-8''"+encodeURIComponent(row.name),'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'none'; sandbox"}});
 }catch{client.destroy();throw new HttpError(503,'Chưa tải được tệp. Vui lòng thử lại.');}
}
