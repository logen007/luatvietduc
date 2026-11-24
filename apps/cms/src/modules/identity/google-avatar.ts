import {randomUUID} from 'node:crypto';
import {createLocalReq,initTransaction,commitTransaction,killTransaction,type Payload,type PayloadRequest} from 'payload';
import {profileImage,PROFILE_IMAGE_LIMIT} from './profile-image';
import {lockAccounts} from './app-sessions';
import {storageReady} from '../storage/collection';
export function googlePictureURL(value:unknown){
 if(typeof value!=='string'||value.length>2048)return null;
 try{const url=new URL(value);return url.protocol==='https:'&&!url.username&&!url.password&&(!url.port||url.port==='443')&&/^lh\d+\.googleusercontent\.com$/.test(url.hostname)?url.href:null;}catch{return null;}
}
// Called only after Google's signed identity, nonce and account link are verified.
// Import actual pixels into the existing avatar lifecycle; never override a custom image.
export async function syncGoogleAvatar(payload:Payload,userId:number,picture:unknown,request:typeof fetch=fetch){
 const url=googlePictureURL(picture);if(!url||!Number.isSafeInteger(userId)||userId<1)return false;
 const user=await payload.findByID({collection:'users',id:userId,depth:0,overrideAccess:true});
 if(user.avatar||!user._verified||!await storageReady())return false;
 const response=await request(url,{redirect:'error',credentials:'omit',referrerPolicy:'no-referrer',cache:'no-store',signal:AbortSignal.timeout(8000)});
 if(!response.ok||!response.body||!['image/jpeg','image/png','image/webp'].includes((response.headers.get('content-type')||'').split(';')[0])||Number(response.headers.get('content-length'))>PROFILE_IMAGE_LIMIT)throw new Error('Google avatar unavailable');
 const reader=response.body.getReader(),chunks:Uint8Array[]=[];let size=0;
 try{for(;;){const part=await reader.read();if(part.done)break;size+=part.value.byteLength;if(size>PROFILE_IMAGE_LIMIT){await reader.cancel();throw new Error('Google avatar exceeds limit');}chunks.push(part.value);}}finally{reader.releaseLock();}
 const image=await profileImage(Buffer.concat(chunks));let req:PayloadRequest|undefined,created:number|undefined;
 try{
  req=await createLocalReq({user:{...user,collection:'users'}},payload);await initTransaction(req);await lockAccounts(req,[userId]);
  const current=await payload.findByID({collection:'users',id:userId,depth:0,overrideAccess:true,req});
  if(current.avatar||!current._verified){await commitTransaction(req);req=undefined;return false;}
  const media=await payload.create({collection:'media',overrideAccess:true,req,data:{title:'Ảnh đại diện Google',alt:current.name,visibility:'public'},file:{data:image,mimetype:'image/webp',name:'google-avatar-'+randomUUID()+'.webp',size:image.length}});created=media.id;
  await payload.update({collection:'users',id:userId,overrideAccess:true,req,data:{avatar:media.id}});
  await commitTransaction(req);req=undefined;return true;
 }catch(error){
  if(req){if(created)try{await payload.delete({collection:'media',id:created,overrideAccess:true,req});}catch{}await killTransaction(req);}
  throw error;
 }
}
