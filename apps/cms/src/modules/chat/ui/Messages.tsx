"use client";
import {useLocale} from "../../shared/locale";
import {useLayoutEffect,useRef,useState} from 'react';
import {ReplyText} from './ReplyText';
import type {WorkspaceState} from '../useWorkspace';
import {ChatIcon} from './Icons';
function CopyAnswer({text}:{text:string}){
 const {t,language}=useLocale();
 const [copied,setCopied]=useState(false);
 return <button type="button" className="chat-copy" aria-label={t(copied?'Đã sao chép':'Sao chép câu trả lời')} onClick={async()=>{try{await navigator.clipboard.writeText(text);setCopied(true);}catch{setCopied(false);}}}><ChatIcon name={copied?'check':'copy'}/>{copied&&<span>{t("Đã sao chép")}</span>}</button>;
}
function MessageTime({value,language}:{value:string;language:string}){
 const date=new Date(value);if(!Number.isFinite(date.getTime()))return null;
 const locale=language==='de'?'de-DE':'vi-VN';
 return <time className="chat-message-time" dateTime={value} title={date.toLocaleString(locale)}>{date.toLocaleString(locale,{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})}</time>;
}
function sourceHref(url:unknown){try{const value=new URL(String(url));return value.protocol==='https:'?value.href:null;}catch{return null;}}
export function ChatMessages({state}:{state:WorkspaceState}){
 const {t,language}=useLocale();
 const seen=useRef(new Set(state.messages.map(message=>String(message.id)))),[newReplies,setNewReplies]=useState<Set<string>>(()=>new Set());
 useLayoutEffect(()=>{
  const added=state.messages.filter(message=>!seen.current.has(String(message.id)));
  for(const message of added)seen.current.add(String(message.id));
  const replies=added.filter(message=>message.role!=='user');
  if(replies.length)setNewReplies(previous=>new Set([...previous,...replies.map(message=>String(message.id))]));
 },[state.messages]);
 const pending=state.busy&&state.sendingBody&&(!state.pendingKey||!state.messages.some(message=>message.client_key===state.pendingKey));
 const handoff=state.messages.slice().reverse().find(message=>message.role==='assistant'&&message.metadata?.kind==='handoff');
 const awaitingSpecialist=state.conversation?.state==='queued'&&state.conversation.aiEnabled===false;
 const inviteLogin=!state.me?.user&&awaitingSpecialist;
 const invitation=<>{inviteLogin&&<p className="chat-login-message"><a href={'/tai-khoan?conversation='+encodeURIComponent(state.selected)} aria-disabled={state.busy||state.uploading} onClick={event=>{if(event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;event.preventDefault();void state.openAccount();}}>{t("Đăng ký")} <span aria-hidden="true">↗</span></a> {t("Bạn có thể đăng ký để lưu cuộc trò chuyện và được chuyên viên ưu tiên trả lời.")} {t("Nếu tiện, bạn để lại số điện thoại ngay trong cuộc trò chuyện để chuyên viên liên hệ nhé. Không bắt buộc.")}</p>}{awaitingSpecialist&&!inviteLogin&&<p>{t("Nếu tiện, bạn để lại số điện thoại ngay trong cuộc trò chuyện để chuyên viên liên hệ nhé. Không bắt buộc.")}</p>}</>;
 return <div className="chat-transcript">
  {state.messages.map(message=><article className={'chat-message '+(message.role==='user'?'user':'assistant')} key={message.id}>
   {message.role!=='user'&&<div className="chat-answer-label"><ChatIcon name={message.role==='staff'?'person':'spark'}/>{message.role==='staff'&&<strong>{message.author_name||t('Chuyên viên')}</strong>}<MessageTime value={message.created_at} language={language}/></div>}
   {Boolean(message.attachments?.length)&&<div className="chat-message-files">{(message.attachments||[]).map(file=><a className="chat-file-chip" key={file.id} href={file.url} download><span aria-hidden="true">▤</span><span><strong>{file.name}</strong><small>{Math.ceil(file.size/1024)} KB</small></span><span aria-hidden="true">↓</span></a>)}</div>}
   <div className="chat-answer-text"><ReplyText animate={message.role!=='user'&&newReplies.has(String(message.id))} text={message.role==='assistant'&&message.metadata?.kind==='handoff'?t("Câu hỏi này cần chuyên viên xem xét thêm. Mình đã chuyển cuộc trò chuyện để chuyên viên tiếp tục hỗ trợ tại đây."):String(message.body)}/>{message.id===handoff?.id&&invitation}</div>
   {Boolean(message.metadata?.sources?.length)&&<div className="chat-sources">{(message.metadata?.sources||[]).map(source=>{const href=sourceHref(source.url||'');return href?<a key={source.id} href={href} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer"><ChatIcon name="arrow"/>{source.title}</a>:<span key={source.id}>{source.title}</span>;})}</div>}
   {(message.role==='staff'||message.metadata?.kind==='ai')&&<CopyAnswer text={message.body}/>}
  </article>)}
  {/* Attachments transfer directly to staff without an assistant handoff record. */}
  {!handoff&&awaitingSpecialist&&state.messages.some(message=>message.role==='user')&&<article className="chat-message assistant"><div className="chat-answer-text">{invitation}</div></article>}
  {pending&&<article className="chat-message user is-pending"><div className="chat-answer-text"><p>{state.sendingBody}</p></div></article>}
  {((state.busy&&state.sendingBody)||(state.conversation?.aiEnabled&&state.messages.at(-1)?.role==='user'))&&<div className="chat-thinking" role="status" aria-label={t("Đang chuẩn bị phản hồi")}><span/><span/><span/></div>}

 </div>;
}
