'use client';
import {useEffect,useRef,useState} from 'react';
import {api} from '../shared/client-api';
import {createLatestRequest} from '../shared/latest-request';
import {visiblePoll} from '../shared/polling';
type Sources={articles:any[];total:number;totalPages:number;indexWorker:any};
const empty:Sources={articles:[],total:0,totalPages:1,indexWorker:null};
export function useSources(search:string,page:number){
 const key=JSON.stringify([search,page]),loader=useRef(createLatestRequest<Sources>());
 loader.current.select(key);
 const [snapshot,setSnapshot]=useState({key:'',data:empty,loaded:false,error:''});
 async function refresh(force=false){
  const result=await loader.current.load(key,()=>api<Sources>('knowledge-articles?page='+page+'&q='+encodeURIComponent(search)),force);
  if(!result.current())return false;
  if(result.ok)setSnapshot({key,data:result.value,loaded:true,error:''});
  else setSnapshot(previous=>({key,data:previous.key===key?previous.data:empty,loaded:previous.key===key&&previous.loaded,error:result.error instanceof Error?result.error.message:'Chưa tải được danh sách. Vui lòng thử lại.'}));
  return result.ok;
 }
 useEffect(()=>{
  loader.current.select(key);let stop:(()=>void)|undefined;
  const timer=setTimeout(()=>{stop=visiblePoll(()=>refresh(),10000);},200);
  return()=>{clearTimeout(timer);stop?.();loader.current.clear(key);};
 },[key]);
 const current=snapshot.key===key?snapshot:{data:empty,loaded:false,error:''};
 return {...current.data,loaded:current.loaded,error:current.error,refresh};
}
