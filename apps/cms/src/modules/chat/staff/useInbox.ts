'use client';
import {useEffect,useRef,useState} from 'react';
import {api} from '../../shared/client-api';
import {visiblePoll} from '../../shared/polling';
export function useInbox(userId?:number){
 const [view,setView]=useState('queue'),[query,setQuery]=useState(''),[debouncedQuery,setDebouncedQuery]=useState(''),[page,setPage]=useState(1),[data,setData]=useState<any>({rows:[],counts:{},total:0,totalPages:1}),[loading,setLoading]=useState(true),[error,setError]=useState('');
 const serial=useRef(0);
 useEffect(()=>{const timer=setTimeout(()=>setDebouncedQuery(query),250);return()=>clearTimeout(timer);},[query]);
 async function refresh(){if(!userId)return;const turn=++serial.current;try{const result=await api(`inbox?view=${view}&q=${encodeURIComponent(debouncedQuery)}&page=${page}`);if(turn===serial.current){setData(result);setError('');}}catch(e){if(turn===serial.current)setError((e as Error).message);}finally{if(turn===serial.current)setLoading(false);}}
 useEffect(()=>{if(!userId)return;setLoading(true);const stop=visiblePoll(refresh,5000);return()=>{serial.current++;stop();};},[userId,view,debouncedQuery,page]);
 return {...data,view,query,page,loading,error,refresh,setView:(v:string)=>{setView(v);setPage(1);},setQuery:(v:string)=>{setQuery(v);setPage(1);},setPage};
}
export type InboxState=ReturnType<typeof useInbox>;
