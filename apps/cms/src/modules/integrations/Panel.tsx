"use client";
import { useEffect, useState } from 'react';
import { integrationCatalog, type Provider, type Values } from './catalog';
type Connection={provider:Provider;values:Values;stored:Record<string,boolean>;version:number;enabled:boolean;checkState:string;checkedAt:string|null};
const labels:Record<string,string>={untested:'Chưa kiểm tra',passed:'Kiểm tra đạt',failed:'Kiểm tra chưa đạt',configured:'Định dạng hợp lệ · cần thử đăng nhập'};
async function request(data?:unknown){
  const response=await fetch('/service/integrations',{method:data?'POST':'GET',cache:'no-store',headers:data?{'content-type':'application/json'}:undefined,body:data?JSON.stringify(data):undefined});
  const body=await response.json();if(!response.ok)throw new Error(body.error||'Chưa thực hiện được thao tác.');return body;
}
function ConnectionForm({initial}:{initial:Connection}){
  const [connection,setConnection]=useState(initial),[values,setValues]=useState<Values>(initial.values),[dirty,setDirty]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState('');
  const definition=integrationCatalog[connection.provider];
  async function act(action:'save'|'test'|'toggle'){
    setBusy(true);setError('');setMessage('');
    try{
      const result=await request({action,provider:connection.provider,version:connection.version,...(action==='save'?{values}:action==='toggle'?{enabled:!connection.enabled}:{})});
      setConnection(result.connection);setValues(result.connection.values);setDirty(false);
      setMessage(result.message||(action==='save'?'Đã lưu. Kiểm tra rồi bật để sử dụng.':result.connection.enabled?'Đã bật kết nối.':'Đã tắt kết nối.'));
    }catch(e){setError((e as Error).message);}finally{setBusy(false);}
  }
  return <section className="live-card integration-card">
    <div className="integration-title"><h2>{definition.title}</h2><span className={'live-status '+(connection.enabled?'is-ready':'is-pending')}>{connection.enabled?'Đang bật':'Đang tắt'}</span></div>
    <p>{definition.help}</p>
    {connection.provider==='google'&&<label>Redirect URI để điền trong Google Cloud<input readOnly value="https://luatvietduc.com/auth/google/callback" onFocus={e=>e.target.select()}/></label>}
    <form onSubmit={e=>{e.preventDefault();void act('save');}} autoComplete="off">
      {definition.fields.map(field=><label key={field.key}>{field.label}
        <input type={field.secret?'password':'text'} value={values[field.key]||''} onChange={e=>{setValues({...values,[field.key]:e.target.value});setDirty(true);setMessage('');}}
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
export function IntegrationPanel(){
  const [connections,setConnections]=useState<Connection[]|null>(null),[error,setError]=useState('');
  useEffect(()=>{let active=true;request().then(data=>{if(active)setConnections(data.connections);}).catch(e=>{if(active)setError(e.message);});return()=>{active=false;};},[]);
  if(error)return <div className="live-card"><p className="live-error" role="alert">{error}</p><a className="button" href="/admin/login">Đăng nhập quản trị</a></div>;
  if(!connections)return <p role="status">Đang tải cấu hình…</p>;
  return <><p className="integration-intro">Lưu cấu hình → Kiểm tra → Bật sử dụng. Để trống ô khóa đã lưu nếu không thay đổi. Lưu bản mới sẽ tạm tắt kết nối đó cho đến khi anh kiểm tra và bật lại.</p><div className="integration-grid">{connections.map(connection=><ConnectionForm key={connection.provider} initial={connection}/>)}</div></>;
}
