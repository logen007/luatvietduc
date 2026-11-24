import assert from 'node:assert/strict';
import {S3Client} from '@aws-sdk/client-s3';
import type {Payload} from 'payload';
import type {User} from '../src/payload-types';
import {pool} from '../src/modules/shared/db';

// Invoke on an existing synthetic upload in the isolated media test. Only
// metadata is written; the returned document carries the resulting version.
export async function testMediaCoordinateForgery(payload:Payload,user:User,id:number){
 const database=new URL(process.env.DATABASE_URL||'');
 if(!['localhost','127.0.0.1'].includes(database.hostname)||database.pathname!=='/lvd_test'||!Number.isSafeInteger(id)||id<1)throw new Error('Isolated media-coordinate checks only');
 const coordinates=async()=>(await pool.query('SELECT prefix,COALESCE(_objectkey,_object_key) AS object_key FROM media WHERE id=$1',[id])).rows[0];
 const before=await coordinates();assert.ok(before);
 const send=S3Client.prototype.send;let storageCalls=0;
 (S3Client.prototype as any).send=async()=>{storageCalls++;throw new Error('Metadata coordinate checks must not call storage');};
 try{
  let doc=await payload.findByID({collection:'media',id,user,overrideAccess:false,depth:0});
  for(const overrideAccess of [false,true]){
   doc=await payload.update({collection:'media',id,user,overrideAccess,depth:0,data:{updatedAt:doc.updatedAt,prefix:'originals/2147483647',_objectKey:'foreign',_objectkey:'foreign-lower',_object_key:'foreign-legacy'} as any});
   assert.deepEqual(await coordinates(),before,'A coordinate forgery cannot redirect native reads, writes or deletion');
  }
  assert.equal(storageCalls,0);return doc;
 }finally{S3Client.prototype.send=send;}
}
