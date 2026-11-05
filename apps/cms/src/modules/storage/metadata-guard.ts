import {APIError,type CollectionBeforeChangeHook} from 'payload';
import {sql} from '@payloadcms/db-postgres';
import {bundledFile} from './bundled';
import {mediaWriteGuard} from '../backup/media-lock';
export const mediaMetadataGuard:CollectionBeforeChangeHook=async({data,originalDoc,req,operation})=>{
 await mediaWriteGuard({req});
 if(operation==='create'&&(bundledFile(data.filename)||bundledFile(req.file?.name)))throw new APIError('Tên tệp dành riêng cho tài nguyên giao diện.',400);
 if(originalDoc?.id){
  const tx=await req.transactionID,db=(req.payload.db as any).sessions[String(tx)]?.db;
  const row=(await db.execute(sql`SELECT updated_at FROM media WHERE id=${originalDoc.id} FOR UPDATE`)).rows[0];
  const expected=data.updatedAt||originalDoc.updatedAt;
  if(!row||new Date(row.updated_at).getTime()!==new Date(expected).getTime())throw new APIError('Tệp đã được sửa ở nơi khác. Tải lại trước khi lưu.',409);
  if(bundledFile(originalDoc.filename)){
   if(req.file)throw new APIError('Tệp giao diện không thể thay nội dung. Hãy tải một bản mới.',400);
   for(const key of ['filename','mimeType','filesize','visibility'])if(data[key]!==undefined&&data[key]!==originalDoc[key])throw new APIError('Chỉ có thể sửa thông tin mô tả của tệp giao diện.',400);
   for(const key of ['url','thumbnailURL','_objectKey','prefix'])data[key]=originalDoc[key];
  }
 }
 data.uploadedBy=operation==='create'?req.user?.id||null:typeof originalDoc?.uploadedBy==='object'?originalDoc.uploadedBy?.id:originalDoc?.uploadedBy||null;
 if(operation==='create'&&!data.title)data.title=String(data.filename||req.file?.name||'Tệp').replace(/\.[^.]+$/,'').slice(0,200);
 return data;
};
