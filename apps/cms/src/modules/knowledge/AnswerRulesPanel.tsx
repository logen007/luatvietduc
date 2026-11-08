'use client';
import {AppLink} from '../shared/AppLink';
import {useEffect,useRef,useState} from 'react';
import {useAuth} from '@payloadcms/ui';
import {api} from '../shared/client-api';
import {useUnsavedChanges} from '../shared/unsaved-changes';
import {fixedAnswerSafeguards,defaultAnswerRules} from '../assistant/default-rules';
import {answerRuleList,answerRuleReceipt,type AnswerRuleDraft as Rule} from './answer-rules-client';
function RuleEditor({initial,onSaved}:{initial:Rule;onSaved:(rule:Rule)=>void}){
 const [body,setBody]=useState(()=>initial.body),[enabled,setEnabled]=useState(initial.enabled),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const gate=useRef(false),dirty=body!==initial.body||enabled!==initial.enabled;
 useUnsavedChanges(dirty);
 async function save(){
  if(gate.current)return;gate.current=true;setBusy(true);setError('');setNotice('');
  try{
   const doc=await api('knowledge-answer-rules',{key:initial.key,id:initial.id,updatedAt:initial.updatedAt,body,enabled});
   const next=answerRuleReceipt(doc,initial,enabled);
   setBody(next.body);setEnabled(next.enabled);onSaved(next);setNotice(next.enabled?'Đã lưu và áp dụng.':'Đã lưu và tắt quy tắc.');
  }catch(error){setError((error as Error).message);}finally{gate.current=false;setBusy(false);}
 }
 return <section className="lvd-answer-rule"><header><h2>{initial.title}</h2><label><input type="checkbox" checked={enabled} disabled={busy} onChange={event=>{setEnabled(event.target.checked);setNotice('');}}/> Bật</label></header>{initial.pending&&<p role="status">Có bản nháp chưa áp dụng. Quy tắc hiện {initial.appliedEnabled?'đang bật':'đang tắt'}.</p>}<textarea aria-label={initial.title} value={body} rows={6} maxLength={4000} disabled={busy} onChange={event=>{setBody(event.target.value);setNotice('');}}/>{initial.enabled&&initial.reviewDueAt&&new Date(initial.reviewDueAt).getTime()<Date.now()&&<p role="status">Đã đến hạn rà soát. Lưu thay đổi để áp dụng lại.</p>}<footer><button type="button" disabled={busy||(!dirty&&!initial.pending&&!(initial.enabled&&initial.reviewDueAt&&new Date(initial.reviewDueAt).getTime()<Date.now()))||!body.trim()} onClick={()=>void save()}>{busy?'Đang lưu…':'Lưu thay đổi'}</button><button type="button" disabled={busy} onClick={()=>{setBody(defaultAnswerRules.find(rule=>rule.key===initial.key)!.body);setEnabled(true);setNotice('Chưa lưu.');}}>Dùng mặc định</button></footer>{error&&<p role="alert">{error} <button type="button" onClick={()=>window.location.reload()}>Tải lại</button></p>}{notice&&<p role="status">{notice}</p>}</section>;
}
export function AnswerRulesPanel(){
 const {user}=useAuth();
 if(!user||!['owner','support','knowledge','reviewer'].includes(String(user.role)))return <p role="alert">Đăng nhập bằng tài khoản được phân quyền.</p>;
 return <RulesWorkspace key={String(user.id)+':'+user.role}/>;
}
function RulesWorkspace(){
 const [rules,setRules]=useState<Rule[]|null>(null),[error,setError]=useState('');
 useEffect(()=>{let active=true;api('knowledge-answer-rules').then(result=>{if(active)setRules(answerRuleList(result));}).catch(error=>{if(active)setError(error.message);});return()=>{active=false;};},[]);
 return <div className="lvd-answer-rules"><p>Áp dụng cho các lượt trả lời tiếp theo. Quy tắc không phải nguồn căn cứ pháp luật.</p>{error?<p role="alert">{error} <button type="button" onClick={()=>window.location.reload()}>Thử lại</button></p>:!rules?defaultAnswerRules.map(rule=><section key={rule.key} className="lvd-answer-rule" aria-hidden="true" inert><header><h2>{rule.title}</h2><label><input type="checkbox" disabled/> Bật</label></header><textarea rows={6} disabled value="" readOnly/><footer><button type="button" disabled>Lưu thay đổi</button><button type="button" disabled>Dùng mặc định</button></footer></section>):rules.map(rule=><RuleEditor key={rule.key} initial={rule} onSaved={next=>setRules(previous=>previous!.map(item=>item.key===next.key?next:item))}/>)}<details className="lvd-answer-rule"><summary>Giới hạn hệ thống</summary><ul>{fixedAnswerSafeguards.map(text=><li key={text}>{text}</li>)}</ul><p>Các giới hạn này bảo vệ nguồn trả lời và dữ liệu, không thay đổi bằng nội dung quy tắc.</p></details><AppLink href="/admin/collections/knowledge?where[entryType][equals]=rule">Quy tắc bổ sung →</AppLink></div>;
}
