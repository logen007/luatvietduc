'use client';
import {useEffect,useRef,useState} from 'react';
import {api} from '../shared/client-api';
import {useUnsavedChanges} from '../shared/unsaved-changes';
import {useSources} from './useSources';
const indexLabel=(article:any)=>article._status!=='published'||!article.approved?'Bản nháp':new Date(article.reviewDueAt).getTime()<=Date.now()?'Đến hạn rà soát':article.index?.status==='ready'&&article.index?.indexed_revision?'AI đã sẵn sàng':article.index?.error_code==='daily-quota'?'Chờ hạn mức ngày mới':article.index?.error_code==='provider-quota'?'Chờ hạn mức Gemini':article.index?.status==='waiting'?'Đang chờ thử lại':'Đang lập chỉ mục';
const empty={title:'',body:'',sourceUrl:'',questionAliases:'',effectiveFrom:'',reviewDueAt:'',expiresAt:''};
const editable=(doc:any)=>Object.fromEntries(Object.keys(empty).map(key=>[key,doc[key]||'']));
export function KnowledgePanel(){
 const [form,setForm]=useState<any>(empty),[editing,setEditing]=useState<any>(null),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState(''),[search,setSearch]=useState(''),[page,setPage]=useState(1),[gaps,setGaps]=useState<any[]>([]);
 const {articles,total,totalPages:pages,indexWorker:worker,loaded,error:listError,refresh}=useSources(search,page);
 const operation=useRef(false);
 const canDiscard=useUnsavedChanges(Boolean(editing)&&JSON.stringify(form)!==JSON.stringify(editable(editing)));
 const change=(key:string,value:string)=>{setForm((previous:any)=>({...previous,[key]:value}));setNotice('');};
 async function edit(id:number){if(operation.current||id===editing?.id||!canDiscard())return;operation.current=true;setBusy(true);setError('');try{const doc=await api('knowledge-articles?id='+id);setEditing(doc);setForm(editable(doc));setNotice('');}catch(error){setError((error as Error).message);}finally{operation.current=false;setBusy(false);}}
 async function save(publish:boolean){if(operation.current)return;operation.current=true;setBusy(true);setError('');setNotice('');try{const doc=await api('knowledge-articles',{...form,...(editing?{id:editing.id,updatedAt:editing.updatedAt}:{}),publish});setEditing(doc);setForm(editable(doc));void refresh(true);setNotice(publish?'Đã xuất bản. Hệ thống đang cập nhật chỉ mục cho AI.':'Đã lưu bản nháp và ngừng dùng bài cho AI.');}catch(error){setError((error as Error).message);}finally{operation.current=false;setBusy(false);}}
 useEffect(()=>{api('knowledge-gaps').then(value=>setGaps(value.conversations)).catch(()=>{});},[]);
 async function retry(){if(!editing||operation.current)return;operation.current=true;setBusy(true);setError('');try{await api('knowledge-reindex',{id:editing.id});void refresh(true);setNotice('Đã yêu cầu cập nhật chỉ mục.');}catch(error){setError((error as Error).message);}finally{operation.current=false;setBusy(false);}}
 useEffect(()=>{if(loaded&&page>Math.max(1,pages))setPage(Math.max(1,pages));},[loaded,page,pages]);
 const filtered=articles;
 return <div className="lvd-knowledge-workspace">
  <div className="lvd-knowledge-toolbar"><p><a href="/admin/collections/articles?where%5BaiAllowed%5D%5Bequals%5D=true">Bài viết cho AI ↗</a></p><a className="button" href="/admin/collections/articles/create">Viết bài mới</a></div>
  <p className="lvd-knowledge-index-status" role="status">{!loaded?(listError?'Chưa kiểm tra được đồng bộ AI.':'Đang kiểm tra đồng bộ AI…'):!worker?.online?'Bộ lập chỉ mục chưa hoạt động.':worker.state==='index-unavailable'?'Chỉ mục đang gián đoạn, hệ thống sẽ thử lại.':worker.state==='provider-disabled'?'Bật kết nối Gemini trong Cài đặt để AI nhận bài mới.':'Bài mới và các thay đổi được tự động đồng bộ cho AI.'}</p>
  <div className="lvd-knowledge-columns"><section className="lvd-knowledge-list"><label htmlFor="knowledge-search">Nguồn nhập trực tiếp ({loaded?total:'…'})</label><input id="knowledge-search" type="search" value={search} onChange={event=>{setSearch(event.target.value);setPage(1);}} placeholder="Tìm nguồn đã nhập…"/>
   {listError&&<p className="live-error" role="alert">{listError} <button type="button" onClick={()=>void refresh()}>Thử lại</button></p>}
   <div className="lvd-knowledge-items">{filtered.length?filtered.map(article=><button type="button" disabled={busy} className={editing?.id===article.id?'is-selected':''} key={article.id} onClick={()=>void edit(article.id)}><strong>{article.title}</strong><span>{indexLabel(article)}</span></button>):<p>{listError?'Danh sách đang gián đoạn.':!loaded?'Đang tải…':'Chưa có nguồn nhập trực tiếp.'}</p>}</div>{pages>1&&<div className="lvd-knowledge-pagination"><button type="button" disabled={page<=1||busy} onClick={()=>setPage(page-1)}>Trước</button><span>{page} / {pages}</span><button type="button" disabled={page>=pages||busy} onClick={()=>setPage(page+1)}>Sau</button></div>}
  </section>{editing?<form className="lvd-knowledge-editor" onSubmit={event=>{event.preventDefault();void save(true);}} aria-busy={busy}>
   <header><h2>{editing?'Chỉnh sửa bài viết':'Bài viết mới'}</h2>{editing&&<span>{editing._status==='published'&&editing.approved?'Đã xuất bản':'Bản nháp'}</span>}</header>
   <label htmlFor="knowledge-title">Tiêu đề<input id="knowledge-title" value={form.title} onChange={event=>change('title',event.target.value)} maxLength={240} required disabled={busy} placeholder="Tiêu đề hoặc câu hỏi bài viết giải đáp"/></label>
   <label htmlFor="knowledge-body"><span id="knowledge-body-label">Nội dung bài viết</span><textarea aria-labelledby="knowledge-body-label" id="knowledge-body" rows={16} value={form.body} onChange={event=>change('body',event.target.value)} maxLength={16000} required disabled={busy} placeholder="Dán hoặc viết nội dung chuyên viên đã kiểm chứng…"/></label>
   <details className="lvd-knowledge-options"><summary>Tùy chọn bổ sung</summary>
    <label htmlFor="knowledge-source">Nguồn tham khảo<input id="knowledge-source" type="url" value={form.sourceUrl} onChange={event=>change('sourceUrl',event.target.value)} disabled={busy} placeholder="Để trống để dùng bài viết này làm nguồn"/></label>
    <label htmlFor="knowledge-aliases"><span id="knowledge-aliases-label">Các cách hỏi tương đương</span><textarea aria-labelledby="knowledge-aliases-label" id="knowledge-aliases" rows={3} value={form.questionAliases} onChange={event=>change('questionAliases',event.target.value)} disabled={busy} maxLength={4000} placeholder="Mỗi dòng một cách hỏi có cùng phạm vi với tiêu đề"/></label>
    <label htmlFor="knowledge-review">Ngày rà soát<input id="knowledge-review" type="date" value={form.reviewDueAt.slice(0,10)} onChange={event=>change('reviewDueAt',event.target.value)} disabled={busy}/></label><p>Mặc định rà soát sau 90 ngày. Có thể chỉnh chi tiết trong <a href={editing?'/admin/collections/knowledge/'+editing.id:'/admin/collections/knowledge'}>trình quản lý nâng cao</a>.</p>
   </details>
   <p className="lvd-knowledge-publish-note">Xuất bản xác nhận nội dung đã được chuyên viên kiểm chứng và cho phép dùng làm nguồn công khai cho AI. Nội dung ngoài phạm vi bài viết vẫn được chuyển chuyên viên.</p>
   <div className="integration-actions"><button className="button" type="submit" disabled={busy||!form.title.trim()||!form.body.trim()}>{busy?'Đang lưu…':editing? 'Cập nhật & xuất bản':'Xuất bản cho AI'}</button><button className="button secondary" type="button" disabled={busy||!form.title.trim()||!form.body.trim()} onClick={()=>void save(false)}>{editing? 'Lưu nháp / thu hồi':'Lưu nháp'}</button></div>
   {editing&&<button type="button" className="button secondary" onClick={()=>void retry()} disabled={busy}>Cập nhật lại chỉ mục AI</button>}
   {error&&<p className="live-error" role="alert">{error}</p>}{notice&&<p className="integration-message" role="status">{notice}</p>}
  </form>:<section className="lvd-knowledge-empty"><h2>Kiến thức từ bài viết</h2><p>Xuất bản bài viết và bật “Cho phép dùng cho AI”. Hệ thống tự đồng bộ các thay đổi.</p>{articles.length>0&&<p className="live-form-note">Chọn nguồn đã nhập bên trái để chỉnh sửa nguồn cũ.</p>}{error&&<p className="live-error" role="alert">{error}</p>}</section>}</div>
  {gaps.length>0&&<section className="lvd-knowledge-gaps"><h2>Câu hỏi cần bổ sung kiến thức</h2><p>Xem câu hỏi trong hộp thư, sau đó viết bài công khai riêng. Không sao chép hồ sơ cá nhân vào kho kiến thức.</p>{gaps.map(item=><a key={item.id} href={'/admin/inbox?conversation='+encodeURIComponent(item.id)}>{item.title}</a>)}</section>}
 </div>;
}
