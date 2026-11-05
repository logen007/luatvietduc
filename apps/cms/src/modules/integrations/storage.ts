import { cloudStoragePlugin } from '@payloadcms/plugin-cloud-storage';
import { getStorageFilePath } from '@payloadcms/plugin-cloud-storage/utilities';
import type { Adapter } from '@payloadcms/plugin-cloud-storage/types';
import { PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { Readable } from 'node:stream';
import { activeValues } from './store';
import { r2Client } from './check';
import {APIError,type CollectionAfterDeleteHook,type CollectionBeforeDeleteHook} from 'payload';
import {bundledFile} from '../storage/bundled';
import {payloadTransaction} from '../shared/payload-transaction';
import {sql} from '@payloadcms/db-postgres';
const retainedSource=(key:string)=>key==='originals'||key.startsWith('originals/');

export const captureMediaOwnedFiles:CollectionBeforeDeleteHook=async({id,req})=>{
  // Capture server-owned metadata before native deletion; private fields must
  // not be read back from an access-filtered response after the row is gone.
  await(await payloadTransaction(req)).execute(sql`SELECT id FROM media WHERE id=${Number(id)} FOR UPDATE`);
  const doc=await req.payload.findByID({collection:'media',id,overrideAccess:true,req,depth:0});
  const pending=(req.context.lvdMediaDeletions??={}) as Record<string,unknown>;
  pending[String(id)]=doc;
};
export const deleteMediaOwnedFiles:CollectionAfterDeleteHook=async({doc,req,collection})=>{
  const pending=req.context.lvdMediaDeletions as Record<string,any>|undefined;
  const owned=pending?.[String(doc.id)];if(!owned)throw new APIError('Chưa xác định được tệp cần xóa. Vui lòng thử lại.',503);
  if(bundledFile(owned.filename))throw new APIError('Ảnh giao diện đang được website sử dụng.',400);
  const names=[owned.filename,...Object.values(owned.sizes||{}).map((size:any)=>size?.filename)].filter((value):value is string=>typeof value==='string'&&Boolean(value));
  const keys=new Set<string>();
  for(const filename of names){const key=await getStorageFilePath({collection,collectionPrefix:'',doc:owned,filename,req});if(retainedSource(key))throw new APIError('Đường dẫn lưu trữ không hợp lệ.',400);keys.add(key);}
  if(owned.originalFile?.key){
    if(!new RegExp('^originals/'+Number(doc.id)+'/source\\.(?:jpg|jpeg|png|webp)$').test(owned.originalFile.key))throw new APIError('Thông tin ảnh gốc không hợp lệ.',503);
    keys.add(owned.originalFile.key);
  }
  // A failed first save can leave its protected source before the DB receipt.
  // These deterministic keys belong only to this media ID, never another file.
  for(const extension of ['jpg','png','webp'])keys.add('originals/'+Number(doc.id)+'/source.'+extension);
  const {client,bucket}=await connection();
  try{
    // Storage is external to the database transaction. A partial failure is an
    // error, retains the media row and can be retried using idempotent deletes.
    for(const key of keys)await client.send(new DeleteObjectCommand({Bucket:bucket,Key:key}),{abortSignal:AbortSignal.timeout(10000)});
  }catch{throw new APIError('Chưa xóa hết tệp. Vui lòng thử lại.',503);}
  finally{client.destroy();}
  delete pending![String(doc.id)];return doc;
};
async function connection() {
  const values=await activeValues('r2');
  if(!values)throw new Error('Storage not configured');
  return { client:r2Client(values), bucket:values.bucket };
}
const adapter:Adapter=({collection,prefix=''})=>({
  name:'admin-r2',
  handleUpload:async({file,storageFilePath})=>{
    if(retainedSource(storageFilePath))throw new APIError('Đường dẫn lưu trữ dành riêng cho ảnh gốc.',400);
    const {client,bucket}=await connection();
    try { await client.send(new PutObjectCommand({Bucket:bucket,Key:storageFilePath,Body:file.buffer,ContentType:file.mimeType}),{abortSignal:AbortSignal.timeout(30000)}); }
    finally {client.destroy();}
  },
  handleDelete:async({storageFilePath})=>{
    if(retainedSource(storageFilePath))throw new APIError('Đường dẫn lưu trữ dành riêng cho ảnh gốc.',400);
    const {client,bucket}=await connection();
    try{await client.send(new DeleteObjectCommand({Bucket:bucket,Key:storageFilePath}),{abortSignal:AbortSignal.timeout(10000)});}
    finally{client.destroy();}
  },
  staticHandler:async(req,{doc,params})=>{
    const key=await getStorageFilePath({collection,collectionPrefix:prefix,doc,filename:params.filename,req});
    if(retainedSource(key))return new Response(null,{status:404});
    const {client,bucket}=await connection();
    try{
      const object=await client.send(new GetObjectCommand({Bucket:bucket,Key:key}),{abortSignal:AbortSignal.timeout(20000)});
      if(!object.Body){client.destroy();return new Response(null,{status:404});}
      const stream=object.Body as Readable;
      const cleanup=()=>client.destroy();stream.once('end',cleanup);stream.once('close',cleanup);stream.once('error',cleanup);
      req.signal?.addEventListener('abort',()=>{stream.destroy();cleanup();},{once:true});
      return new Response(Readable.toWeb(stream) as ReadableStream, {headers:{
        'Content-Type':object.ContentType||'application/octet-stream','X-Content-Type-Options':'nosniff',
        ...(Number.isSafeInteger(object.ContentLength)&&object.ContentLength!>=0?{'Content-Length':String(object.ContentLength)}:{}),
        'Content-Security-Policy':"default-src 'none'; sandbox",'Cache-Control':'private, no-store',
        'Content-Disposition':'inline; filename="'+params.filename.replace(/["\r\n\\]/g,'_')+'"',
      }});
    }catch{client.destroy();return new Response(null,{status:404});}
  },
});
export const runtimeStorage=()=>cloudStoragePlugin({collections:{media:{adapter,prefix:'',disableLocalStorage:true}}});
