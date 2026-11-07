import {randomUUID} from 'node:crypto';
import {APIError,createLocalReq,initTransaction,commitTransaction,killTransaction,type Payload,type PayloadRequest} from 'payload';
import type {User} from '../../payload-types';
import {avatarURL} from './avatar';
import {profileImage,PROFILE_IMAGE_LIMIT} from './profile-image';
import {lockAccounts} from './app-sessions';
import {readJsonRequest,requireSameOrigin} from '../http/request';
import {HttpError} from '../http/errors';
import {storageReady} from '../storage/collection';
import {activeValues} from '../integrations/store';
import {rateLimit} from '../chat/service';

export type ProfileData={id:number;name:string;email:string;role:string;updatedAt:string;avatar:number|null;avatarURL:string;canUpload:boolean;canResetPassword:boolean};
export async function profileData(payload:Payload,id:number,req?:PayloadRequest):Promise<ProfileData>{
 const user=await payload.findByID({collection:'users',id,depth:0,overrideAccess:true,req});
 return {id:user.id,name:user.name,email:user.email,role:user.role,updatedAt:user.updatedAt,avatar:typeof user.avatar==='object'?user.avatar?.id||null:user.avatar||null,avatarURL:avatarURL(user),canUpload:await storageReady(),canResetPassword:Boolean(await activeValues('email'))};
}

