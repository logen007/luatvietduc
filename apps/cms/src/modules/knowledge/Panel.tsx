'use client';
import {useEffect,useRef,useState} from 'react';
import {api} from '../shared/client-api';
import {useAuth} from '@payloadcms/ui';
import {useUnsavedChanges} from '../shared/unsaved-changes';
import {useSources} from './useSources';
const empty={title:'',body:'',entryType:'knowledge'};
const editable=(doc:any)=>({title:doc?.title||'',body:doc?.body||'',entryType:doc?.entryType||'knowledge'});
function indexLabel(article:any){
 const enabled=article.entryType==='rule'?article.ruleEnabled:article._status==='published'&&article.approved;
 if(!enabled)return 'Bản nháp';
 if(article.effectiveFrom&&new Date(article.effectiveFrom).getTime()>Date.now())return 'Chưa hiệu lực';
 if(article.expiresAt&&new Date(article.expiresAt).getTime()<=Date.now())return 'Hết hiệu lực';
 if(new Date(article.reviewDueAt).getTime()<=Date.now())return 'Cần rà soát';
 return article.entryType==='rule'?'Đã bật':article.index?.status==='ready'&&article.index?.indexed_revision?'Sẵn sàng trả lời':'Chờ đồng bộ';
}
export function KnowledgePanel(){
 const {user}=useAuth();
 if(!user||!['owner','support','knowledge','reviewer'].includes(String(user.role)))return <p role="alert">Đăng nhập bằng tài khoản được phân quyền để quản lý kiến thức AI.</p>;
 return <KnowledgeWorkspace key={String(user.id)+':'+user.role+':'+JSON.stringify(user.jurisdictions||[])}/>;
}
function KnowledgeWorkspace(){
 const [form,setForm]=useState(empty),[editing,setEditing]=useState<any>(null),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState(''),[search,setSearch]=useState(''),[page,setPage]=useState(1);
 const {articles,total,totalPages:pages,loaded,error:listError,refresh}=useSources(search,page);
 const operation=useRef(false),mounted=useRef(true);
 useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;};},[]);
 const canDiscard=useUnsavedChanges(JSON.stringify(form)!==JSON.stringify(editable(editing)));
 const change=(key:keyof typeof empty,value:string)=>{setForm(previous=>({...previous,[key]:value}));setNotice('');};
 function create(){if(operation.current||!canDiscard())return;setEditing(null);setForm(empty);setError('');setNotice('');}
 async function edit(id:number){
  if(operation.current||id===editing?.id||!canDiscard())return;operation.current=true;setBusy(true);setError('');
  try{const doc=await api('knowledge-articles?id='+id);if(mounted.current){setEditing(doc);setForm(editable(doc));setNotice('');}}
  catch(error){if(mounted.current)setError((error as Error).message);}finally{operation.current=false;if(mounted.current)setBusy(false);}
 }
 async function save(publish:boolean){
  if(operation.current)return;operation.current=true;setBusy(true);setError('');setNotice('');
  try{
   const doc=await api('knowledge-articles',{...form,...(editing?{id:editing.id,updatedAt:editing.updatedAt}:{}),publish});
   if(!mounted.current)return;setEditing(doc);setForm(editable(doc));void refresh(true);
   setNotice(publish?form.entryType==='rule'?'Đã bật quy tắc.':'Đã lưu và bật cho AI.':'Đã lưu bản nháp và ngừng dùng bài cho AI.');
  }catch(error){if(mounted.current)setError((error as Error).message);}finally{operation.current=false;if(mounted.current)setBusy(false);}
 }
 async function retry(){
  if(!editing||operation.current)return;operation.current=true;setBusy(true);setError('');
  try{await api('knowledge-reindex',{id:editing.id});if(mounted.current){void refresh(true);setNotice('Đã yêu cầu đồng bộ lại.');}}
  catch(error){if(mounted.current)setError((error as Error).message);}finally{operation.current=false;if(mounted.current)setBusy(false);}
 }
 useEffect(()=>{if(loaded&&page>Math.max(1,pages))setPage(Math.max(1,pages));},[loaded,page,pages]);
 return <div className="lvd-knowledge-workspace">
  <div className="lvd-knowledge-toolbar"><span>{loaded?total+' bài viết':''}</span><button className="button" type="button" disabled={busy} onClick={create}>Thêm bài viết</button></div>
  <div className="lvd-knowledge-columns"><section className="lvd-knowledge-list">
   <label htmlFor="knowledge-search">Bài viết AI</label><input id="knowledge-search" type="search" value={search} onChange={event=>{setSearch(event.target.value);setPage(1);}} placeholder="Tìm bài viết…"/>
   {listError&&<p className="live-error" role="alert">{listError} <button type="button" onClick={()=>void refresh()}>Thử lại</button></p>}
   <div className="lvd-knowledge-items">{articles.length?articles.map(article=><button type="button" disabled={busy} className={editing?.id===article.id?'is-selected':''} key={article.id} onClick={()=>void edit(article.id)}><strong>{article.title}</strong><span>{article.entryType==='rule'?'Quy tắc · ':''}{indexLabel(article)}</span></button>):<p>{listError?'Danh sách đang gián đoạn.':!loaded?'Đang tải…':'Chưa có bài viết.'}</p>}</div>
   {pages>1&&<div className="lvd-knowledge-pagination"><button type="button" disabled={page<=1||busy} onClick={()=>setPage(page-1)}>Trước</button><span>{page} / {pages}</span><button type="button" disabled={page>=pages||busy} onClick={()=>setPage(page+1)}>Sau</button></div>}
  </section>
  <form className="lvd-knowledge-editor" onSubmit={event=>{event.preventDefault();void save(true);}} aria-busy={busy}>
   <header><h2>{editing?'Chỉnh sửa':'Bài viết mới'}</h2>{editing&&<span>{(editing.entryType==='rule'?editing.ruleEnabled:editing._status==='published'&&editing.approved)?'Đang dùng cho AI':'Bản nháp'}</span>}</header>
   <label htmlFor="knowledge-kind">Loại nội dung<select id="knowledge-kind" value={form.entryType} onChange={event=>change('entryType',event.target.value)} disabled={busy}><option value="knowledge">Kiến thức</option><option value="rule">Quy tắc trả lời</option></select></label>
   <label htmlFor="knowledge-title">Tiêu đề<input id="knowledge-title" value={form.title} onChange={event=>change('title',event.target.value)} maxLength={240} required disabled={busy}/></label>
   <label htmlFor="knowledge-body"><span id="knowledge-body-label">{form.entryType==='rule'?'Quy tắc trả lời':'Nội dung bài viết'}</span><textarea aria-labelledby="knowledge-body-label" id="knowledge-body" rows={16} value={form.body} onChange={event=>change('body',event.target.value)} maxLength={form.entryType==='rule'?4000:16000} required disabled={busy}/></label>
   <div className="integration-actions"><button className="button" type="submit" disabled={busy||!form.title.trim()||!form.body.trim()}>{busy?'Đang lưu…':editing?'Cập nhật & bật':'Dùng cho AI'}</button><button className="button secondary" type="button" disabled={busy||!form.title.trim()||!form.body.trim()} onClick={()=>void save(false)}>{editing?'Lưu nháp / thu hồi':'Lưu nháp'}</button></div>
   {editing?.entryType!=='rule'&&editing?._status==='published'&&<button type="button" className="lvd-knowledge-retry" onClick={()=>void retry()} disabled={busy}>Đồng bộ lại</button>}
   {error&&<p className="live-error" role="alert">{error}</p>}{notice&&<p className="integration-message" role="status">{notice}</p>}
  </form></div>
 </div>;
}
