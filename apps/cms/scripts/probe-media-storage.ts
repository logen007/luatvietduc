// Explicit maintenance probe: synthetic private file only, always cleaned up.
import {getPayload,createLocalReq} from 'payload';
import {GetObjectCommand} from '@aws-sdk/client-s3';
import {getStorageFilePath} from '@payloadcms/plugin-cloud-storage/utilities';
import config from '../src/payload.config';
import {activeValues} from '../src/modules/integrations/store';
import {r2Client} from '../src/modules/integrations/check';
import {pool} from '../src/modules/shared/db';
if(process.env.LVD_MEDIA_PROBE!=='1'||process.env.APP_URL!=='https://luatvietduc.com')throw new Error('Explicit production media probe only');
const payload=await getPayload({config});let id:number|undefined,owner:any,failed=false,cleaned=true;
try{
 const values=await activeValues('r2');if(!values)throw new Error('StorageInactive');
 owner=(await payload.find({collection:'users',overrideAccess:true,limit:1,depth:0,where:{role:{equals:'owner'}}})).docs[0];if(!owner)throw new Error('OwnerMissing');
 const text='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><rect width="10" height="10" fill="#333"/></svg>',buffer=Buffer.from(text),filename='lvd-storage-probe-'+crypto.randomUUID()+'.svg';
 const doc=await payload.create({collection:'media',user:owner,overrideAccess:false,file:{name:filename,mimetype:'image/svg+xml',data:buffer,size:buffer.length},data:{title:'Temporary storage verification',alt:'',visibility:'private'}});id=doc.id;
 const req=await createLocalReq({user:owner},payload),key=await getStorageFilePath({collection:payload.collections.media.config,doc:{id:doc.id,_objectKey:doc._objectKey||undefined},filename:doc.filename!,req});
 const client=r2Client(values);try{const object=await client.send(new GetObjectCommand({Bucket:values.bucket,Key:key}),{abortSignal:AbortSignal.timeout(20000)});const returned=await object.Body?.transformToByteArray();if(!returned||!Buffer.from(returned).equals(buffer))throw new Error('StorageRoundTripMismatch');}finally{client.destroy();}
 await payload.update({collection:'media',id,user:owner,overrideAccess:false,data:{caption:'Verified private temporary upload',updatedAt:doc.updatedAt}});
}catch(error){failed=true;console.error(JSON.stringify({mediaProbe:'failed',errorName:error instanceof Error?error.name:'Error'}));}
finally{
 if(id)try{await payload.delete({collection:'media',id,user:owner,overrideAccess:false});}catch{failed=true;cleaned=false;console.error(JSON.stringify({mediaProbe:'cleanup-failed',temporaryMediaId:id}));}
 console.log(JSON.stringify({mediaProbe:failed?'failed':'passed',temporaryFileCleaned:cleaned}));
 await payload.destroy();await pool.end();
}
process.exit(failed?1:0);
