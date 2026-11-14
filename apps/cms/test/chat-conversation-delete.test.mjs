import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const id='11111111-2222-4333-8444-555555555555',updatedAt='2026-11-08T02:00:00.000Z';
const actor=role=>({user:role?{id:7,role}:null,guestHash:'synthetic'});
const file=n=>({id:String(n),object_key:'private-chat/'+id+'/'+n,ready:true});
function fixture({files=[],backupLocked=false,storageEnabled=true,failKey=null,failCommit=false,missing=false,customerId=7}={}){
 let exists=!missing,fail=failKey,closed=0;
 const sql=[],deletedObjects=[];
 const client={async send(command){if(command.input.Key===fail)throw Error('Synthetic storage failure');deletedObjects.push(command.input.Key);},destroy(){closed++;}};
 const db={async query(query,args=[]){
  sql.push({query,args});
  if(query.startsWith('SELECT pg_advisory'))return {rows:[]};
  if(query.startsWith('SELECT * FROM lvd_conversations'))return {rows:exists?[{id,user_id:customerId,version:4,updated_at:new Date(updatedAt)}]:[]};
  if(query.startsWith('SELECT id,object_key,ready'))return {rows:files};
  if(query.startsWith('SELECT media_locked_until'))return {rows:[{locked:backupLocked}]};
  if(query==='DELETE FROM lvd_conversations WHERE id=$1'){assert.deepEqual([...args],[id]);exists=false;return {rows:[]};}
  throw Error('Unexpected query '+query);
 }};
 const exports={};
 const dependencies={
  '@aws-sdk/client-s3':{DeleteObjectCommand:class{constructor(input){this.input=input;}}},
  '../shared/db':{transaction:async task=>{const before=exists;try{const result=await task(db);if(failCommit)throw Error('Synthetic commit failure');return result;}catch(error){exists=before;throw error;}}},
  '../identity/permissions':{isAdmin:user=>user?.role==='owner'},
  '../integrations/store':{activeValues:async()=>storageEnabled?{bucket:'synthetic-bucket'}:null},
  '../integrations/check':{r2Client:()=>client},
  './service':{isCustomer:(a,c)=>a.user?.id===c.user_id,HttpError:class extends Error{constructor(status,message){super(message);this.status=status;}}},
 };
 const source=fs.readFileSync(new URL('../src/modules/chat/delete-conversation.ts',import.meta.url),'utf8');
 vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports,require:name=>{assert.ok(name in dependencies);return dependencies[name];},AbortSignal,Date},{timeout:1000});
 return {remove:exports.deleteInboxConversation,removeOwn:exports.deleteCustomerConversation,sql,deletedObjects,get exists(){return exists;},get closed(){return closed;},retryStorage(){fail=null;}};
}
test('only Admin can delete a conversation, including in specialist preview',async()=>{
 const f=fixture();for(const role of [null,'member','support'])await assert.rejects(f.remove(actor(role),id,4,updatedAt),{status:403});assert.equal(f.sql.length,0);
});
test('Admin deletes the complete conversation; retry after a lost response is safe',async()=>{
 const f=fixture();assert.equal((await f.remove(actor('owner'),id,4,updatedAt)).deleted,true);assert.equal(f.exists,false);
 assert.equal((await f.remove(actor('owner'),id,4,updatedAt)).deleted,true);
 assert.equal(f.sql.filter(row=>row.query.startsWith('DELETE FROM')).length,1);
});
test('stale assignment version or newly received content requires renewed confirmation',async()=>{
 const f=fixture();await assert.rejects(f.remove(actor('owner'),id,3,updatedAt),{status:409});await assert.rejects(f.remove(actor('owner'),id,4,'2026-11-08T01:59:59Z'),{status:409});assert.equal(f.exists,true);assert.equal(f.deletedObjects.length,0);
});
test('backup locks, uploads in progress and foreign object keys prevent deletion',async()=>{
 for(const options of [{files:[file(1)],backupLocked:true},{files:[{...file(1),ready:false}]},{files:[{...file(1),object_key:'another-conversation/file'}]}]){const f=fixture(options);await assert.rejects(f.remove(actor('owner'),id,4,updatedAt),{status:409});assert.equal(f.exists,true);assert.equal(f.deletedObjects.length,0);}
});
test('all conversation attachments are cleaned, including unattached draft files',async()=>{
 const files=[file(1),file(2)],f=fixture({files});await f.remove(actor('owner'),id,4,updatedAt);assert.equal(f.exists,false);assert.deepEqual(f.deletedObjects,files.map(row=>row.object_key));assert.equal(f.closed,1);
});
test('customer deletion uses the same attachment cleanup but cannot delete another customer even for an Admin',async()=>{
 const own=fixture({files:[file(1),file(2)]});await own.removeOwn(actor('member'),id,4,updatedAt);assert.equal(own.exists,false);assert.equal(own.deletedObjects.length,2);
 const foreign=fixture({files:[file(1)],customerId:99});for(const role of ['owner','support','member'])await assert.rejects(foreign.removeOwn(actor(role),id,4,updatedAt),{status:403});assert.equal(foreign.exists,true);assert.equal(foreign.deletedObjects.length,0);
});
test('disabled storage and partial cleanup retain records for an idempotent retry',async()=>{
 const off=fixture({files:[file(1)],storageEnabled:false});await assert.rejects(off.remove(actor('owner'),id,4,updatedAt),{status:503});assert.equal(off.exists,true);
 const f=fixture({files:[file(1),file(2)],failKey:file(2).object_key});await assert.rejects(f.remove(actor('owner'),id,4,updatedAt),{status:503});assert.equal(f.exists,true);assert.equal(f.closed,1);f.retryStorage();await f.remove(actor('owner'),id,4,updatedAt);assert.equal(f.exists,false);
});
test('database commit failure preserves a retryable conversation',async()=>{
 const f=fixture({failCommit:true});await assert.rejects(f.remove(actor('owner'),id,4,updatedAt),/Synthetic commit failure/);assert.equal(f.exists,true);
});
test('malformed requests never reach storage or the database',async()=>{
 const f=fixture();for(const args of [['invalid',4,updatedAt],[id,'4',updatedAt],[id,NaN,updatedAt],[id,4,null],[id,4,'bad-date']])await assert.rejects(f.remove(actor('owner'),...args),{status:400});assert.equal(f.sql.length,0);
});