export async function profilePasswordRequest(request:Request,payload:Payload){
 const json=(value:unknown,status=200)=>Response.json(value,{status,headers:{'Cache-Control':'private, no-store'}});
 try{
  await readJsonRequest(request,1024);
  const {user}=await payload.auth({headers:request.headers});
  if(user?.collection!=='users')throw new HttpError(401,'Vui lòng đăng nhập lại.');
  if((user as User&{rolePreview?:string}).rolePreview)throw new HttpError(403,'Trở về Admin để sửa hồ sơ của bạn.');
  await rateLimit('profile-password:'+user.id,3);
  if(!(await activeValues('email')))throw new HttpError(503,'Email chưa sẵn sàng.');
  const current=await payload.findByID({collection:'users',id:user.id,overrideAccess:true,depth:0});
  // Recovery remains owned by Payload: tokens, expiry, password hashing and
  // session revocation all follow the existing native lifecycle.
  await payload.forgotPassword({collection:'users',data:{email:current.email},context:{accountLanguage:'vi'}});
  return json({ok:true});
 }catch(error){return json({error:error instanceof HttpError||error instanceof APIError?error.message:'Chưa gửi được email. Vui lòng thử lại.'},error instanceof HttpError||error instanceof APIError?error.status:503);}
}
function version(value:unknown){if(typeof value!=='string'||!Number.isFinite(Date.parse(value)))throw new HttpError(400,'Tải lại hồ sơ trước khi lưu.');return value;}
async function uploadInput(request:Request){
 requireSameOrigin(request);
 if(!request.headers.get('content-type')?.startsWith('multipart/form-data;'))throw new HttpError(415,'Chọn một ảnh để tải lên.');
 const reader=request.body?.getReader();if(!reader)throw new HttpError(400,'Chưa chọn ảnh.');
 let size=0;const chunks:Uint8Array[]=[];
 try{for(;;){const part=await reader.read();if(part.done)break;size+=part.value.byteLength;if(size>PROFILE_IMAGE_LIMIT+16384){await reader.cancel();throw new HttpError(413,'Chọn ảnh nhỏ hơn 5 MB.');}chunks.push(part.value);}}
 finally{reader.releaseLock();}
 let form:FormData;try{form=await new Response(Buffer.concat(chunks),{headers:{'Content-Type':request.headers.get('content-type')!}}).formData();}catch{throw new HttpError(400,'Chưa đọc được ảnh đã chọn.');}
 if([...form.keys()].some(key=>!['file','updatedAt'].includes(key))||form.getAll('file').length!==1||form.getAll('updatedAt').length!==1)throw new HttpError(400,'Dữ liệu ảnh không hợp lệ.');
 const file=form.get('file');if(!(file instanceof File))throw new HttpError(400,'Chưa chọn ảnh.');
 return {updatedAt:version(form.get('updatedAt')),image:await profileImage(Buffer.from(await file.arrayBuffer()))};
}
export async function profileRequest(request:Request,payload:Payload){
 const json=(value:unknown,status=200)=>Response.json(value,{status,headers:{'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});
 let req:PayloadRequest|undefined,createdMedia:number|undefined;
 try{
  const {user}=await payload.auth({headers:request.headers});
  if(user?.collection!=='users')throw new HttpError(401,'Vui lòng đăng nhập lại.');
  if(request.method==='GET')return json(await profileData(payload,Number(user.id)));
  requireSameOrigin(request);
  if(!['PATCH','POST','DELETE'].includes(request.method))return json({error:'Phương thức không hợp lệ.'},405);
  // A role preview may inspect the form, but must not mutate the real account.
  if((user as User&{rolePreview?:string}).rolePreview)throw new HttpError(403,'Trở về Admin để sửa hồ sơ của bạn.');
  await rateLimit('profile:'+user.id,20);
  const input:Record<string,unknown>=request.method==='POST'?await uploadInput(request):await readJsonRequest(request,2048);
  const expected=version(input.updatedAt);
  if(request.method==='PATCH'&&Object.keys(input).some(key=>!['name','updatedAt'].includes(key)))throw new HttpError(400,'Chỉ thay đổi tên trong hồ sơ cá nhân.');
  if(request.method==='DELETE'&&Object.keys(input).some(key=>key!=='updatedAt'))throw new HttpError(400,'Dữ liệu không hợp lệ.');
  if(request.method==='POST'&&!(await storageReady()))throw new HttpError(503,'Chưa kết nối lưu trữ ảnh.');
  const name=request.method==='PATCH'&&typeof input.name==='string'?input.name.trim():undefined;
  if(request.method==='PATCH'&&(!name||name.length>100||/[\x00-\x1f\x7f]/.test(name)))throw new HttpError(400,'Nhập tên từ 1 đến 100 ký tự.');
  req=await createLocalReq({user,req:{headers:request.headers,signal:request.signal}},payload);await initTransaction(req);
  await lockAccounts(req,[Number(user.id)]);
  const current=await payload.findByID({collection:'users',id:user.id,depth:0,overrideAccess:true,req});
  if(new Date(current.updatedAt).getTime()!==Date.parse(expected))throw new HttpError(409,'Hồ sơ đã thay đổi. Tải lại trước khi lưu.');
  // Local API override is restricted to this authenticated user's allowlisted
  // profile fields. Native users ACL, roles, email and credentials stay intact.
  let avatar:number|null|undefined;
  if(request.method==='POST'){
   const image=(input as {image:Buffer}).image;
   const media=await payload.create({collection:'media',overrideAccess:true,req,data:{title:'Ảnh đại diện',alt:name||current.name,visibility:'public'},file:{data:image,mimetype:'image/webp',name:'avatar-'+randomUUID()+'.webp',size:image.length}});
   createdMedia=media.id;avatar=media.id;
  }else if(request.method==='DELETE')avatar=null;
  await payload.update({collection:'users',id:user.id,overrideAccess:true,req,data:{...(name?{name}:{}),...(avatar!==undefined?{avatar}:{})}});
  const result=await profileData(payload,Number(user.id),req);await commitTransaction(req);req=undefined;
  return json(result);
 }catch(error){
  // A failed profile write must not leave a committed upload or mutate the
  // user's previous avatar. Use the existing media cleanup lifecycle.
  if(req){if(createdMedia)try{await payload.delete({collection:'media',id:createdMedia,overrideAccess:true,req});}catch{/* Transaction is rolled back below. */}await killTransaction(req);}
  if(error instanceof HttpError||error instanceof APIError)return json({error:error.message},error.status);
  return json({error:'Chưa lưu được hồ sơ. Vui lòng thử lại.'},503);
 }
}

export async function profileAvatarResponse(payload:Payload,idText:string){
 if(!/^[1-9]\d{0,9}$/.test(idText))return new Response(null,{status:404});
 try{
  // Avatars are explicitly public images. Never expose unrelated user fields
  // or allow a private library item to become public by reference.
  const user=await payload.findByID({collection:'users',id:Number(idText),overrideAccess:true,depth:1,select:{avatar:true}});
  const media=user.avatar;
  if(!media||typeof media!=='object'||media.visibility!=='public'||!['image/jpeg','image/png','image/webp'].includes(media.mimeType||'')||!media.url)throw new Error('No public avatar');
  const target=new URL(media.sizes?.thumbnail?.url||media.url,process.env.APP_URL||'http://localhost:3000');
  if(target.origin!==new URL(process.env.APP_URL||'http://localhost:3000').origin||!target.pathname.startsWith('/api/media/file/'))throw new Error('Invalid avatar URL');
  return new Response(null,{status:307,headers:{Location:target.href,'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});
 }catch{return new Response(null,{status:404,headers:{'Cache-Control':'no-store'}});}
}
