'use client';
import {useEffect,useState} from 'react';
import {api} from '../shared/client-api';
const empty={title:'',body:'',sourceUrl:'',questionAliases:'',effectiveFrom:'',reviewDueAt:'',expiresAt:''};
export function KnowledgePanel(){
 const [articles,setArticles]=useState<any[]>([]),[form,setForm]=useState<any>(empty),[editing,setEditing]=useState<any>(null),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState(''),[search,setSearch]=useState(''),[total,setTotal]=useState(0),[page,setPage]=useState(1),[pages,setPages]=useState(1);
 async function refresh(){const value=await api('knowledge-articles?page='+page+'&q='+encodeURIComponent(search));setArticles(value.articles);setTotal(value.total);setPages(value.totalPages);return value;}
 useEffect(()=>{let active=true;const timer=setTimeout(()=>{api('knowledge-articles?page='+page+'&q='+encodeURIComponent(search)).then(value=>{if(!active)return;setArticles(value.articles);setTotal(value.total);setPages(value.totalPages);}).catch(error=>{if(active)setError(error.message);});},200);return()=>{active=false;clearTimeout(timer);};},[search,page]);
 const change=(key:string,value:string)=>{setForm((previous:any)=>({...previous,[key]:value}));setNotice('');};
 const start=()=>{setEditing(null);setForm({...empty});setError('');setNotice('');};
 async function edit(id:number){setBusy(true);setError('');try{const doc=await api('knowledge-articles?id='+id);setEditing(doc);setForm(Object.fromEntries(Object.keys(empty).map(key=>[key,doc[key]||''])));setNotice('');}catch(error){setError((error as Error).message);}finally{setBusy(false);}}
 async function save(publish:boolean){setBusy(true);setError('');setNotice('');try{const doc=await api('knowledge-articles',{...form,...(editing?{id:editing.id,updatedAt:editing.updatedAt}:{}),publish});setEditing(doc);setForm(Object.fromEntries(Object.keys(empty).map(key=>[key,doc[key]||''])));await refresh();setNotice(publish?'Đã xuất bản vào kho kiến thức AI.':'Đã lưu bản nháp.');}catch(error){setError((error as Error).message);}finally{setBusy(false);}}
 const filtered=articles;
 return <div className="lvd-knowledge-workspace">
  <div className="lvd-knowledge-toolbar"><p>Nhập bài viết để xây dựng kiến thức cho trợ lý.</p><button type="button" className="button" onClick={start} disabled={busy}>Thêm bài viết</button></div>
  <div className="lvd-knowledge-columns"><section className="lvd-knowledge-list"><label htmlFor="knowledge-search">Bài viết ({total})</label><input id="knowledge-search" type="search" value={search} onChange={event=>{setSearch(event.target.value);setPage(1);}} placeholder="Tìm bài viết…"/>
   <div className="lvd-knowledge-items">{filtered.length?filtered.map(article=><button type="button" disabled={busy} className={editing?.id===article.id?'is-selected':''} key={article.id} onClick={()=>void edit(article.id)}><strong>{article.title}</strong><span>{article._status==='published'&&article.approved?'Đã xuất bản':'Bản nháp'}</span></button>):<p>Chưa có bài viết phù hợp.</p>}</div>{pages>1&&<div className="lvd-knowledge-pagination"><button type="button" disabled={page<=1||busy} onClick={()=>setPage(page-1)}>Trước</button><span>{page} / {pages}</span><button type="button" disabled={page>=pages||busy} onClick={()=>setPage(page+1)}>Sau</button></div>}
  </section><form className="lvd-knowledge-editor" onSubmit={event=>{event.preventDefault();void save(true);}} aria-busy={busy}>
   <header><h2>{editing?'Chỉnh sửa bài viết':'Bài viết mới'}</h2>{editing&&<span>{editing._status==='published'&&editing.approved?'Đã xuất bản':'Bản nháp'}</span>}</header>
   <label htmlFor="knowledge-title">Tiêu đề<input id="knowledge-title" value={form.title} onChange={event=>change('title',event.target.value)} maxLength={240} required disabled={busy} placeholder="Tiêu đề hoặc câu hỏi bài viết giải đáp"/></label>
   <label htmlFor="knowledge-body">Nội dung bài viết<textarea id="knowledge-body" rows={16} value={form.body} onChange={event=>change('body',event.target.value)} maxLength={16000} required disabled={busy} placeholder="Dán hoặc viết nội dung chuyên viên đã kiểm chứng…"/></label>
   <details className="lvd-knowledge-options"><summary>Tùy chọn bổ sung</summary>
    <label htmlFor="knowledge-source">Nguồn tham khảo<input id="knowledge-source" type="url" value={form.sourceUrl} onChange={event=>change('sourceUrl',event.target.value)} disabled={busy} placeholder="Để trống để dùng bài viết này làm nguồn"/></label>
    <label htmlFor="knowledge-aliases">Các cách hỏi tương đương<textarea id="knowledge-aliases" rows={3} value={form.questionAliases} onChange={event=>change('questionAliases',event.target.value)} disabled={busy} maxLength={4000} placeholder="Mỗi dòng một cách hỏi có cùng phạm vi với tiêu đề"/></label>
    <label htmlFor="knowledge-review">Ngày rà soát<input id="knowledge-review" type="date" value={form.reviewDueAt.slice(0,10)} onChange={event=>change('reviewDueAt',event.target.value)} disabled={busy}/></label><p>Mặc định rà soát sau 90 ngày. Có thể chỉnh chi tiết trong <a href={editing?'/admin/collections/knowledge/'+editing.id:'/admin/collections/knowledge'}>trình quản lý nâng cao</a>.</p>
   </details>
   <p className="lvd-knowledge-publish-note">Xuất bản xác nhận nội dung đã được chuyên viên kiểm chứng và cho phép dùng làm nguồn công khai cho AI. Nội dung ngoài phạm vi bài viết vẫn được chuyển chuyên viên.</p>
   <div className="integration-actions"><button className="button" type="submit" disabled={busy||!form.title.trim()||!form.body.trim()}>{busy?'Đang lưu…':editing? 'Cập nhật & xuất bản':'Xuất bản cho AI'}</button><button className="button secondary" type="button" disabled={busy||!form.title.trim()||!form.body.trim()} onClick={()=>void save(false)}>{editing? 'Lưu nháp / thu hồi':'Lưu nháp'}</button></div>
   {error&&<p className="live-error" role="alert">{error}</p>}{notice&&<p className="integration-message" role="status">{notice}</p>}
  </form></div>
 </div>;
}
