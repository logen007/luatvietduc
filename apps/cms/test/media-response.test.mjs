import test from 'node:test';
import assert from 'node:assert/strict';
import {Readable} from 'node:stream';
import {storedMediaResponse} from '../src/modules/storage/media-response.ts';

const bytes=Buffer.from('0123456789');
function storage(){
 const calls=[];let destroyed=0;
 const client={destroy(){destroyed++;},async send(command){
  calls.push(command);if(command.constructor.name==='HeadObjectCommand')return {ContentLength:bytes.length,ETag:'"current"',LastModified:new Date('2026-11-08T00:00:00Z')};
  const range=command.input.Range?.match(/^bytes=(\d+)-(\d+)$/),data=range?bytes.subarray(Number(range[1]),Number(range[2])+1):bytes;
  return {Body:Readable.from([data]),ContentType:'video/mp4',ContentLength:data.length};
 }};
 return {calls,client,get destroyed(){return destroyed;}};
}
const response=(s,headers={})=>storedMediaResponse({client:s.client,bucket:'synthetic',key:'video.mp4',filename:'video.mp4',request:new Request('https://example.invalid/api/media/file/video.mp4',{headers})});

for(const [range,expected,contentRange] of [['bytes=0-1','01','bytes 0-1/10'],['bytes=4-','456789','bytes 4-9/10'],['bytes=-3','789','bytes 7-9/10'],['bytes=8-99','89','bytes 8-9/10']])test('R2 streams '+range,async()=>{
 const s=storage(),r=await response(s,{Range:range});assert.equal(r.status,206);assert.equal(r.headers.get('Content-Range'),contentRange);assert.equal(r.headers.get('Content-Length'),String(expected.length));assert.equal(r.headers.get('Accept-Ranges'),'bytes');assert.equal(await r.text(),expected);assert.ok(s.calls[1].input.Range);assert.ok(s.destroyed);
});
test('full media response keeps private cache and streams without metadata request',async()=>{
 const s=storage(),r=await response(s);assert.equal(r.status,200);assert.equal(r.headers.get('Cache-Control'),'private, no-store');assert.equal(await r.text(),bytes.toString());assert.equal(s.calls.length,1);assert.ok(s.destroyed);
});
for(const range of ['bytes=10-','bytes=8-2','bytes=abc','items=0-1'])test('invalid '+range+' never downloads an object',async()=>{
 const s=storage(),r=await response(s,{Range:range});assert.equal(r.status,416);assert.equal(r.headers.get('Content-Range'),'bytes */10');assert.equal(s.calls.length,1);assert.ok(s.destroyed);
});
test('stale If-Range returns full object; matching validator permits partial',async()=>{
 for(const [condition,status] of [['"old"',200],['"current"',206],['W/"current"',200],['Sun, 08 Nov 2026 00:00:00 GMT',206]]){
  const s=storage(),r=await response(s,{Range:'bytes=0-1','If-Range':condition});assert.equal(r.status,status);assert.equal(await r.text(),status===206?'01':bytes.toString());
 }
});
test('R2 failure closes its client and does not expose storage errors',async()=>{
 const s=storage();s.client.send=async()=>{throw Error('Synthetic confidential bucket error');};const r=await response(s,{Range:'bytes=0-1'});assert.equal(r.status,404);assert.equal(await r.text(),'');assert.ok(s.destroyed);
});
