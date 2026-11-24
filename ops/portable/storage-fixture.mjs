// Synthetic acceptance fixture, mounted only into disposable test containers.
// Keep the real client validation; replace transport so tests cannot call R2.
import {createRequire} from 'node:module';
import fs from 'node:fs';
import {Readable} from 'node:stream';
import {createHash} from 'node:crypto';
const require=createRequire(import.meta.url),{S3Client}=require('/app/node_modules/@aws-sdk/client-s3');
S3Client.prototype.send=async function(command){
 const file='/transfer/mock-store/'+createHash('sha256').update(command.input.Key).digest('hex');
 fs.appendFileSync('/transfer/calls',command.constructor.name+'\n');
 if(command.constructor.name==='GetObjectCommand'){
  if(!fs.existsSync(file))throw Object.assign(new Error('Missing synthetic object'),{$metadata:{httpStatusCode:404}});
  return {Body:Readable.from(fs.readFileSync(file)),ContentType:'image/png'};
 }
 if(command.constructor.name==='PutObjectCommand'){
  if(fs.existsSync(file))throw Object.assign(new Error('Synthetic precondition conflict'),{$metadata:{httpStatusCode:412}});
  const chunks=[];for await(const chunk of command.input.Body)chunks.push(chunk);fs.writeFileSync(file,Buffer.concat(chunks),{flag:'wx'});return {};
 }
 throw new Error('Unexpected provider command');
};
