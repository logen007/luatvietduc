"use client";
import { useEffect, useRef, useState } from 'react';
import { integrationCatalog, type Provider, type Values } from './catalog';
import {ConnectionInstructions} from './Instructions';
import {ConnectionError,mergeConnectionDraft,requestConnection as request} from './client';
import {useUnsavedChanges} from '../shared/unsaved-changes';
import {isPublicSessionCurrent,usePublicSession,loadPublicSession} from '../shared/session-client';
import {createOperationGate} from '../chat/client-operations';
type Connection={provider:Provider;values:Values;stored:Record<string,boolean>;version:number;enabled:boolean;checkState:string;checkedAt:string|null};
const labels:Record<string,string>={untested:'Chưa kiểm tra',passed:'Kiểm tra đạt',failed:'Kiểm tra chưa đạt',configured:'Định dạng hợp lệ · cần thử đăng nhập'};
function ConnectionForm({initial,revision}:{initial:Connection;revision:number}){
  const [connection,setConnection]=useState(initial),[values,setValues]=useState<Values>(initial.values),[busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState(''),[conflict,setConflict]=useState(false);
  const dirty=JSON.stringify(values)!==JSON.stringify(connection.values);
  const gate=useRef(createOperationGate());
  useEffect(()=>()=>gate.current.reset(),[]);
  useUnsavedChanges(dirty);
  const definition=integrationCatalog[connection.provider];
  async function act(action:'save'|'test'|'toggle'){
    if(!isPublicSessionCurrent(revision)||conflict||(action!=='save'&&dirty))return;
    const ticket=gate.current.begin();if(!ticket)return;
    const current=()=>isPublicSessionCurrent(revision)&&gate.current.isCurrent(ticket);
    setBusy(true);setError('');setMessage('');
    try{
      const result=await request({action,provider:connection.provider,version:connection.version,...(action==='save'?{values}:action==='toggle'?{enabled:!connection.enabled}:{})});
      if(!current())return;
      setConnection(result.connection);setValues(result.connection.values);
      setMessage(result.message||(action==='save'?'Đã lưu. Kiểm tra rồi bật để sử dụng.':result.connection.enabled?'Đã bật kết nối.':'Đã tắt kết nối.'));
    }catch(e){if(current()){setError((e as Error).message);if(e instanceof ConnectionError&&e.status===409)setConflict(true);}}finally{if(gate.current.end(ticket)&&isPublicSessionCurrent(revision))setBusy(false);}
  }
  async function reload(){
    if(!isPublicSessionCurrent(revision))return;
    const ticket=gate.current.begin();if(!ticket)return;
    const current=()=>isPublicSessionCurrent(revision)&&gate.current.isCurrent(ticket);
    setBusy(true);setMessage('');
    try{
      const result=await request(),fresh:Connection|undefined=result.connections.find((item:Connection)=>item.provider===connection.provider);
      if(!fresh)throw new ConnectionError('Chưa đọc được cấu hình. Vui lòng thử lại.');
      if(!current())return;
      setValues(draft=>mergeConnectionDraft(connection.values,draft,fresh.values,definition.fields));setConnection(fresh);setConflict(false);setError('');setMessage('Đã tải cấu hình mới.');
    }catch(e){if(current())setError((e as Error).message);}finally{if(gate.current.end(ticket)&&isPublicSessionCurrent(revision))setBusy(false);}
  }
  return <section className="live-card integration-card">
    <div className="integration-title"><h2>{definition.title}</h2><span className={'live-status '+(connection.enabled?'is-ready':'is-pending')}>{connection.enabled?'Đang bật':'Đang tắt'}</span></div>
    <p>{definition.help}</p>
    <ConnectionInstructions provider={connection.provider}/>
    {connection.provider==='google'&&<label>Redirect URI để điền trong Google Cloud<input readOnly value="https://luatvietduc.com/auth/google/callback" onFocus={e=>e.target.select()}/></label>}
    <form onSubmit={e=>{e.preventDefault();void act('save');}} autoComplete="off">
      {definition.fields.map(field=><label key={field.key}>{field.label}
        <input type={field.secret?'password':'text'} value={values[field.key]||''} onChange={e=>{setValues({...values,[field.key]:e.target.value});setMessage('');}}
          placeholder={field.secret&&connection.stored[field.key]?'Đã lưu · để trống nếu giữ nguyên':field.placeholder}
          autoComplete={field.secret?'new-password':'off'} spellCheck={false} maxLength={4096} disabled={busy}/>
      </label>)}
      <div className="integration-actions">
        <button className="button" disabled={busy||conflict||(!dirty&&connection.version>0)}>Lưu cấu hình</button>
        <button type="button" className="button secondary" disabled={busy||conflict||dirty||!connection.version} onClick={()=>void act('test')}>{connection.provider==='email'?'Gửi email kiểm tra':'Kiểm tra kết nối'}</button>
        <button type="button" className="button secondary" disabled={busy||conflict||dirty||!connection.version||(!connection.enabled&&!['passed','configured'].includes(connection.checkState))} onClick={()=>void act('toggle')}>{connection.enabled?'Tắt kết nối':'Bật sử dụng'}</button>
      </div>
    </form>
    <p className="integration-check">{busy?'Đang xử lý…':labels[connection.checkState]||'Chưa kiểm tra'}{connection.checkedAt?' · '+new Date(connection.checkedAt).toLocaleString('vi-VN'):''}</p>
    {message&&<p className="integration-message" role="status">{message}</p>}
    {error&&<p className="live-error" role="alert">{error}{conflict&&<> <button type="button" disabled={busy} onClick={()=>void reload()}>Tải lại cấu hình</button></>}</p>}
  </section>;
}
export function IntegrationPanel({providers=['google','ai','translation','r2','email']}:{providers?:Provider[]}){
  const session=usePublicSession(),owner=session.status==='ready'&&session.user?.role==='owner';
  const [revision,setRevision]=useState(-1);
  const [connections,setConnections]=useState<Connection[]|null>(null),[error,setError]=useState<ConnectionError|null>(null),[attempt,setAttempt]=useState(0);
  useEffect(()=>{let active=true;setError(null);setConnections(null);setRevision(session.revision);if(owner)request().then(data=>{if(active&&isPublicSessionCurrent(session.revision))setConnections(data.connections);}).catch(e=>{if(active&&isPublicSessionCurrent(session.revision))setError(e);});return()=>{active=false;};},[attempt,owner,session.revision]);
  if(session.status==='error')return <div role="alert"><p>Chưa kiểm tra được phiên đăng nhập.</p><button type="button" onClick={()=>void loadPublicSession().catch(()=>{})}>Thử lại</button></div>;
  if(session.status==='loading')return <p role="status">Đang kiểm tra phiên đăng nhập…</p>;
  if(!owner)return <p role="alert">Chỉ quản trị viên được quản lý kết nối. <a href="/admin/login">Đăng nhập lại</a></p>;
  if(error)return <div className="live-card"><p className="live-error" role="alert">{error.message}</p>{error.status===401?<a className="button" href="/admin/login">Đăng nhập lại</a>:error.status===403?<a className="button" href="/admin">Về tổng quan</a>:<button type="button" className="button" onClick={()=>setAttempt(value=>value+1)}>Thử lại</button>}</div>;
  if(revision!==session.revision||!connections)return <p role="status">Đang tải cấu hình…</p>;
  return <><p className="integration-intro">Lưu cấu hình → Kiểm tra → Bật sử dụng. Để trống ô khóa đã lưu nếu không thay đổi. Lưu bản mới sẽ tạm tắt kết nối đó cho đến khi anh kiểm tra và bật lại.</p><div className="integration-grid">{connections.filter(c=>providers.includes(c.provider)).map(connection=><ConnectionForm key={session.revision+':'+connection.provider} initial={connection} revision={session.revision}/>)}</div></>;
}
