'use client';
import {useState} from 'react';
import type {Conversation} from '../contracts';
export function CustomerAvatar({customer}:{customer?:Conversation['customer']}){
 const [failed,setFailed]=useState(''),src=customer?.avatarURL||'';
 return src&&failed!==src?<img src={src} alt="" decoding="async" onError={()=>setFailed(src)}/>:<span>{(customer?.name?.trim()||'K').slice(0,1).toLocaleUpperCase('vi')}</span>;
}
