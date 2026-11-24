import assert from 'node:assert/strict';
import {Readable} from 'node:stream';
import {S3Client} from '@aws-sdk/client-s3';
import sharp from 'sharp';
import {handleEndpoints,type Payload} from 'payload';
import type {User} from '../src/payload-types';
import {pool} from '../src/modules/shared/db';
import {seal} from '../src/modules/integrations/crypto';
import {editMediaImage,mediaOriginalResponse,parseMediaImageEdit,transformMediaImage,MAX_MEDIA_IMAGE_BYTES,type MediaOriginalFile} from '../src/modules/storage/image-edit';
import {testMediaCoordinateForgery} from './test-media-coordinates';
import {mediaInventorySQL} from '../src/modules/storage/inventory';

export async function testMediaImageTransforms(){
 const red=[255,0,0],green=[0,255,0],blue=[0,0,255],cyan=[0,255,255],magenta=[255,0,255],yellow=[255,255,0];
 const source=await sharp(Buffer.from([...red,...green,...blue,...cyan,...magenta,...yellow]),{raw:{width:3,height:2,channels:3}}).png().toBuffer();
 const updatedAt='2026-11-05T00:00:00Z';
 const edit=parseMediaImageEdit({operation:'edit',updatedAt,crop:{left:1,top:0,width:2,height:2},rotate:90,flipHorizontal:true,flipVertical:true});assert.equal(edit.operation,'edit');
 if(edit.operation!=='edit')throw new Error('Expected edit');
 const result=await transformMediaImage(source,'image/png',edit),pixels=await sharp(result.data).removeAlpha().raw().toBuffer();
 assert.deepEqual([result.width,result.height],[2,2]);assert.deepEqual(pixels,Buffer.from([...blue,...yellow,...green,...magenta]),'Crop, rotate, post-rotation flips follow the preview order');
 const large=await sharp({create:{width:100,height:60,channels:3,background:'#888'}}).png().toBuffer();
 const smaller=await transformMediaImage(large,'image/png',{operation:'edit',updatedAt,width:40,height:24});assert.deepEqual([smaller.width,smaller.height],[40,24]);
 await assert.rejects(()=>transformMediaImage(large,'image/png',{operation:'edit',updatedAt,width:101,height:61}),{status:400});
 await assert.rejects(()=>transformMediaImage(large,'image/png',{operation:'edit',updatedAt,width:40,height:40}),{status:400});
 await assert.rejects(()=>transformMediaImage(source,'image/png',{operation:'edit',updatedAt,crop:{left:2,top:0,width:2,height:2}}),{status:400});
 await assert.rejects(()=>transformMediaImage(Buffer.alloc(MAX_MEDIA_IMAGE_BYTES+1),'image/jpeg',{operation:'edit',updatedAt,rotate:90}),{status:413});
 for(const invalid of [{},{operation:'edit',updatedAt,rotate:45},{operation:'edit',updatedAt,flipHorizontal:'true'},{operation:'edit',updatedAt,crop:{left:-1,top:0,width:1,height:1}},{operation:'edit',updatedAt,width:1.5}])assert.throws(()=>parseMediaImageEdit(invalid),{status:400});
 const exif=await sharp({create:{width:30,height:20,channels:3,background:'#888'}}).jpeg().withMetadata({orientation:6}).toBuffer();
 const oriented=await transformMediaImage(exif,'image/jpeg',{operation:'edit',updatedAt,crop:{left:0,top:0,width:10,height:30},rotate:90});
 assert.deepEqual([oriented.width,oriented.height],[30,10]);assert.equal((await sharp(oriented.data).metadata()).orientation,undefined,'Saved geometry has no EXIF orientation mismatch');
 console.log('Image transform checks passed: exact combined pixel order, proportional shrink, no enlargement, bounds, byte limit and EXIF-oriented crop coordinates.');
}

