import {randomUUID} from 'node:crypto';
import {Readable} from 'node:stream';
import sharp from 'sharp';
import {GetObjectCommand,PutObjectCommand} from '@aws-sdk/client-s3';
import {getStorageFilePath} from '@payloadcms/plugin-cloud-storage/utilities';
import {sql} from '@payloadcms/db-postgres';
import {APIError,createLocalReq,initTransaction,commitTransaction,killTransaction,type CollectionAfterReadHook,type FieldHook,type Payload,type PayloadRequest} from 'payload';
import {activeValues} from '../integrations/store';
import {r2Client} from '../integrations/check';
import {HttpError} from '../http/errors';
import {requireSameOrigin} from '../http/request';
import {payloadTransaction} from '../shared/payload-transaction';
import {mediaWriteGuard} from '../backup/media-lock';
import {bundledFile} from './bundled';
import {mediaEditable} from './media-view';

export const MAX_MEDIA_IMAGE_BYTES=10*1024*1024;
export const MAX_MEDIA_IMAGE_PIXELS=40_000_000;
const imageTypes={'image/jpeg':{format:'jpeg',extension:'jpg'},'image/png':{format:'png',extension:'png'},'image/webp':{format:'webp',extension:'webp'}} as const;
type ImageMime=keyof typeof imageTypes;
export type MediaOriginalFile={key:string;filename:string;mimeType:ImageMime;filesize:number;width:number;height:number};
type MediaRecord={id:number;filename?:string|null;mimeType?:string|null;updatedAt?:string;uploadedBy?:unknown;originalFile?:unknown;[key:string]:unknown};
type Crop={left:number;top:number;width:number;height:number};
export type MediaImageEdit={operation:'edit';updatedAt:string;rotate?:0|90|180|270;flipHorizontal?:boolean;flipVertical?:boolean;crop?:Crop;width?:number;height?:number}|{operation:'restore';updatedAt:string};
const invalid=()=>new HttpError(400,'Thao tác chỉnh ảnh không hợp lệ.');
const unavailable=()=>new APIError('Chưa xử lý được ảnh. Vui lòng thử lại.',503);
const options={limitInputPixels:MAX_MEDIA_IMAGE_PIXELS,failOn:'error' as const};
const supported=(value:unknown):value is ImageMime=>typeof value==='string'&&Object.hasOwn(imageTypes,value);
const integer=(value:unknown,min=1):value is number=>typeof value==='number'&&Number.isSafeInteger(value)&&value>=min;
const filenameValid=(value:unknown):value is string=>typeof value==='string'&&value.length>0&&value.length<=255&&!/[\x00-\x1f\x7f/\\]/.test(value);
function originalFile(value:unknown,id:number):MediaOriginalFile|undefined{
 if(!value||typeof value!=='object'||Array.isArray(value))return;
 const file=value as MediaOriginalFile;
 if(!supported(file.mimeType)||file.key!==`originals/${id}/source.${imageTypes[file.mimeType].extension}`||!filenameValid(file.filename)||!integer(file.filesize)||file.filesize>MAX_MEDIA_IMAGE_BYTES||!integer(file.width)||!integer(file.height)||file.width*file.height>MAX_MEDIA_IMAGE_PIXELS)return;
 return file;
}
export const originalFileAvailability:FieldHook=({value,originalDoc,req})=>{
 const id=Number(originalDoc?.id);
 if(integer(id)){const available=(req.context.lvdMediaOriginals??={}) as Record<string,boolean>;available[id]=Boolean(originalFile(value,id));}
 return value;
};
export const originalMediaView:CollectionAfterReadHook=({doc,req})=>{
 const id=Number(doc.id),available=req.context.lvdMediaOriginals as Record<string,boolean>|undefined;
 if(integer(id)&&mediaEditable(doc,req.user)&&(available?.[id]||originalFile(doc.originalFile,id)))return {...doc,originalImageURL:'/service/media/image/'+id};
 return doc;
};
async function storage(){const values=await activeValues('r2');if(!values)throw unavailable();return {client:r2Client(values),bucket:values.bucket};}
const deadline=(signal?:AbortSignal)=>AbortSignal.any([AbortSignal.timeout(20000),...(signal?[signal]:[])]);
async function readObject(key:string,signal?:AbortSignal){
 const {client,bucket}=await storage(),abortSignal=deadline(signal);let body:Readable|undefined;
 const abort=()=>body?.destroy(new Error('Image read stopped'));
 try{
  const result=await client.send(new GetObjectCommand({Bucket:bucket,Key:key}),{abortSignal});
  if(result.ContentLength!==undefined&&result.ContentLength>MAX_MEDIA_IMAGE_BYTES)throw new HttpError(413,'Ảnh vượt quá 10 MB.');
  body=result.Body as Readable|undefined;if(!body||typeof body[Symbol.asyncIterator]!=='function')throw unavailable();
  abortSignal.addEventListener('abort',abort,{once:true});if(abortSignal.aborted)throw unavailable();
  const chunks:Buffer[]=[];let size=0;
  for await(const chunk of body){if(!(chunk instanceof Uint8Array))throw unavailable();size+=chunk.byteLength;if(size>MAX_MEDIA_IMAGE_BYTES)throw new HttpError(413,'Ảnh vượt quá 10 MB.');chunks.push(Buffer.from(chunk));}
  if(!size)throw unavailable();return Buffer.concat(chunks,size);
 }catch(error){if(error instanceof HttpError||error instanceof APIError)throw error;throw unavailable();}
 finally{abortSignal.removeEventListener('abort',abort);body?.destroy();client.destroy();}
}
async function currentKey(doc:MediaRecord,req:PayloadRequest){
 if(!filenameValid(doc.filename))throw unavailable();
 return getStorageFilePath({collection:req.payload.collections.media.config,collectionPrefix:'',doc,filename:doc.filename,req});
}
async function imageMetadata(data:Buffer,mimeType:unknown){
 if(!supported(mimeType))throw new HttpError(400,'Chỉ chỉnh được ảnh JPEG, PNG hoặc WebP.');
 if(!data.length||data.length>MAX_MEDIA_IMAGE_BYTES)throw new HttpError(413,'Ảnh vượt quá 10 MB.');
 try{
  const meta=await sharp(data,options).metadata();
  if(meta.format!==imageTypes[mimeType].format||!meta.width||!meta.height||meta.width*meta.height>MAX_MEDIA_IMAGE_PIXELS||(meta.pages??1)>1)throw invalid();
  return {meta,mimeType};
 }catch(error){if(error instanceof HttpError)throw error;throw new HttpError(400,'Không đọc được ảnh hoặc ảnh vượt giới hạn xử lý.');}
}

