"use client";
import { useEffect, useState } from 'react';
import { integrationCatalog, type Provider, type Values } from './catalog';
import {ConnectionInstructions} from './Instructions';
import {ConnectionError,requestConnection as request} from './client';
import {useUnsavedChanges} from '../shared/unsaved-changes';
type Connection={provider:Provider;values:Values;stored:Record<string,boolean>;version:number;enabled:boolean;checkState:string;checkedAt:string|null};
const labels:Record<string,string>={untested:'Chưa kiểm tra',passed:'Kiểm tra đạt',failed:'Kiểm tra chưa đạt',configured:'Định dạng hợp lệ · cần thử đăng nhập'};
function ConnectionForm({initial}:{initial:Connection}){
  const [connection,setConnection]=useState(initial),[values,setValues]=useState<Values>(initial.values),[busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState('');
  const dirty=JSON.stringify(values)!==JSON.stringify(connection.values);
  useUnsavedChanges(dirty);
  const definition=integrationCatalog[connection.provider];
  async function act(action:'save'|'test'|'toggle'){
    setBusy(true);setError('');setMessage('');
    try{
      const result=await request({action,provider:connection.provider,version:connection.version,...(action==='save'?{values}:action==='toggle'?{enabled:!connection.enabled}:{})});
      setConnection(result.connection);setValues(result.connection.values);
      setMessage(result.message||(action==='save'?'Đã lưu. Kiểm tra rồi bật để sử dụng.':result.connection.enabled?'Đã bật kết nối.':'Đã tắt kết nối.'));
    }catch(e){setError((e as Error).message);}finally{setBusy(false);}
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
        <button className="button" disabled={busy||(!dirty&&connection.version>0)}>Lưu cấu hình</button>
        <button type="button" className="button secondary" disabled={busy||dirty||!connection.version} onClick={()=>void act('test')}>{connection.provider==='email'?'Gửi email kiểm tra':'Kiểm tra kết nối'}</button>
        <button type="button" className="button secondary" disabled={busy||dirty||!connection.version||(!connection.enabled&&!['passed','configured'].includes(connection.checkState))} onClick={()=>void act('toggle')}>{connection.enabled?'Tắt kết nối':'Bật sử dụng'}</button>
      </div>
    </form>
    <p className="integration-check">{busy?'Đang xử lý…':labels[connection.checkState]||'Chưa kiểm tra'}{connection.checkedAt?' · '+new Date(connection.checkedAt).toLocaleString('vi-VN'):''}</p>
    {message&&<p className="integration-message" role="status">{message}</p>}
    {error&&<p className="live-error" role="alert">{error}</p>}
  </section>;
}
export function IntegrationPanel({providers=['google','ai','r2','email']}:{providers?:Provider[]}){
  const [connections,setConnections]=useState<Connection[]|null>(null),[error,setError]=useState<ConnectionError|null>(null),[attempt,setAttempt]=useState(0);
  useEffect(()=>{let active=true;setError(null);request().then(data=>{if(active)setConnections(data.connections);}).catch(e=>{if(active)setError(e);});return()=>{active=false;};},[attempt]);
  if(error)return <div className="live-card"><p className="live-error" role="alert">{error.message}</p>{error.status===401?<a className="button" href="/admin/login">Đăng nhập lại</a>:error.status===403?<a className="button" href="/admin">Về tổng quan</a>:<button type="button" className="button" onClick={()=>setAttempt(value=>value+1)}>Thử lại</button>}</div>;
  if(!connections)return <p role="status">Đang tải cấu hình…</p>;
  return <><p className="integration-intro">Lưu cấu hình → Kiểm tra → Bật sử dụng. Để trống ô khóa đã lưu nếu không thay đổi. Lưu bản mới sẽ tạm tắt kết nối đó cho đến khi anh kiểm tra và bật lại.</p><div className="integration-grid">{connections.filter(c=>providers.includes(c.provider)).map(connection=><ConnectionForm key={connection.provider} initial={connection}/>)}</div></>;
}