export async function testMediaImageEdit(payload:Payload,owner:User){
 const database=new URL(process.env.DATABASE_URL||'');if(database.pathname!=='/lvd_test'||!['localhost','127.0.0.1'].includes(database.hostname))throw new Error('Isolated image-edit checks only');
 await testMediaImageTransforms();
 const send=S3Client.prototype.send,objects=new Map<string,{body:Buffer;mimeType:string}>(),puts:string[]=[],deletes:string[]=[],suffix=crypto.randomUUID(),password=crypto.randomUUID(),origin=process.env.APP_URL||'http://localhost:3000';
 let actor:User|undefined,other:User|undefined,imageId:number|undefined,failDeleteKey:string|undefined,reads=0;
 (S3Client.prototype as any).send=async function(command:any){
  const {Key,Body,ContentType}=command.input;
  if(command.constructor.name==='PutObjectCommand'){assert.ok(Buffer.isBuffer(Body));puts.push(Key);objects.set(Key,{body:Buffer.from(Body),mimeType:ContentType});return {};}
  if(command.constructor.name==='DeleteObjectCommand'){deletes.push(Key);if(Key===failDeleteKey){failDeleteKey=undefined;throw new Error('Synthetic one-time deletion failure');}objects.delete(Key);return {};}
  if(command.constructor.name==='GetObjectCommand'){reads++;const found=objects.get(Key);if(!found)throw new Error('Missing synthetic object');return {Body:Readable.from([found.body]),ContentType:found.mimeType,ContentLength:found.body.length};}
  return {};
 };
 const request=(id:number,token?:string,method='POST')=>new Request(origin+'/service/media/image/'+id,{method,headers:{origin,...(token?{authorization:'JWT '+token}:{})}});
 const stored=async()=>await payload.findByID({collection:'media',id:imageId!,overrideAccess:true,depth:0}) as unknown as {id:number;filename:string;updatedAt:string;originalFile:MediaOriginalFile;sizes:Record<string,{filename?:string}>};
 try{
  await pool.query("INSERT INTO lvd_integrations(provider,encrypted_values,enabled,check_state) VALUES('r2',$1,true,'passed')",[seal('r2',{endpoint:'https://'+'a'.repeat(32)+'.r2.cloudflarestorage.com',bucket:'synthetic-media-edit',accessKeyId:'synthetic-only',secretAccessKey:'synthetic-only'})]);
  actor=await payload.create({collection:'users',user:owner,overrideAccess:false,data:{name:'Synthetic image editor',email:'image-edit-'+suffix+'@example.invalid',password,role:'support',jurisdictions:['VN']}});
  other=await payload.create({collection:'users',user:owner,overrideAccess:false,data:{name:'Synthetic other editor',email:'other-image-edit-'+suffix+'@example.invalid',password,role:'support',jurisdictions:['VN']}});
  const token=(await payload.login({collection:'users',data:{email:actor.email,password}})).token!,otherToken=(await payload.login({collection:'users',data:{email:other.email,password}})).token!;
  const input=await sharp({create:{width:400,height:240,channels:3,background:'#899'}}).png().toBuffer();
  const created=await payload.create({collection:'media',user:actor,overrideAccess:false,file:{name:'synthetic-'+suffix+'.png',mimetype:'image/png',data:input,size:input.length},data:{title:'Synthetic editable image',prefix:'originals/2147483647',_objectKey:'foreign'} as any});imageId=created.id;
  const image=await testMediaCoordinateForgery(payload,actor,created.id);
  assert.equal(puts.some(key=>key.startsWith('originals/')),false,'An upload cannot choose the protected original-source namespace');
  const initial=await stored(),initialNames=[initial.filename,...Object.values(initial.sizes||{}).map(size=>size.filename).filter((name):name is string=>Boolean(name))];
  assert.equal(initial.originalFile??undefined,undefined);
  const original=Buffer.from(await(await mediaOriginalResponse(request(imageId,token,'GET'),payload,imageId)).arrayBuffer());
  assert.deepEqual(original,objects.get(initial.filename)?.body,'Unedited original download falls back to the stored upload');
  assert.deepEqual(await sharp(original).raw().toBuffer(),await sharp(input).raw().toBuffer(),'Upload compression preserves every source pixel');
  const before=reads;await assert.rejects(()=>mediaOriginalResponse(request(image.id,undefined,'GET'),payload,image.id),{status:403});assert.equal(reads,before);
  await assert.rejects(()=>editMediaImage(request(image.id,otherToken),payload,image.id,{operation:'edit',updatedAt:image.updatedAt,rotate:90}),{status:403});
  assert.equal(puts.some(key=>key.startsWith('originals/')),false,'Unauthorized edits cannot create a backup');
  const edited=await editMediaImage(request(imageId,token),payload,imageId,{operation:'edit',updatedAt:image.updatedAt,crop:{left:0,top:0,width:300,height:200},rotate:90,flipHorizontal:true,width:100,height:150});
  assert.equal(edited.id,imageId);assert.deepEqual([edited.width,edited.height],[100,150]);assert.equal(edited.originalFile,undefined);assert.equal(edited.originalImageURL,'/service/media/image/'+imageId);
  const after=await stored(),backup=after.originalFile;assert.equal(backup.key,'originals/'+imageId+'/source.png');assert.deepEqual(objects.get(backup.key)?.body,original);assert.equal(puts.filter(key=>key===backup.key).length,1);
  const inventory=(await pool.query(mediaInventorySQL)).rows.map(row=>[row.prefix,row._object_key,row.filename].filter(Boolean).join('/'));
  for(const key of [after.filename,...Object.values(after.sizes||{}).map(size=>size.filename),backup.key].filter((value):value is string=>typeof value==='string'))assert.ok(inventory.includes(key),'Backup inventory includes each current size and retained original');
  assert.notEqual(after.filename,initial.filename);for(const name of initialNames)assert.equal(objects.has(name),false,'Native replacement cleans the old current sizes');
  const response=await handleEndpoints({config:payload.config,request:new Request(origin+'/api/media/'+imageId,{headers:{authorization:'JWT '+token}})}),visible=await response.json();
  assert.equal(response.status,200);assert.equal(visible.originalFile,undefined);assert.equal(visible.originalImageURL,'/service/media/image/'+imageId);
  assert.deepEqual(Buffer.from(await(await mediaOriginalResponse(request(imageId,token,'GET'),payload,imageId)).arrayBuffer()),original);
  await assert.rejects(()=>editMediaImage(request(image.id,token),payload,image.id,{operation:'restore',updatedAt:image.updatedAt}),{status:409});
  const again=await editMediaImage(request(imageId,token),payload,imageId,{operation:'edit',updatedAt:after.updatedAt,flipVertical:true});assert.equal(puts.filter(key=>key===backup.key).length,1);
  const restored=await editMediaImage(request(imageId,token),payload,imageId,{operation:'restore',updatedAt:again.updatedAt});assert.deepEqual([restored.width,restored.height],[400,240]);
  const last=await stored();assert.deepEqual(objects.get(last.filename)?.body,original,'Restore reproduces the preserved original bytes');assert.equal(last.originalFile.key,backup.key);assert.equal(puts.filter(key=>key===backup.key).length,1);
  const forged=await payload.update({collection:'media',id:imageId,user:actor,overrideAccess:false,data:{originalFile:{key:'unowned-object'}} as any});assert.equal((forged as any).originalFile,undefined);assert.equal((await stored()).originalFile.key,backup.key);
  await payload.update({collection:'media',id:imageId,user:owner,overrideAccess:false,data:{visibility:'public'}});
  const publicReads=reads;
  await assert.rejects(()=>mediaOriginalResponse(request(image.id,undefined,'GET'),payload,image.id),{status:403});
  await assert.rejects(()=>mediaOriginalResponse(request(image.id,otherToken,'GET'),payload,image.id),{status:403});assert.equal(reads,publicReads,'Public current visibility does not expose the retained uncropped source');
  const publicDocResponse=await handleEndpoints({config:payload.config,request:new Request(origin+'/api/media/'+imageId)}),publicDoc=await publicDocResponse.json();
  assert.equal(publicDocResponse.status,200);assert.equal(publicDoc.originalImageURL,undefined);assert.equal(publicDoc.originalFile,undefined);
  const publicCurrent=await handleEndpoints({config:payload.config,request:new Request(origin+'/api/media/file/'+encodeURIComponent(last.filename))});assert.equal(publicCurrent.status,200);await publicCurrent.arrayBuffer();
  assert.deepEqual(Buffer.from(await(await mediaOriginalResponse(request(imageId,token,'GET'),payload,imageId)).arrayBuffer()),original,'The owning support user can still retrieve the retained original');
  const allKeys=[backup.key,last.filename,...Object.values(last.sizes||{}).map(size=>size.filename).filter((name):name is string=>Boolean(name))];
  const deleteStart=deletes.length;failDeleteKey=backup.key;
  await assert.rejects(()=>payload.delete({collection:'media',id:image.id,user:actor,overrideAccess:false}),{status:503});
  const retained=await stored();assert.equal(retained.id,image.id);assert.equal(retained.originalFile.key,backup.key,'A partial storage deletion rolls the database row back');
  assert.ok(deletes.slice(deleteStart).includes(last.filename),'The synthetic failure occurs after a current file was deleted');assert.equal(objects.has(last.filename),false);assert.equal(objects.has(backup.key),true,'The failed backup deletion remains available for retry');
  await payload.delete({collection:'media',id:imageId,user:actor,overrideAccess:false});imageId=undefined;for(const key of allKeys){assert.ok(deletes.includes(key));assert.equal(objects.has(key),false);}
  console.log('Image editor checks passed: owned edit authorization, restricted uncropped originals despite public current visibility, one preserved original, combined save, stale conflict, repeated edits, exact restore, hidden descriptor, partial deletion rollback and retry cleanup of current/derived/original files. No external storage calls.');
 }finally{
  if(imageId)await payload.delete({collection:'media',id:imageId,overrideAccess:true});
  if(actor)await payload.delete({collection:'users',id:actor.id,overrideAccess:true});if(other)await payload.delete({collection:'users',id:other.id,overrideAccess:true});
  S3Client.prototype.send=send;await pool.query("DELETE FROM lvd_integrations WHERE provider='r2'");
 }
}
