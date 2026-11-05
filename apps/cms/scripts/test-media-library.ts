import assert from 'node:assert/strict';
import {Readable} from 'node:stream';
import {S3Client} from '@aws-sdk/client-s3';
import {handleEndpoints,type Payload} from 'payload';
import sharp from 'sharp';
import type {User} from '../src/payload-types';
import {pool} from '../src/modules/shared/db';
import {seal} from '../src/modules/integrations/crypto';
import {bundledNames} from '../src/modules/storage/bundled';
export async function testMediaLibrary(payload:Payload,owner:User){
 const db=new URL(process.env.DATABASE_URL||'');if(db.pathname!=='/lvd_test'||!['127.0.0.1','localhost'].includes(db.hostname))throw new Error('Isolated media checks only');
 const send=S3Client.prototype.send,ids:number[]=[],suffix=crypto.randomUUID(),objects=new Map<string,{body:Buffer;mimeType:string}>(),deletions:string[]=[];let uploads=0,reads=0,failDeleteKey:string|undefined;
 (S3Client.prototype as any).send=async function(command:any){
  const {Key,Body,ContentType}=command.input;
  if(command.constructor.name==='PutObjectCommand'){uploads++;assert.ok(Buffer.isBuffer(Body));objects.set(Key,{body:Buffer.from(Body),mimeType:ContentType});}
  if(command.constructor.name==='DeleteObjectCommand'){deletions.push(Key);if(Key===failDeleteKey){failDeleteKey=undefined;throw new Error('Synthetic one-time bulk deletion failure');}objects.delete(Key);}
  if(command.constructor.name==='GetObjectCommand'){reads++;const object=objects.get(Key);if(!object)throw new Error('Synthetic storage object missing');return {Body:Readable.from([object.body]),ContentType:object.mimeType,ContentLength:object.body.length};}
  return {};
 };
 const svg='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><circle cx="10" cy="10" r="8" fill="#333"/></svg>';
 const file=(name:string,body=svg)=>({name,mimetype:'image/svg+xml',data:Buffer.from(body),size:Buffer.byteLength(body)});
 try{
  await pool.query("INSERT INTO lvd_integrations(provider,encrypted_values,enabled,check_state) VALUES('r2',$1,true,'passed')",[seal('r2',{endpoint:'https://'+'a'.repeat(32)+'.r2.cloudflarestorage.com',bucket:'synthetic-media',accessKeyId:'synthetic-only',secretAccessKey:'synthetic-only'})]);
  for(const index of [1,2]){const doc=await payload.create({collection:'media',user:owner,overrideAccess:false,file:file('synthetic-'+suffix+'-'+index+'.svg'),data:{alt:'Synthetic media '+index,visibility:'private'}});ids.push(doc.id);assert.equal(doc.mimeType,'image/svg+xml');}
  assert.equal(uploads,2,'Safe SVG reaches only the fake storage adapter');
  await assert.rejects(()=>payload.create({collection:'media',user:owner,overrideAccess:false,file:file('unsafe-'+suffix+'.svg','<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'),data:{alt:'Rejected active SVG'}}));
  assert.equal(uploads,2,'Active SVG never reaches storage');
  const updated=await payload.update({collection:'media',user:owner,overrideAccess:false,where:{id:{in:ids}},data:{alt:'Bulk synthetic edit',visibility:'public'}});assert.equal(updated.docs.length,2);assert.equal(updated.errors.length,0);
  for(const id of ids){const doc=await payload.findByID({collection:'media',id,user:owner,overrideAccess:false});assert.equal(doc.alt,'Bulk synthetic edit');assert.equal(doc.visibility,'public');}
  const bundled=(await payload.find({collection:'media',user:owner,overrideAccess:false,where:{filename:{in:bundledNames}},limit:1})).docs[0];assert.ok(bundled);
  const edited=await payload.update({collection:'media',id:bundled.id,user:owner,overrideAccess:false,data:{title:'Interface metadata test',alt:'Accessible interface asset',caption:'Caption',description:'Description'}});assert.equal(edited.alt,'Accessible interface asset');assert.equal(uploads,2,'Editing bundled metadata never uploads or replaces a file');
  const renamed=await payload.update({collection:'media',id:bundled.id,user:owner,overrideAccess:false,data:{filename:'changed.svg'}});assert.equal(renamed.filename,bundled.filename,'Native upload fields ignore forged filename changes');
  await assert.rejects(()=>payload.update({collection:'media',id:bundled.id,user:owner,overrideAccess:false,data:{visibility:'private'}}));
  await assert.rejects(()=>payload.update({collection:'media',id:bundled.id,user:owner,overrideAccess:false,file:file('replacement.svg'),data:{alt:'Blocked replacement'}}));
  await assert.rejects(()=>payload.update({collection:'media',id:bundled.id,user:owner,overrideAccess:false,data:{title:'Stale',updatedAt:bundled.updatedAt}}));
  await payload.update({collection:'media',id:bundled.id,user:owner,overrideAccess:false,data:{title:bundled.title,alt:bundled.alt||'',caption:bundled.caption||'',description:bundled.description||''}});
  // Packaged entry deletion is covered in a rolled-back native transaction by
  // test-media-families; replacement and visibility keep their separate rules.
  const specialistPassword=crypto.randomUUID(),specialist=await payload.create({collection:'users',user:owner,overrideAccess:false,data:{name:'Synthetic uploader',email:'media-'+suffix+'@example.invalid',password:specialistPassword,role:'support',jurisdictions:['VN']}});
  try{
   const own=await payload.create({collection:'media',user:specialist,overrideAccess:false,file:file('own-'+suffix+'.svg'),data:{title:'Own media',uploadedBy:owner.id}});ids.push(own.id);assert.equal(typeof own.uploadedBy==='object'?own.uploadedBy?.id:own.uploadedBy,specialist.id,'Uploader identity is server assigned');
   await payload.update({collection:'media',id:own.id,user:specialist,overrideAccess:false,data:{caption:'Own caption'}});
   await assert.rejects(()=>payload.update({collection:'media',id:ids[0],user:specialist,overrideAccess:false,data:{caption:'Forbidden'}}));
   await assert.rejects(()=>payload.delete({collection:'media',id:bundled.id,user:specialist,overrideAccess:false}));
   await payload.delete({collection:'media',id:own.id,user:specialist,overrideAccess:false});ids.pop();
   const authenticated=await payload.login({collection:'users',data:{email:specialist.email,password:specialistPassword}}),origin=process.env.APP_URL||'http://localhost:3000';assert.ok(authenticated.token);
   const authenticatedToken=authenticated.token;
   const readFile=(filename:string,withAuth=false)=>handleEndpoints({config:payload.config,request:new Request(origin+'/api/media/file/'+encodeURIComponent(filename),{headers:withAuth?{authorization:'JWT '+authenticatedToken}:{}})});
   const images=[];
   for(const dimensions of [{width:1800,height:1200},{width:80,height:60}]){
    const data=await sharp({create:{...dimensions,channels:3,background:'#888888'}}).jpeg().toBuffer(),filename='synthetic-image-'+dimensions.width+'-'+suffix+'.jpg';
    const image=await payload.create({collection:'media',user:owner,overrideAccess:false,file:{name:filename,mimetype:'image/jpeg',data,size:data.length},data:{title:'Synthetic image',visibility:'private'}});ids.push(image.id);
    const sizes=(image as unknown as {sizes:Record<string,{filename:string;width:number;height:number;mimeType:string;filesize:number;url:string}>}).sizes;
    assert.ok(sizes,'Native image sizes require the configured Sharp dependency');
    assert.equal(image.width,dimensions.width);assert.equal(image.height,dimensions.height);assert.ok(image.filename);assert.deepEqual(objects.get(image.filename)?.body,data,'The uploaded original stays intact');
    for(const name of ['thumbnail','medium','large']){
     const size=sizes[name];assert.ok(size?.filename,name+' belongs to the original');assert.equal(size.mimeType,'image/jpeg');assert.ok(size.width<=dimensions.width&&size.height<=dimensions.height,'A generated size never enlarges the original');
     const bounds=name==='thumbnail'?150:name==='medium'?600:1200;assert.ok(size.width<=bounds&&size.height<=bounds);
     const stored=objects.get(size.filename);assert.ok(stored,'Every generated file reaches only the fake S3 adapter');const metadata=await sharp(stored.body).metadata();assert.equal(metadata.width,size.width);assert.equal(metadata.height,size.height);
    }
    if(dimensions.width===1800){assert.deepEqual([sizes.thumbnail.width,sizes.thumbnail.height],[150,150]);assert.deepEqual([sizes.medium.width,sizes.medium.height],[600,400]);assert.deepEqual([sizes.large.width,sizes.large.height],[1200,800]);}
    const filenames=[...new Set([image.filename,...Object.values(sizes).map(size=>size.filename)])];
    assert.equal((await payload.count({collection:'media',user:owner,overrideAccess:false,where:{filename:{in:filenames}}})).totalDocs,1,'Derivatives do not become independent media records');
    for(const name of filenames){
     const before=reads,denied=await readFile(name);assert.equal(denied.status,403);assert.equal(reads,before,'Private originals and sizes are denied before S3 reads');
     const response=await readFile(name,true);assert.equal(response.status,200);assert.deepEqual(Buffer.from(await response.arrayBuffer()),objects.get(name)?.body);
    }
    await assert.rejects(()=>payload.findByID({collection:'media',id:image.id,overrideAccess:false}));
    const beforeMetadataUploads:number=uploads;
    const forged=await payload.update({collection:'media',id:image.id,user:owner,overrideAccess:false,data:{filename:'forged-'+suffix+'.jpg',sizes:{thumbnail:{filename:'other-original.jpg'}}} as any});
    assert.equal(forged.filename,image.filename);assert.deepEqual((forged as any).sizes,sizes,'Non-override writes cannot forge derived-file ownership');assert.equal(uploads,beforeMetadataUploads,'Metadata edits do not recreate image files');
    const beforeDeletes=deletions.length;await assert.rejects(()=>payload.delete({collection:'media',id:image.id,user:specialist,overrideAccess:false}));assert.equal(deletions.length,beforeDeletes,'An unauthorized delete cannot remove any original or derivative');
    await payload.update({collection:'media',id:image.id,user:owner,overrideAccess:false,data:{visibility:'public'}});
    for(const name of filenames){const response=await readFile(name);assert.equal(response.status,200);await response.arrayBuffer();}
    images.push({id:image.id,filenames});
   }
   for(const [index,image] of images.entries()){
    const start=deletions.length;
    if(index===0)await payload.delete({collection:'media',id:image.id,user:owner,overrideAccess:false});
    else{
     const stored=await payload.findByID({collection:'media',id:image.id,overrideAccess:true,depth:0}),sourceKey='originals/'+image.id+'/source.jpg',source=objects.get(image.filenames[0]);assert.ok(source);
     const originalFile={key:sourceKey,filename:stored.filename,mimeType:'image/jpeg',filesize:source.body.length,width:stored.width,height:stored.height};
     await pool.query('UPDATE media SET original_file=$1::jsonb WHERE id=$2',[JSON.stringify(originalFile),image.id]);objects.set(sourceKey,{body:Buffer.from(source.body),mimeType:source.mimeType});
     const beforeDenied:number[]=[uploads,reads,deletions.length],denied=await payload.delete({collection:'media',where:{id:{in:[image.id]}},user:specialist,overrideAccess:false});assert.equal(denied.docs.length,0);assert.deepEqual([uploads,reads,deletions.length],beforeDenied,'Unauthorized native bulk deletion never calls storage');
     failDeleteKey=sourceKey;
     const failed=await payload.delete({collection:'media',where:{id:{in:[image.id]}},user:owner,overrideAccess:false});assert.equal(failed.docs.length,0);assert.equal(failed.errors.length,1);
     const retained=await payload.findByID({collection:'media',id:image.id,overrideAccess:true,depth:0});
     assert.equal(retained.filename,stored.filename);assert.deepEqual(retained.sizes,stored.sizes,'A failed native bulk delete retains all size ownership metadata');assert.deepEqual(retained.originalFile,originalFile,'A failed native bulk delete retains the original-file receipt');
     assert.equal(objects.has(image.filenames[0]),false,'The synthetic failure occurs after partial storage cleanup');assert.equal(objects.has(sourceKey),true,'The failing original remains available for retry');
     const result=await payload.delete({collection:'media',where:{id:{in:[image.id]}},user:owner,overrideAccess:false});assert.equal(result.errors.length,0);assert.equal(result.docs.length,1);
     for(const key of [sourceKey,...['jpg','png','webp'].map(extension=>'originals/'+image.id+'/source.'+extension)]){assert.ok(deletions.slice(start).includes(key),'Bulk retry removes every owned original-source key');assert.equal(objects.has(key),false);}
    }
    for(const filename of image.filenames){assert.ok(deletions.slice(start).includes(filename),'Delete removes each owned S3 object');assert.equal(objects.has(filename),false);}
    ids.splice(ids.indexOf(image.id),1);
   }
  }finally{await payload.delete({collection:'users',id:specialist.id,user:owner,overrideAccess:false});}
  const deleted=await payload.delete({collection:'media',user:owner,overrideAccess:false,where:{id:{in:ids}}});assert.equal(deleted.docs.length,2);assert.equal(deleted.errors.length,0);ids.length=0;
  console.log('Media library checks passed: native JPEG sizes without upscaling, original preservation, one media record, private/public file ACL, server-owned size metadata, single/bulk S3 cascade, partial bulk failure metadata retention and retry, unauthorized bulk storage denial, SVG safety and packaged file metadata. No external storage calls.');
 }finally{
  failDeleteKey=undefined;
  for(const id of ids)await payload.delete({collection:'media',id,user:owner,overrideAccess:false});
  S3Client.prototype.send=send;await pool.query("DELETE FROM lvd_integrations WHERE provider='r2'");
 }
}
