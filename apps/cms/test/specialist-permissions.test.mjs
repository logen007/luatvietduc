import test from 'node:test';
import assert from 'node:assert/strict';
import {Readable} from 'node:stream';
import {S3Client} from '@aws-sdk/client-s3';
import {pool} from '../src/modules/shared/db.ts';
import {allowed,message,transcript,transition} from '../src/modules/chat/service.ts';
import {specialistInbox} from '../src/modules/chat/inbox.ts';
import {uploadChatFile,downloadChatFile} from '../src/modules/chat/files.ts';
import {articleLanguages} from '../src/modules/content/translations.ts';
import {seal} from '../src/modules/integrations/crypto.ts';

const user={id:7,role:'support',jurisdictions:[]},actor={user,guestHash:''};
const conversation=()=>({id:'00000000-0000-4000-8000-000000000001',user_id:25,jurisdiction:'DE',assigned_to:99,state:'human',version:3,ai_enabled:false,customer_name:'Synthetic customer',customer_email:'synthetic@example.invalid'});
async function withQueries(query,run){
 const originalQuery=pool.query,originalConnect=pool.connect;
 pool.query=query;pool.connect=async()=>({query,release(){}});
 try{return await run();}finally{pool.query=originalQuery;pool.connect=originalConnect;}
}

test('specialists read and reply across countries and assignments while customer/retired-role boundaries remain',async()=>{
 const c=conversation(),writes=[];
 for(const role of ['owner','support'])assert.equal(allowed({user:{id:7,role,jurisdictions:[]},guestHash:''},c),true);
 for(const role of ['member','editor','reviewer','knowledge','operations'])assert.equal(allowed({user:{id:7,role,jurisdictions:['DE']},guestHash:''},c),false);
 await withQueries(async(sql,args)=>{
  if(sql.startsWith('SELECT c.*')||sql.startsWith('SELECT * FROM lvd_conversations'))return {rows:[c]};
  if(sql.startsWith('SELECT id,role,body'))return {rows:[{id:1,body:'Synthetic private history',internal:true}]};
  if(sql.startsWith('SELECT * FROM lvd_messages'))return {rows:[]};
  if(sql.startsWith('INSERT INTO lvd_messages')){writes.push(args);return {rows:[{id:2}]};}
  return {rows:[],rowCount:1};
 },async()=>{
  const read=await transcript(actor,c.id);assert.equal(read.conversation.customer.email,c.customer_email);assert.equal(read.messages[0].body,'Synthetic private history');assert.equal(read.conversation.assignedTo,99);
  const reply=await message(actor,c.id,{body:'Synthetic reply',key:crypto.randomUUID()},2000);assert.equal(reply.role,'staff');assert.equal(writes[0][4],'staff:7');assert.equal(c.assigned_to,99,'Reply does not silently steal assignment');
  c.state='closed';await assert.rejects(()=>message(actor,c.id,{body:'Closed reply',key:crypto.randomUUID()},2000),{status:409});assert.equal(writes.length,1);
 });
});

test('cross-assignment management keeps version conflicts, explicit claims and AI admission guards',async()=>{
 const c=conversation(),changes=[];
 await withQueries(async(sql,args)=>{
  if(sql.startsWith('SELECT * FROM lvd_conversations'))return {rows:[c]};
  if(sql.startsWith('UPDATE lvd_conversations')){changes.push({sql,args});return {rows:[{state:args[1],version:c.version+1}]};}
  return {rows:[],rowCount:1};
 },async()=>{
  for(const action of ['close','release','reopen'])assert.ok((await transition(actor,c.id,{action,version:3})).version===4);
  await assert.rejects(()=>transition(actor,c.id,{action:'close',version:2}),{status:409});
  await assert.rejects(()=>transition(actor,c.id,{action:'claim',version:3}),{status:409},'Claim cannot silently take over an active assignment');
  for(const change of changes)assert.match(change.sql,/ai_generation=NULL.*version=version\+1/);
  c.state='queued';c.ai_enabled=true;c.updated_at=new Date().toISOString();
  await assert.rejects(()=>transition(actor,c.id,{action:'claim',version:3}),{status:409});
  c.ai_enabled=false;await transition(actor,c.id,{action:'claim',version:3});assert.equal(changes.at(-1).args[2],7,'An explicit eligible claim still assigns the actor');
 });
});

test('inbox query and language discovery admit an unscoped specialist without widening public access',async()=>{
 const requests=[];
 await withQueries(async(sql,args)=>{requests.push({sql,args});return sql.includes('AS data')?{rows:[{data:{rows:[],total:0,counts:{}}}]}:{rows:[]};},async()=>{
  await specialistInbox(actor,{view:'all'});assert.deepEqual(requests[0].args[0],['VN','DE','BOTH']);assert.equal(requests[0].args[2],true,'All assignments and titles are authorized');
  await assert.rejects(()=>specialistInbox({user:{id:25,role:'member'},guestHash:''}),{status:403});
  const docs=[{id:1,language:'vi',jurisdiction:'DE',translationGroup:'synthetic-group'},{id:2,language:'de',jurisdiction:'DE'}];
  const payload={find:async options=>{assert.equal(options.user,user);assert.equal(options.overrideAccess,false);return {docs:options.where.id?[docs[0]]:docs};}};
  assert.equal((await articleLanguages(payload,user,1)).articles.length,2);
 });
});

test('specialists may upload and read attached files on another assignment but cannot steal pending files',async()=>{
 const oldSecret=process.env.PAYLOAD_SECRET,oldSend=S3Client.prototype.send,c=conversation();
 process.env.PAYLOAD_SECRET='synthetic-specialist-permissions-only-secret-000000000';
 const values={endpoint:'https://'+'a'.repeat(32)+'.r2.cloudflarestorage.com',bucket:'synthetic-bucket',accessKeyId:'synthetic-key',secretAccessKey:'synthetic-secret'};
 const encrypted=seal('r2',values),commands=[],file={id:'00000000-0000-4000-8000-000000000002',conversation:c,message_id:1,actor_key:'staff:99',object_key:'private-chat/synthetic/attached',mime_type:'text/plain',name:'synthetic.txt',internal:true};
 S3Client.prototype.send=async function(command){commands.push(command);return command.constructor.name==='GetObjectCommand'?{Body:Readable.from([Buffer.from('Synthetic private file')])}:{};};
 try{await withQueries(async(sql)=>{
  if(sql.includes('FROM lvd_integrations'))return {rows:[{enabled:true,encrypted_values:encrypted}]};
  if(sql.startsWith('SELECT * FROM lvd_conversations'))return {rows:[c]};
  if(sql.startsWith('SELECT count(*)'))return {rows:[{n:0}]};
  if(sql.startsWith('SELECT f.*'))return {rows:[file]};
  return {rows:[],rowCount:1};
 },async()=>{
  const uploaded=await uploadChatFile(actor,c.id,'synthetic.txt',Buffer.from('Synthetic file'));assert.ok(uploaded.id);assert.equal(commands[0].constructor.name,'PutObjectCommand');
  const response=await downloadChatFile(actor,file.id);assert.equal(await response.text(),'Synthetic private file');
  file.message_id=null;await assert.rejects(()=>downloadChatFile(actor,file.id),{status:404});
  file.message_id=1;await assert.rejects(()=>downloadChatFile({user:{id:26,role:'member'},guestHash:''},file.id),{status:404});
 });}finally{S3Client.prototype.send=oldSend;if(oldSecret===undefined)delete process.env.PAYLOAD_SECRET;else process.env.PAYLOAD_SECRET=oldSecret;}
});
