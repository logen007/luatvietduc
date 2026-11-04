'use client';
import {useEffect,useRef,useState} from 'react';
import {api} from '../../shared/client-api';
import {visiblePoll} from '../../shared/polling';
import {isPublicSessionCurrent} from '../../shared/session-client';
import type {InboxResult} from '../contracts';
const empty:InboxResult={rows:[],counts:{},total:0,totalPages:1,page:1};
export function useInbox(userId:number|undefined,sessionRevision:number){
 const [view,setView]=useState('queue'),[query,setQuery]=useState(''),[debouncedQuery,setDebouncedQuery]=useState(''),[page,setPage]=useState(1);
 const [saved,setSaved]=useState({owner:'',key:'',data:empty,loading:true,error:''});
 const owner=userId===undefined?'':JSON.stringify([userId,sessionRevision]);
 const key=JSON.stringify([owner,view,debouncedQuery,page]);
 const activeKey=useRef(key);activeKey.current=key;
 const serial=useRef(0),pending=useRef<{key:string;task:Promise<void>}|null>(null);
 useEffect(()=>{const timer=setTimeout(()=>setDebouncedQuery(query),250);return()=>clearTimeout(timer);},[query]);
 function refresh():Promise<void>{
  if(!owner||activeKey.current!==key||!isPublicSessionCurrent(sessionRevision))return Promise.resolve();
  if(pending.current?.key===key)return pending.current.task;
  const turn=++serial.current;
  const valid=()=>turn===serial.current&&activeKey.current===key&&isPublicSessionCurrent(sessionRevision);
  const task=(async()=>{
   try{
    const result=await api<InboxResult>(`inbox?view=${view}&q=${encodeURIComponent(debouncedQuery)}&page=${page}`);
    if(valid())setSaved({owner,key,data:result,error:'',loading:false});
   }catch(e){
    if(valid())setSaved(previous=>({owner,key,data:previous.owner===owner&&previous.key===key?previous.data:empty,error:(e as Error).message,loading:false}));
   }finally{if(turn===serial.current&&pending.current?.key===key)pending.current=null;}
  })();
  pending.current={key,task};return task;
 }
 useEffect(()=>{
  if(!owner){setSaved({owner:'',key:'',data:empty,loading:false,error:''});return;}
  setSaved(previous=>({owner,key,data:previous.owner===owner&&previous.key===key?previous.data:empty,loading:true,error:''}));
  const stop=visiblePoll(refresh,5000);
  return()=>{serial.current++;pending.current=null;stop();};
 },[owner,key]);
 const matches=Boolean(owner)&&saved.owner===owner&&saved.key===key&&query===debouncedQuery;
 const data=matches?saved.data:empty;
 return {...data,view,query,page,loading:Boolean(owner)&&(!matches||saved.loading),error:matches?saved.error:'',refresh,setView:(v:string)=>{setView(v);setPage(1);},setQuery:(v:string)=>{setQuery(v);setPage(1);},setPage};
}
export type InboxState=ReturnType<typeof useInbox>;
