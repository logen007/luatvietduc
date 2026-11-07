import test from 'node:test';
import assert from 'node:assert/strict';
import {mediaReceipt,uploadMediaFile} from '../src/modules/storage/media-client.ts';
const doc={id:17,filename:'synthetic.svg',updatedAt:'2026-11-06T00:00:00.000Z'};
const file=()=>new File(['Synthetic transport fixture'],'synthetic.svg',{type:'image/svg+xml'});
class FakeXHR{
 upload={};status=0;response=null;sent=0;aborted=0;
 open(method,url){this.method=method;this.url=url;}
 send(form){this.sent++;this.form=form;}
 abort(){this.aborted++;this.onabort?.();}
 respond(status,value){this.status=status;this.response=value;this.onload?.();}
}
test('media reads and saves require the matching document and a valid timestamp',()=>{
 for(const value of [null,{},[],{doc:null},{doc:[]},{...doc,id:18},{...doc,updatedAt:undefined},{...doc,updatedAt:'not-a-date'},{...doc,filename:''}])assert.throws(()=>mediaReceipt(value,17),/xác nhận/);
 assert.equal(mediaReceipt(doc,17),doc);assert.equal(mediaReceipt({doc,message:'Saved'},17),doc);
});
test('an upload succeeds only with a real media receipt, never a bare 2xx/login response',async()=>{
 for(const value of [null,{},'<!doctype html>',{doc:{}},{id:17},{id:0,filename:'invalid.svg'}]){
  const xhr=new FakeXHR(),task=uploadMediaFile(file(),new AbortController().signal,()=>{},()=>xhr);
  xhr.respond(200,value);await assert.rejects(task,/xác nhận/);assert.equal(xhr.sent,1,'An ambiguous upload is never automatically retried');
 }
 const xhr=new FakeXHR(),task=uploadMediaFile(file(),new AbortController().signal,()=>{},()=>xhr);xhr.respond(201,{doc});assert.equal(await task,doc);
 assert.equal(xhr.method,'POST');assert.equal(xhr.url,'/api/media');assert.equal(xhr.form.get('file').name,'synthetic.svg');assert.deepEqual(JSON.parse(xhr.form.get('_payload')),{title:'synthetic',alt:''});
});
test('view cancellation aborts an in-flight upload and ignores a late success',async()=>{
 const xhr=new FakeXHR(),controller=new AbortController(),progress=[];
 const task=uploadMediaFile(file(),controller.signal,value=>progress.push(value),()=>xhr);
 xhr.upload.onprogress({lengthComputable:true,loaded:100,total:100});assert.deepEqual(progress,[99],'Progress cannot claim a persisted file');
 controller.abort();await assert.rejects(task,/dừng/);assert.equal(xhr.aborted,1);
 xhr.respond(201,{doc});assert.equal(xhr.onload,null);assert.equal(xhr.upload.onprogress,null);assert.equal(xhr.sent,1);
});
test('an already cancelled view sends no upload and timeout remains ambiguous',async()=>{
 const controller=new AbortController();controller.abort();let created=0;
 await assert.rejects(uploadMediaFile(file(),controller.signal,()=>{},()=>{created++;return new FakeXHR();}),/dừng/);assert.equal(created,0);
 const xhr=new FakeXHR(),task=uploadMediaFile(file(),new AbortController().signal,()=>{},()=>xhr);assert.equal(xhr.timeout,90000);xhr.ontimeout();await assert.rejects(task,/Kiểm tra thư viện/);assert.equal(xhr.sent,1);
});
test('server upload failures remain failures without inventing a receipt',async()=>{
 const xhr=new FakeXHR(),task=uploadMediaFile(file(),new AbortController().signal,()=>{},()=>xhr);
 xhr.respond(503,{errors:[{message:'Synthetic storage failure'}]});await assert.rejects(task,/Synthetic storage failure/);
});
