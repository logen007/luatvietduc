import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readJsonRequest} from '../src/modules/http/request.ts';
const request=(body,headers={})=>new Request((process.env.APP_URL||'http://localhost:3000')+'/service/test',{method:'POST',headers:{origin:process.env.APP_URL||'http://localhost:3000','content-type':'application/json',...headers},body});
test('shared request boundary preserves origin, format and streaming byte limits',async()=>{
 assert.deepEqual(await readJsonRequest(request('{"body":"Synthetic"}')),{body:'Synthetic'});
 for(const [req,limit,status] of [[request('{}',{origin:'https://example.invalid'}),100,403],[request('{}',{'content-type':'text/plain'}),100,415],[request('null'),100,400],[request('[]'),100,400],[request('{'),100,400],[request('{"x":"large"}'),4,413]])await assert.rejects(()=>readJsonRequest(req,limit),error=>error.status===status);
});
