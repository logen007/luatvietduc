import { cloudStoragePlugin } from '@payloadcms/plugin-cloud-storage';
import { getStorageFilePath } from '@payloadcms/plugin-cloud-storage/utilities';
import type { Adapter } from '@payloadcms/plugin-cloud-storage/types';
import { PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { Readable } from 'node:stream';
import { activeValues } from './store';
import { r2Client } from './check';
async function connection() {
  const values=await activeValues('r2');
  if(!values)throw new Error('Storage not configured');
  return { client:r2Client(values), bucket:values.bucket };
}
const adapter:Adapter=({collection,prefix=''})=>({
  name:'admin-r2',
  handleUpload:async({file,storageFilePath})=>{
    const {client,bucket}=await connection();
    try { await client.send(new PutObjectCommand({Bucket:bucket,Key:storageFilePath,Body:file.buffer,ContentType:file.mimeType}),{abortSignal:AbortSignal.timeout(30000)}); }
    finally {client.destroy();}
  },
  handleDelete:async({storageFilePath})=>{
    const {client,bucket}=await connection();
    try{await client.send(new DeleteObjectCommand({Bucket:bucket,Key:storageFilePath}),{abortSignal:AbortSignal.timeout(10000)});}
    finally{client.destroy();}
  },
  staticHandler:async(req,{doc,params})=>{
    const key=await getStorageFilePath({collection,collectionPrefix:prefix,doc,filename:params.filename,req});
    const {client,bucket}=await connection();
    try{
      const object=await client.send(new GetObjectCommand({Bucket:bucket,Key:key}),{abortSignal:AbortSignal.timeout(20000)});
      if(!object.Body){client.destroy();return new Response(null,{status:404});}
      const stream=object.Body as Readable;
      const cleanup=()=>client.destroy();stream.once('end',cleanup);stream.once('close',cleanup);stream.once('error',cleanup);
      req.signal?.addEventListener('abort',()=>{stream.destroy();cleanup();},{once:true});
      return new Response(Readable.toWeb(stream) as ReadableStream, {headers:{
        'Content-Type':object.ContentType||'application/octet-stream','X-Content-Type-Options':'nosniff',
        'Content-Security-Policy':"default-src 'none'; sandbox",'Cache-Control':'private, no-store',
        'Content-Disposition':'inline; filename="'+params.filename.replace(/["\r\n\\]/g,'_')+'"',
      }});
    }catch{client.destroy();return new Response(null,{status:404});}
  },
});
export const runtimeStorage=()=>cloudStoragePlugin({collections:{media:{adapter,prefix:'',disableLocalStorage:true}}});