// The caller already holds the media row lock and has checked the version.
// The protected copy has a different key from all native replacement files.
export async function ensureOriginalMedia({originalDoc,req}:{data?:Record<string,unknown>;originalDoc?:Record<string,any>;req:PayloadRequest}):Promise<MediaOriginalFile|undefined>{
 if(!originalDoc?.id||!req.file||!supported(originalDoc.mimeType)||bundledFile(originalDoc.filename))return originalFile(originalDoc?.originalFile,Number(originalDoc?.id));
 if(originalDoc.originalFile){const existing=originalFile(originalDoc.originalFile,Number(originalDoc.id));if(!existing)throw unavailable();return existing;}
 await payloadTransaction(req);
 const doc=originalDoc as MediaRecord,data=await readObject(await currentKey(doc,req),req.signal),{meta,mimeType}=await imageMetadata(data,doc.mimeType);
 const descriptor:MediaOriginalFile={key:`originals/${doc.id}/source.${imageTypes[mimeType].extension}`,filename:doc.filename!,mimeType,filesize:data.length,width:meta.width!,height:meta.height!};
 const {client,bucket}=await storage();
 try{await client.send(new PutObjectCommand({Bucket:bucket,Key:descriptor.key,Body:data,ContentType:mimeType,CacheControl:'private, no-store'}),{abortSignal:deadline(req.signal)});}
 catch{throw unavailable();}finally{client.destroy();}
 return descriptor;
}

