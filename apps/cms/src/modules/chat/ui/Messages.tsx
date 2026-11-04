"use client";
import {useLocale} from "../../shared/locale";
import {useState} from 'react';
import type {WorkspaceState} from '../useWorkspace';
import {ChatIcon} from './Icons';
function CopyAnswer({text}:{text:string}){
 const {t,language}=useLocale();
 const [copied,setCopied]=useState(false);
 return <button type="button" className="chat-copy" aria-label={t(copied?'Đã sao chép':'Sao chép câu trả lời')} onClick={async()=>{try{await navigator.clipboard.writeText(text);setCopied(true);}catch{setCopied(false);}}}><ChatIcon name={copied?'check':'copy'}/>{copied&&<span>{t("Đã sao chép")}</span>}</button>;
}
function sourceHref(url:unknown){try{const value=new URL(String(url));return value.protocol==='https:'?value.href:null;}catch{return null;}}
export function ChatMessages({state}:{state:WorkspaceState}){
 const {t,language}=useLocale();
 const pending=state.busy&&state.sendingBody&&!state.messages.some(message=>message.client_key===state.pendingKey);
 return <div className="chat-transcript">
  {state.messages.map(message=><article className={'chat-message '+(message.role==='user'?'user':'assistant')} key={message.id}>
   {message.role!=='user'&&<div className="chat-answer-label"><ChatIcon name={message.role==='staff'?'person':'spark'}/><strong>{t(message.role==='staff'?'Chuyên viên':['ai','clarify'].includes(message.metadata?.kind)?'Trợ lý AI':'Luật Việt Đức')}</strong></div>}
   {message.attachments?.length>0&&<div className="chat-message-files">{message.attachments.map((file:any)=><a className="chat-file-chip" key={file.id} href={file.url} download><span aria-hidden="true">▤</span><span><strong>{file.name}</strong><small>{Math.ceil(file.size/1024)} KB</small></span><span aria-hidden="true">↓</span></a>)}</div>}
   <div className="chat-answer-text">{String(message.body).split(/\n\n+/).map((paragraph,index)=><p key={index}>{paragraph}</p>)}</div>
   {message.metadata?.sources?.length>0&&<div className="chat-sources">{message.metadata.sources.map((source:any)=>{const href=sourceHref(source.url);return href?<a key={source.id} href={href} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer"><ChatIcon name="arrow"/>{source.title}</a>:null;})}</div>}
   {message.role!=='user'&&<CopyAnswer text={message.body}/>}
   <time className="sr-only" dateTime={message.created_at}>{new Date(message.created_at).toLocaleString(language==='de'?'de-DE':'vi-VN')}</time>
  </article>)}
  {pending&&<article className="chat-message user is-pending"><div className="chat-answer-text"><p>{state.sendingBody}</p></div></article>}
  {((state.busy&&state.sendingBody)||(state.conversation?.aiEnabled&&state.conversation.aiStartedAt&&Date.now()-new Date(state.conversation.aiStartedAt).getTime()<35000))&&<div className="chat-thinking" role="status" aria-label={t("Đang chuẩn bị phản hồi")}><span/><span/><span/></div>}
 </div>;
}
