import assert from 'node:assert/strict';
import {S3Client} from '@aws-sdk/client-s3';
import {handleEndpoints,type Payload} from 'payload';
import sharp from 'sharp';
import type {User} from '../src/payload-types';
import {pool} from '../src/modules/shared/db';
import {seal} from '../src/modules/integrations/crypto';
import {profileRequest,profileAvatarResponse,profilePasswordRequest} from '../src/modules/identity/profile';
import {profileImage,PROFILE_IMAGE_LIMIT} from '../src/modules/identity/profile-image';
import * as chat from '../src/modules/chat/service';

export async function testProfile(payload:Payload,owner:User){
 const database=new URL(process.env.DATABASE_URL||'');if(database.pathname!=='/lvd_test'||!['localhost','127.0.0.1'].includes(database.hostname))throw new Error('Isolated profile checks only');
 const suffix=crypto.randomUUID(),password=crypto.randomUUID(),origin=process.env.APP_URL||'http://localhost:3000',send=S3Client.prototype.send;
 const objects=new Map<string,Buffer>(),users:User[]=[],mediaIds:number[]=[],conversationIds:string[]=[];
 (S3Client.prototype as any).send=async function(command:any){const {Key,Body}=command.input;if(command.constructor.name==='PutObjectCommand')objects.set(Key,Buffer.from(Body));if(command.constructor.name==='DeleteObjectCommand')objects.delete(Key);return {};};
 const makeRequest=(token:string|undefined,method='GET',data?:unknown,requestOrigin=origin)=>new Request(origin+'/service/profile',{method,headers:{origin:requestOrigin,...(token?{authorization:'JWT '+token}:{}),...(data&&!(data instanceof FormData)?{'Content-Type':'application/json'}:{})},...(data?{body:data instanceof FormData?data:JSON.stringify(data)}:{})});
 let failSave=false;
 const failHook=()=>{if(failSave)throw new Error('Synthetic profile save failure');};payload.collections.users.config.hooks.afterChange.push(failHook);
 try{
  const image=await sharp({create:{width:1200,height:800,channels:3,background:'#987'}}).jpeg().withMetadata({orientation:6}).toBuffer();
  const normalized=await profileImage(image),meta=await sharp(normalized).metadata();assert.deepEqual([meta.width,meta.height,meta.format],[384,384,'webp']);assert.equal(meta.exif,undefined);assert.equal(meta.orientation,undefined);
  await assert.rejects(()=>profileImage(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"/>')),{status:400});
  await assert.rejects(()=>profileImage(Buffer.from('not an image')),{status:400});await assert.rejects(()=>profileImage(Buffer.alloc(PROFILE_IMAGE_LIMIT+1)),{status:413});
  await pool.query("INSERT INTO lvd_integrations(provider,encrypted_values,enabled,check_state) VALUES('r2',$1,true,'passed')",[seal('r2',{endpoint:'https://'+'a'.repeat(32)+'.r2.cloudflarestorage.com',bucket:'synthetic-avatar',accessKeyId:'synthetic-only',secretAccessKey:'synthetic-only'})]);
  for(const role of ['support','member'] as const)users.push(await payload.create({collection:'users',user:owner,overrideAccess:false,data:{name:'Synthetic '+role,email:'profile-'+role+'-'+suffix+'@example.invalid',password,role}}));
  assert.equal((await profileRequest(makeRequest(undefined),payload)).status,401);
  for(const user of users){
   const token=(await payload.login({collection:'users',data:{email:user.email,password}})).token!;
   let state=await(await profileRequest(makeRequest(token),payload)).json();assert.equal(state.id,user.id);assert.equal(state.avatarURL,'');assert.equal(state.canUpload,true);
   assert.equal((await profileRequest(makeRequest(token,'PATCH',{name:'Forged',role:'owner',updatedAt:state.updatedAt}),payload)).status,400);
   assert.equal((await profileRequest(makeRequest(token,'PATCH',{name:'Forged',id:owner.id,updatedAt:state.updatedAt}),payload)).status,400);
   assert.equal((await profileRequest(makeRequest(token,'PATCH',{name:'Name',updatedAt:state.updatedAt},'https://other.invalid'),payload)).status,403);
   const stale=state.updatedAt;
   const renamed=await profileRequest(makeRequest(token,'PATCH',{name:'Profile '+user.role,updatedAt:state.updatedAt}),payload);assert.equal(renamed.status,200);state=await renamed.json();assert.equal(state.name,'Profile '+user.role);
   assert.equal((await profileRequest(makeRequest(token,'PATCH',{name:state.name,phone:'not a phone',updatedAt:state.updatedAt}),payload)).status,400);
   assert.equal((await profileRequest(makeRequest(token,'PATCH',{name:state.name,location:'x'.repeat(161),updatedAt:state.updatedAt}),payload)).status,400);
   const contact=await profileRequest(makeRequest(token,'PATCH',{name:state.name,phone:'+49 30 123456',location:'Berlin, Đức',updatedAt:state.updatedAt}),payload);assert.equal(contact.status,200);state=await contact.json();assert.equal(state.phone,'+49 30 123456');assert.equal(state.location,'Berlin, Đức');
   assert.equal((await profileRequest(makeRequest(token,'PATCH',{name:'Stale',updatedAt:stale}),payload)).status,409);
   const direct=await handleEndpoints({config:payload.config,request:new Request(origin+'/api/users/'+owner.id,{method:'PATCH',headers:{origin,authorization:'JWT '+token,'Content-Type':'application/json'},body:JSON.stringify({name:'Foreign edit'})})});assert.equal(direct.status,403,'Self profile does not broaden native account ACL');
   const form=new FormData();form.set('file',new File([new Uint8Array(image)],'portrait.jpg',{type:'image/jpeg'}));form.set('updatedAt',state.updatedAt);
   const uploaded=await profileRequest(makeRequest(token,'POST',form),payload);assert.equal(uploaded.status,200,JSON.stringify(await uploaded.clone().json()));state=await uploaded.json();mediaIds.push(state.avatar);
   assert.match(state.avatarURL,new RegExp('^/service/profile/avatar/'+user.id));
   const customer:chat.Actor={user,guestHash:''},conversation=await chat.createConversation(customer,{consent:true},{assistantEnabled:true});conversationIds.push(conversation.id);
   const key=crypto.randomUUID(),sent=await chat.message(customer,conversation.id,{key,body:'SĐT: 0901234567',browserContext:{timeZone:'Europe/Berlin',language:'vi-VN',country:'VN'}},2000,{country:'DE'});
   await chat.message(customer,conversation.id,{key,body:'SĐT: 0901234567',browserContext:{timeZone:'Asia/Saigon'}},2000);
   const detail=(await chat.transcript({user:owner,guestHash:''},conversation.id)).conversation.customer;
   assert.equal(detail?.name,state.name);assert.equal(detail?.email,user.email);assert.equal(detail?.phone,state.phone);assert.equal(detail?.location,state.location);assert.match(detail?.avatarURL||'',new RegExp('^/service/profile/avatar/'+user.id));
   assert.equal((await chat.transcript(customer,conversation.id)).conversation.customer?.name,user.role==='support'?state.name:undefined,'Staff viewing their own conversation receive profile details; regular customer responses do not expose operator details');
   const incremental=await chat.transcript({user:owner,guestHash:''},conversation.id,Number(sent.id));assert.equal(incremental.messages.length,0);assert.equal(incremental.conversation.info?.browser?.country,'DE');assert.equal(incremental.conversation.info?.browser?.timeZone,'Europe/Berlin','Send retries cannot replace the original browser hint');assert.equal(incremental.conversation.info?.facts.find(f=>f.field==='phone')?.value,'0901234567','Facts survive incremental message cursors');
   if(user.role==='member')assert.equal((await chat.transcript(customer,conversation.id)).conversation.info,undefined,'Staff-only summaries stay off the customer response');
   await assert.rejects(()=>chat.transcript({user:null,guestHash:crypto.randomUUID()},conversation.id),{status:403});
   const media=await payload.findByID({collection:'media',id:state.avatar,overrideAccess:true,depth:0});assert.equal(media.visibility,'public');assert.equal(media.uploadedBy,user.id);assert.equal(media.mimeType,'image/webp');assert.equal(media.width,384);assert.equal(media.height,384);assert.ok(media.filesize!<image.length);
   assert.equal((await profileAvatarResponse(payload,String(user.id))).status,307);
   const bad=new FormData();bad.set('file',new File(['<svg/>'],'bad.svg',{type:'image/svg+xml'}));bad.set('updatedAt',state.updatedAt);assert.equal((await profileRequest(makeRequest(token,'POST',bad),payload)).status,400);
   const failure=new FormData();failure.set('file',new File([new Uint8Array(image)],'portrait.jpg'));failure.set('updatedAt',state.updatedAt);
   const beforeCount=await payload.count({collection:'media',overrideAccess:true});failSave=true;
   assert.equal((await profileRequest(makeRequest(token,'POST',failure),payload)).status,503);failSave=false;
   assert.equal((await payload.count({collection:'media',overrideAccess:true})).totalDocs,beforeCount.totalDocs,'Failed user save rolls back the new media row');assert.equal((await payload.findByID({collection:'users',id:user.id,overrideAccess:true,depth:0})).avatar,state.avatar,'Previous avatar survives failed save');
   const removed=await profileRequest(makeRequest(token,'DELETE',{updatedAt:state.updatedAt}),payload);assert.equal(removed.status,200);state=await removed.json();assert.equal(state.avatarURL,'');assert.equal((await profileAvatarResponse(payload,String(user.id))).status,404);
   assert.equal((await payload.findByID({collection:'users',id:user.id,overrideAccess:true})).role,user.role,'Profile never changes role');
  }
  assert.equal((await profilePasswordRequest(makeRequest(undefined,'POST',{}),payload)).status,401);
  assert.equal((await profileAvatarResponse(payload,'invalid')).status,404);
  console.log('Profile checks passed: self-only name/avatar for member and specialist, native ACL unchanged, CSRF, stale writes, actual pixel validation, metadata stripping, R2 thumbnails, upload rollback, public avatar redirect and removal. No external requests.');
 }finally{
  failSave=false;const index=payload.collections.users.config.hooks.afterChange.indexOf(failHook);if(index>=0)payload.collections.users.config.hooks.afterChange.splice(index,1);
  if(conversationIds.length)await pool.query('DELETE FROM lvd_conversations WHERE id=ANY($1::uuid[])',[conversationIds]);
  for(const id of mediaIds)await payload.delete({collection:'media',id,overrideAccess:true});for(const user of users)await payload.delete({collection:'users',id:user.id,overrideAccess:true});
  S3Client.prototype.send=send;await pool.query("DELETE FROM lvd_integrations WHERE provider='r2'");
 }
}
