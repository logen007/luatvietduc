/** Offline maintenance only; compiled into the portable image, never an HTTP API. */
import {getPayload} from 'payload';
import type {MigrateUpArgs,MigrateDownArgs} from '@payloadcms/db-postgres';
import config from '../src/payload.config';
import {migrations} from '../src/migrations';
import {pool} from '../src/modules/shared/db';
import {unseal} from '../src/modules/integrations/crypto';
import {activeValues} from '../src/modules/integrations/store';
import {r2Client} from '../src/modules/integrations/check';
import {mediaInventorySQL} from '../src/modules/storage/inventory';
import {indexNext} from '../src/modules/rag/indexer';
import {GetObjectCommand,PutObjectCommand} from '@aws-sdk/client-s3';
import {createHash} from 'node:crypto';
import {createReadStream,createWriteStream} from 'node:fs';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {pipeline} from 'node:stream/promises';
const action=process.argv[2];
async function closePayload(payload:Awaited<ReturnType<typeof getPayload>>){
 await payload.destroy();
}
async function digest(file:string){const hash=createHash('sha256');let bytes=0;for await(const chunk of createReadStream(file)){hash.update(chunk);bytes+=chunk.length;}return {sha256:hash.digest('hex'),bytes};}
async function input(){let data='';for await(const chunk of process.stdin){data+=chunk;if(data.length>8192)throw new Error('Input too large');}return JSON.parse(data);}
async function verify(){
 const applied=(await pool.query('SELECT name,batch FROM payload_migrations')).rows;
 if(applied.length!==migrations.length||applied.some(row=>row.batch<0||!migrations.some(m=>m.name===row.name)))throw new Error('Migration catalog mismatch');
 for(const row of (await pool.query('SELECT provider,encrypted_values FROM lvd_integrations')).rows)unseal(row.provider,row.encrypted_values);
 await pool.query('SELECT (SELECT count(*) FROM users),(SELECT count(*) FROM lvd_conversations),(SELECT count(*) FROM lvd_answer_jobs)');
 console.log('Database and encryption key verified');
}
async function files(restore=false){
 const entries=(await pool.query(mediaInventorySQL)).rows;
 const keys=[...new Set(entries.map(row=>['prefix','_object_key','filename'].map(key=>String(row[key]||'').replace(/^\/+|\/+$/g,'')).filter(Boolean).join('/')))];
 const values=await activeValues('r2');if(keys.length&&!values)throw new Error('Files exist but storage is unavailable');
 await mkdir('/transfer/objects',{recursive:true});
 const client=values?r2Client(values):null;
 try{
  if(restore){
   const manifest=JSON.parse(await readFile('/transfer/objects.json','utf8'));
   if(!Array.isArray(manifest)||manifest.length!==keys.length||new Set(manifest.map(item=>item.key)).size!==keys.length)throw new Error('File inventory mismatch');
   // Validate the complete archive before writing any missing object.
   for(const key of keys){const item=manifest.find(item=>item.key===key),id=createHash('sha256').update(key).digest('hex');if(!item||item.file!==id)throw new Error('File inventory mismatch');const actual=await digest('/transfer/objects/'+id);if(actual.sha256!==item.sha256||actual.bytes!==item.bytes)throw new Error('File checksum mismatch');}
   for(const item of manifest){
    const file='/transfer/objects/'+item.file;
    try{
     const object=await client!.send(new GetObjectCommand({Bucket:values!.bucket,Key:item.key}),{abortSignal:AbortSignal.timeout(60000)});
     const hash=createHash('sha256');let bytes=0;for await(const chunk of object.Body as any){hash.update(chunk);bytes+=chunk.length;}
     if(hash.digest('hex')!==item.sha256||bytes!==item.bytes)throw new Error('Existing storage object differs; refusing overwrite');
    }catch(error){
     if((error as any)?.$metadata?.httpStatusCode!==404)throw error;
     await client!.send(new PutObjectCommand({Bucket:values!.bucket,Key:item.key,Body:createReadStream(file),ContentLength:item.bytes,ContentType:item.contentType,IfNoneMatch:'*'}),{abortSignal:AbortSignal.timeout(60000)});
    }
   }
  }else{
   const manifest=[];
   for(const key of keys){
    const id=createHash('sha256').update(key).digest('hex'),file='/transfer/objects/'+id;
    const object=await client!.send(new GetObjectCommand({Bucket:values!.bucket,Key:key}),{abortSignal:AbortSignal.timeout(60000)});
    if(!object.Body)throw new Error('Missing storage object');
    await pipeline(object.Body as any,createWriteStream(file,{flags:'wx',mode:0o600}));
    manifest.push({key,file:id,contentType:object.ContentType||'application/octet-stream',...await digest(file)});
   }
   await writeFile('/transfer/objects.json',JSON.stringify(manifest),{mode:0o600,flag:'wx'});
  }
  console.log('Storage files verified');
 }finally{client?.destroy();}
}
try{
 if(action==='migrate'){
  const exists=(await pool.query("SELECT to_regclass('public.payload_migrations') AS name")).rows[0]?.name;
  if(exists&&(await pool.query('SELECT 1 FROM payload_migrations WHERE batch=-1 LIMIT 1')).rowCount)throw new Error('Development schema requires separate review');
  const payload=await getPayload({config});try{await payload.db.migrate({migrations:migrations.map(({name,up,down})=>({name,up:args=>up(args as MigrateUpArgs),down:args=>down(args as MigrateDownArgs)}))});}finally{await closePayload(payload);}
 }else if(action==='owner'){
  const data=await input();if(typeof data.email!=='string'||typeof data.name!=='string'||typeof data.password!=='string'||data.password.length<16)throw new Error('Owner name, email and password (16+) required');
  const payload=await getPayload({config});try{
   if((await payload.count({collection:'users',overrideAccess:true})).totalDocs)throw new Error('Owner bootstrap requires empty users');
   await payload.create({collection:'users',overrideAccess:true,context:{bootstrapOwner:true},data:{email:data.email,name:data.name,password:data.password,role:'owner'}});
   console.log('Initial owner provisioned');
  }finally{await closePayload(payload);}
 }else if(action==='verify')await verify();
 else if(action==='export-files')await files();
 else if(action==='restore-files')await files(true);
 else if(action==='index'){for(let i=0,until=Date.now()+60000;i<25&&Date.now()<until;i++)if(!await indexNext())break;}
 else throw new Error('Unknown maintenance action');
}catch{console.error('Portable maintenance failed: '+String(action));process.exitCode=1;}
finally{await pool.end();}
// The pinned adapter keeps a dedicated reconnect connection after destroy().
// Every operation/transaction above is awaited; flush CLI output before exiting.
await new Promise<void>(resolve=>process.stdout.write('',()=>resolve()));
await new Promise<void>(resolve=>process.stderr.write('',()=>resolve()));
process.exit(Number(process.exitCode)||0);
