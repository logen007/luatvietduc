import {COLLECTION,DIMENSIONS} from './core';
// Fixed private destination: never accept a URL from an administrator or a customer.
const endpoint='http://vectors:6333/collections/'+COLLECTION;
export async function vectorRequest(path:string,method:string,body?:unknown){
 const response=await fetch(endpoint+path,{method,headers:{'content-type':'application/json'},redirect:'error',signal:AbortSignal.timeout(3500),...(body===undefined?{}:{body:JSON.stringify(body)})});
 if(!response.ok)throw new Error('Vector index unavailable');return response.json();
}
export async function ensureCollection(){
 const response=await fetch(endpoint,{redirect:'error',signal:AbortSignal.timeout(3500)});
 if(response.ok)return;
 if(response.status!==404)throw new Error('Vector index unavailable');
 try{await vectorRequest('','PUT',{vectors:{size:DIMENSIONS,distance:'Cosine',on_disk:true},hnsw_config:{on_disk:true,m:16,ef_construct:100},optimizers_config:{default_segment_number:2},on_disk_payload:true});}catch(error){const check=await fetch(endpoint,{signal:AbortSignal.timeout(3500)});if(!check.ok)throw error;}
}
export async function searchVectors(query:number[],scopes:string[]){
 const result=await vectorRequest('/points/query','POST',{query,filter:{must:[{key:"jurisdiction",match:{any:scopes}}]},limit:32,with_payload:false,with_vector:false,score_threshold:0.72,params:{hnsw_ef:128}});
 return (result.result?.points||[]) as {id:string;score:number}[];
}
