import {redirect} from 'next/navigation';
export default async function Page({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}){
 const query=new URLSearchParams();
 for(const [key,value] of Object.entries(await searchParams)){
  if(Array.isArray(value))for(const entry of value)query.append(key,entry);
  else if(typeof value==='string')query.set(key,value);
 }
 redirect('/hoi-dap'+(query.size?'?'+query.toString():''));
}