export function parseMediaImageEdit(input:Record<string,unknown>):MediaImageEdit{
 if(typeof input.updatedAt!=='string'||!Number.isFinite(Date.parse(input.updatedAt)))throw new HttpError(400,'Tải lại ảnh trước khi lưu.');
 if(input.operation==='restore')return {operation:'restore',updatedAt:input.updatedAt};
 if(input.operation!=='edit'||(input.rotate!==undefined&&![0,90,180,270].includes(input.rotate as number))||(input.flipHorizontal!==undefined&&typeof input.flipHorizontal!=='boolean')||(input.flipVertical!==undefined&&typeof input.flipVertical!=='boolean'))throw invalid();
 const result:MediaImageEdit={operation:'edit',updatedAt:input.updatedAt,rotate:(input.rotate??0) as 0|90|180|270,flipHorizontal:input.flipHorizontal===true,flipVertical:input.flipVertical===true};
 if(input.crop!==undefined){
  if(!input.crop||typeof input.crop!=='object'||Array.isArray(input.crop))throw invalid();const crop=input.crop as Crop;
  if(!integer(crop.left,0)||!integer(crop.top,0)||!integer(crop.width)||!integer(crop.height))throw invalid();result.crop={left:crop.left,top:crop.top,width:crop.width,height:crop.height};
 }
 for(const key of ['width','height'] as const)if(input[key]!==undefined){if(!integer(input[key]))throw invalid();result[key]=input[key];}
 return result;
}

export async function transformMediaImage(data:Buffer,mimeType:unknown,edit:Extract<MediaImageEdit,{operation:'edit'}>){
 const info=await imageMetadata(data,mimeType),orientation=info.meta.orientation??1,swapped=orientation>=5&&orientation<=8;
 let width=swapped?info.meta.height!:info.meta.width!,height=swapped?info.meta.width!:info.meta.height!;
 let geometry=sharp(data,options).autoOrient();
 if(edit.crop){if(edit.crop.left+edit.crop.width>width||edit.crop.top+edit.crop.height>height)throw invalid();geometry=geometry.extract(edit.crop);width=edit.crop.width;height=edit.crop.height;}
 if(edit.rotate){geometry=geometry.rotate(edit.rotate);if(edit.rotate===90||edit.rotate===270)[width,height]=[height,width];}
 let targetWidth=edit.width??(edit.height?Math.max(1,Math.round(edit.height*width/height)):width),targetHeight=edit.height??(edit.width?Math.max(1,Math.round(edit.width*height/width)):height);
 if(targetWidth>width||targetHeight>height)throw new HttpError(400,'Không thể phóng lớn hơn ảnh hiện tại.');
 // Both dimensions must come from one proportional scale rounded to pixels.
 // Compare doubled rounding intervals without floating-point division; the
 // UI clamps either dimension to at least one pixel when shrinking.
 const widthLow=targetWidth===1?0:2*targetWidth-1,heightLow=targetHeight===1?0:2*targetHeight-1;
 if(widthLow*height>=(2*targetHeight+1)*width||heightLow*width>=(2*targetWidth+1)*height)throw new HttpError(400,'Giữ nguyên tỷ lệ khi thu nhỏ ảnh.');
 if(!edit.crop&&!edit.rotate&&!edit.flipHorizontal&&!edit.flipVertical&&targetWidth===width&&targetHeight===height)throw new HttpError(400,'Ảnh chưa thay đổi.');
 try{
  // Sharp flips precede rotation within one pipeline. Materialize raw pixels
  // after crop/rotation so the UI's post-rotation flip order stays exact.
  const pixels=await geometry.raw().toBuffer({resolveWithObject:true});
  let output=sharp(pixels.data,{raw:{width:pixels.info.width,height:pixels.info.height,channels:pixels.info.channels},limitInputPixels:MAX_MEDIA_IMAGE_PIXELS});
  if(edit.flipHorizontal)output=output.flop();if(edit.flipVertical)output=output.flip();
  if(targetWidth!==width||targetHeight!==height)output=output.resize({width:targetWidth,height:targetHeight,fit:'fill',withoutEnlargement:true});
  const result=await output.toFormat(imageTypes[info.mimeType].format).toBuffer({resolveWithObject:true});
  if(result.data.length>MAX_MEDIA_IMAGE_BYTES)throw new HttpError(413,'Ảnh sau khi chỉnh vượt quá 10 MB.');
  return {data:result.data,mimeType:info.mimeType,width:result.info.width,height:result.info.height};
 }catch(error){if(error instanceof HttpError)throw error;throw new HttpError(400,'Chưa chỉnh được ảnh. Kiểm tra vùng cắt và kích thước.');}
}

