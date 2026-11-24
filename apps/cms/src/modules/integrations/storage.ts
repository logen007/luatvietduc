import { cloudStoragePlugin } from '@payloadcms/plugin-cloud-storage';
import { getStorageFilePath } from '@payloadcms/plugin-cloud-storage/utilities';
import type { Adapter } from '@payloadcms/plugin-cloud-storage/types';
import { PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import {storedMediaResponse} from '../storage/media-response';
import { activeValues } from './store';
import { r2Client } from './check';
import {APIError,type CollectionAfterDeleteHook,type CollectionBeforeDeleteHook,type CollectionConfig,type PayloadRequest} from 'payload';
import {bundledFile} from '../storage/bundled';
import {payloadTransaction} from '../shared/payload-transaction';
import {sql} from '@payloadcms/db-postgres';
const retainedSource=(key:string)=>key==='originals'||key.startsWith('originals/');
type OwnedMedia=Record<string,any>&{id:string|number};
type MediaDeletionReceipt={owned?:OwnedMedia;complete:boolean};

export const captureMediaOwnedFiles:CollectionBeforeDeleteHook=async({id,req,collection})=>{
  // Capture server-owned metadata before native deletion; private fields must
  // not be read back from an access-filtered response after the row is gone.
  await(await payloadTransaction(req)).execute(sql`SELECT id FROM media WHERE id=${Number(id)} FOR UPDATE`);
  const doc=await req.payload.findByID({collection:'media',id,overrideAccess:true,req,depth:0});
  const pending=(req.context.lvdMediaDeletions??={}) as Record<string,MediaDeletionReceipt>;
  const receipt:MediaDeletionReceipt={owned:doc,complete:false};pending[String(id)]=receipt;
  // Legacy size records are owned by this library entry. Remove them in the
  // same transaction before the parent, rather than exposing orphan aliases.
  if(bundledFile(doc.filename)){
    const children=await req.payload.delete({collection:'media',where:{and:[{legacyParent:{equals:id}},{id:{not_equals:id}}]},overrideAccess:true,req});
    if(children.errors.length)throw new APIError('Chưa gỡ hết các kích thước ảnh. Vui lòng thử lại.',503);
  }else await deleteOwnedMediaFiles(doc,req,collection);
  // Native bulk operations collect per-document errors instead of rolling
  // back the full batch. Finish storage before deleteOne so a failed item
  // retains its server-owned metadata and can be retried.
  receipt.complete=true;
};
export const deleteMediaOwnedFiles:CollectionAfterDeleteHook=({doc,req})=>{
  const pending=req.context.lvdMediaDeletions as Record<string,MediaDeletionReceipt>|undefined;
  // Keep the completion flag for the native adapter's following hook; do not
  // perform fallible storage work after Payload has removed the database row.
  const receipt=pending?.[String(doc.id)];if(receipt)delete receipt.owned;
  return doc;
};
async function deleteOwnedMediaFiles(owned:OwnedMedia,req:PayloadRequest,collection:CollectionConfig){
  const names=[owned.filename,...Object.values(owned.sizes||{}).map((size:any)=>size?.filename)].filter((value):value is string=>typeof value==='string'&&Boolean(value));
  const keys=new Set<string>();
  for(const filename of names){const key=await getStorageFilePath({collection,collectionPrefix:'',doc:owned,filename,req});if(retainedSource(key))throw new APIError('Đường dẫn lưu trữ không hợp lệ.',400);keys.add(key);}
  if(owned.originalFile?.key){
    if(!new RegExp('^originals/'+Number(owned.id)+'/source\\.(?:jpg|jpeg|png|webp)$').test(owned.originalFile.key))throw new APIError('Thông tin ảnh gốc không hợp lệ.',503);
    keys.add(owned.originalFile.key);
  }
  // A failed first save can leave its protected source before the DB receipt.
  // These deterministic keys belong only to this media ID, never another file.
  for(const extension of ['jpg','png','webp'])keys.add('originals/'+Number(owned.id)+'/source.'+extension);
  const {client,bucket}=await connection();
  try{
    // Storage is external to the database transaction. A partial failure is an
    // error, retains the media row and can be retried using idempotent deletes.
    for(const key of keys)await client.send(new DeleteObjectCommand({Bucket:bucket,Key:key}),{abortSignal:AbortSignal.timeout(10000)});
  }catch{throw new APIError('Chưa xóa hết tệp. Vui lòng thử lại.',503);}
  finally{client.destroy();}
}
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
  handleDelete:async({storageFilePath,doc,req})=>{
    const receipt=(req.context.lvdMediaDeletions as Record<string,MediaDeletionReceipt>|undefined)?.[String(doc.id)];
    if(bundledFile(doc.filename)||receipt?.complete)return;
    if(retainedSource(storageFilePath))throw new APIError('Đường dẫn lưu trữ dành riêng cho ảnh gốc.',400);
    const {client,bucket}=await connection();
    try{await client.send(new DeleteObjectCommand({Bucket:bucket,Key:storageFilePath}),{abortSignal:AbortSignal.timeout(10000)});}
    finally{client.destroy();}
  },
  staticHandler:async(req,{doc,params})=>{
    const key=await getStorageFilePath({collection,collectionPrefix:prefix,doc,filename:params.filename,req});
    if(retainedSource(key))return new Response(null,{status:404});
    const {client,bucket}=await connection();
    return storedMediaResponse({client,bucket,key,filename:params.filename,request:req});
  },
});
export const runtimeStorage=()=>cloudStoragePlugin({collections:{media:{adapter,prefix:'',disableLocalStorage:true}}});
