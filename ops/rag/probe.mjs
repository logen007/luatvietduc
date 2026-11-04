// Private, synthetic vector protocol probe. No customer/source data and no model-provider calls.
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
const base='http://vectors:6333/collections/lvd_probe_'+randomUUID().replaceAll('-','');
async function request(path,method,body){
 const response=await fetch(base+path,{method,redirect:'error',signal:AbortSignal.timeout(4000),headers:{'content-type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});
 assert.ok(response.ok,'Private vector protocol failed');return response.json();
}
const point=randomUUID(),vector=Array.from({length:768},(_,i)=>i===0?1:0);
try{
 await request('','PUT',{vectors:{size:768,distance:'Cosine',on_disk:true},hnsw_config:{on_disk:true,m:16,ef_construct:100},optimizers_config:{default_segment_number:2},on_disk_payload:true});
 await request('/points?wait=true','PUT',{points:[{id:point,vector,payload:{source_id:1,revision:'synthetic',jurisdiction:'BOTH'}}]});
 let result=await request('/points/query','POST',{query:vector,limit:32,with_payload:false,with_vector:false,score_threshold:0.72,params:{hnsw_ef:128},filter:{must:[{key:'jurisdiction',match:{any:['BOTH']}}]}});
 assert.equal(result.result.points[0].id,point);
 await request('/points/delete?wait=true','POST',{filter:{must:[{key:'source_id',match:{value:1}}],must_not:[{key:'revision',match:{value:'current'}}]}});
 result=await request('/points/query','POST',{query:vector,limit:1});assert.equal(result.result.points.length,0);
 console.log('Private vector create/upsert/query/filter/delete probe passed');
}finally{await request('','DELETE');}