export function mediaImageId(value:string){const id=Number(value);if(!/^[1-9]\d{0,9}$/.test(value)||!integer(id)||id>2147483647)throw new HttpError(400,'Mã ảnh không hợp lệ.');return id;}
async function readable(payload:Payload,req:PayloadRequest,id:number){
 try{return await payload.findByID({collection:'media',id,user:req.user,overrideAccess:false,depth:0,req}) as unknown as MediaRecord;}
 catch(error){if([403,404].includes(Number((error as {status?:number}).status)))throw new HttpError(404,'Không tìm thấy ảnh.');throw error;}
}
function editable(doc:MediaRecord,user:PayloadRequest['user']){
 if(!user||!['owner','support'].includes(user.role)||!mediaEditable(doc,user))throw new HttpError(user?403:401,'Không có quyền chỉnh ảnh này.');
 if(bundledFile(doc.filename))throw new HttpError(400,'Ảnh giao diện không thể chỉnh hoặc khôi phục.');
 if(!supported(doc.mimeType))throw new HttpError(400,'Chỉ chỉnh được ảnh JPEG, PNG hoặc WebP.');
}
export async function mediaOriginalResponse(request:Request,payload:Payload,id:number){
 const {user}=await payload.auth({headers:request.headers});if(!user)throw new HttpError(403,'Không có quyền tải ảnh gốc.');
 const req=await createLocalReq({user,req:{headers:request.headers,signal:request.signal}},payload),visible=await readable(payload,req,id);
 if(!mediaEditable(visible,user))throw new HttpError(403,'Không có quyền tải ảnh gốc.');
 if(bundledFile(visible.filename)||!supported(visible.mimeType))throw new HttpError(404,'Không tìm thấy ảnh gốc.');
 const stored=await payload.findByID({collection:'media',id,overrideAccess:true,depth:0,req}) as unknown as MediaRecord,original=originalFile(stored.originalFile,id);
 if(stored.originalFile&&!original)throw unavailable();
 const data=await readObject(original?.key??await currentKey(stored,req),request.signal),filename=original?.filename??stored.filename!,mimeType=original?.mimeType??stored.mimeType!;
 return new Response(new Uint8Array(data),{headers:{'Content-Type':mimeType,'Content-Length':String(data.length),'Content-Disposition':"attachment; filename*=UTF-8''"+encodeURIComponent(filename),'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'none'; sandbox"}});
}
export async function editMediaImage(request:Request,payload:Payload,id:number,input:Record<string,unknown>){
 requireSameOrigin(request);const edit=parseMediaImageEdit(input),{user}=await payload.auth({headers:request.headers});
 if(!user||!['owner','support'].includes(user.role))throw new HttpError(user?403:401,'Không có quyền chỉnh ảnh này.');
 const req=await createLocalReq({user,req:{headers:request.headers,signal:request.signal}},payload);editable(await readable(payload,req,id),user);
 await initTransaction(req);
 try{
  await mediaWriteGuard({req});await(await payloadTransaction(req)).execute(sql`SELECT id FROM media WHERE id=${id} FOR UPDATE`);
  const visible=await readable(payload,req,id);editable(visible,user);
  if(new Date(visible.updatedAt||'').getTime()!==new Date(edit.updatedAt).getTime())throw new HttpError(409,'Ảnh đã thay đổi. Tải lại trước khi lưu.');
  const stored=await payload.findByID({collection:'media',id,overrideAccess:true,depth:0,req}) as unknown as MediaRecord;
  let data:Buffer,mimeType:ImageMime;
  if(edit.operation==='restore'){
   const original=originalFile(stored.originalFile,id);if(!original)throw new HttpError(409,'Ảnh chưa có bản gốc để khôi phục.');
   data=await readObject(original.key,request.signal);mimeType=original.mimeType;await imageMetadata(data,mimeType);
  }else{
   const source=await readObject(await currentKey(stored,req),request.signal),result=await transformMediaImage(source,stored.mimeType,edit);data=result.data;mimeType=result.mimeType;
  }
  const fresh=await payload.auth({headers:request.headers});if(!fresh.user||fresh.user.id!==user.id)throw new HttpError(401,'Phiên đăng nhập đã thay đổi. Vui lòng đăng nhập lại.');editable(visible,fresh.user);req.user=fresh.user;
  const name=randomUUID()+'-'+(edit.operation==='restore'?'restore':'edit')+'.'+imageTypes[mimeType].extension;
  const updated=await payload.update({collection:'media',id,user:fresh.user,overrideAccess:false,req,file:{name,mimetype:mimeType,data,size:data.length},data:{updatedAt:edit.updatedAt}});
  await commitTransaction(req);const {originalFile:privateOriginal,...safe}=updated as unknown as Record<string,unknown>;void privateOriginal;return safe;
 }catch(error){await killTransaction(req);throw error;}
}
