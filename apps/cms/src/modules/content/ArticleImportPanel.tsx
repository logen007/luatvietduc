'use client';
import {useEffect,useRef,useState} from 'react';
import {usePublicSession,isPublicSessionCurrent} from '../shared/session-client';
import {api} from '../shared/client-api';
import {MAX_CSV_BYTES} from './article-csv';
type Row={row:number;title:string;slug:string;status:string;action:string;errors:string[];bodyPreview:string};
export function ArticleImportPanel(){
 const session=usePublicSession(),generation=useRef(0);
 const [dataRevision,setDataRevision]=useState(session.revision);
 const [csv,setCSV]=useState(''),[filename,setFilename]=useState(''),[rows,setRows]=useState<Row[]>([]),[busy,setBusy]=useState(''),[error,setError]=useState(''),[result,setResult]=useState<{created:{id:number;title:string}[];skipped:number}|null>(null);
 useEffect(()=>{generation.current++;setCSV('');setFilename('');setRows([]);setResult(null);setError('');setBusy('');setDataRevision(session.revision);},[session.revision]);
 if(session.status!=='ready'||dataRevision!==session.revision)return <p role="status">Đang kiểm tra phiên…</p>;
 if(!['owner','support'].includes(session.user?.role||''))return <p role="alert">Tài khoản không có quyền nhập bài viết.</p>;
 const errors=rows.filter(row=>row.errors.length),newRows=rows.filter(row=>row.action==='create');
 async function choose(file?:File){
  const revision=session.revision,current=++generation.current;setRows([]);setResult(null);setError('');setCSV('');setFilename(file?.name||'');if(!file)return;
  if(!/\.csv$/i.test(file.name)){setError('Chọn tệp .csv.');return;}
  if(file.size>MAX_CSV_BYTES){setError('Tệp vượt quá 2 MB.');return;}
  setBusy('read');try{const bytes=await file.arrayBuffer(),text=new TextDecoder('utf-8',{fatal:true}).decode(bytes);if(current===generation.current&&isPublicSessionCurrent(revision))setCSV(text);}catch{if(current===generation.current)setError('Không đọc được tệp. Hãy lưu lại dưới dạng CSV UTF-8.');}finally{if(current===generation.current)setBusy('');}
 }
 async function run(action:'preview'|'import'){
  if(busy||!csv)return;const revision=session.revision,current=generation.current;setBusy(action);setError('');
  try{const data=await api<any>('article-import',{action,csv});if(current!==generation.current||!isPublicSessionCurrent(revision))return;if(action==='preview'){setRows(data.rows);setResult(null);}else{setResult(data);setRows([]);}}
  catch(e){if(current===generation.current&&isPublicSessionCurrent(revision))setError(e instanceof Error?e.message:'Chưa nhập được bài. Thử lại.');}finally{if(current===generation.current)setBusy('');}
 }
 return <section className="lvd-csv-import">
  <div className="lvd-csv-toolbar"><a className="lvd-csv-button" href="/service/article-import" download>Tải CSV mẫu</a><span>Tối đa 200 bài · 2 MB · UTF-8</span></div>
  <p>File mẫu gồm toàn bộ danh mục và tag hiện có. Bài trùng permalink được bỏ qua; nội dung cũ được giữ nguyên.</p>
  <label className="lvd-csv-upload">Chọn CSV<input key={session.revision} type="file" accept=".csv,text/csv" disabled={Boolean(busy)} onChange={event=>void choose(event.target.files?.[0])}/></label>
  {filename&&<p>{filename}</p>}
  <details><summary>Cách điền file</summary><ul><li><strong>title, body</strong>: tiêu đề và nội dung bắt buộc. Nội dung có thể xuống dòng trong cùng ô CSV.</li><li><strong>slug</strong>: để trống để tạo từ tiêu đề.</li><li><strong>categories, tags</strong>: dùng permalink hoặc tên đang có; ngăn cách nhiều giá trị bằng dấu |. Giữ nguyên slug danh mục trong file mẫu.</li><li><strong>language</strong>: vi hoặc de. <strong>kind</strong>: article, news hoặc question.</li><li><strong>status</strong>: draft (nháp, mặc định) hoặc published (xuất bản).</li><li><strong>ai_allowed</strong>: true hoặc false (mặc định). Chỉ bài đã xuất bản, được duyệt mới vào kho trả lời.</li><li><strong>source_url</strong>: nguồn HTTPS, không bắt buộc. <strong>jurisdiction</strong>: VN, DE hoặc BOTH.</li></ul></details>
  <div className="lvd-csv-toolbar"><button className="lvd-csv-button" disabled={!csv||Boolean(busy)} onClick={()=>void run('preview')}>{busy==='preview'?'Đang kiểm tra…':'Kiểm tra tệp'}</button>{rows.length>0&&<button className="lvd-csv-button is-primary" disabled={Boolean(busy)||errors.length>0||!newRows.length} onClick={()=>void run('import')}>{busy==='import'?'Đang nhập…':`Nhập ${newRows.length} bài`}</button>}</div>
  {busy&&<progress aria-label={busy==='import'?'Đang nhập bài viết':'Đang đọc và kiểm tra tệp'}/>}
  {error&&<p role="alert">{error}</p>}
  {rows.length>0&&<><p>{newRows.length} bài mới · {rows.filter(r=>r.action==='skip').length} bài trùng · {errors.length} dòng lỗi</p><div className="lvd-csv-table"><table><thead><tr><th>Dòng</th><th>Tiêu đề</th><th>Trạng thái</th><th>Kết quả</th></tr></thead><tbody>{rows.map(row=><tr key={row.row}><td>{row.row}</td><td>{row.title}<small>{row.slug}</small></td><td>{row.status==='published'?'Xuất bản':'Bản nháp'}</td><td>{row.errors.length?row.errors.join(' '):row.action==='skip'?'Bỏ qua: đã có permalink':'Sẵn sàng'}</td></tr>)}</tbody></table></div></>}
  {result&&<div role="status"><p>Đã nhập {result.created.length} bài. Bỏ qua {result.skipped} bài trùng.</p><a href="/admin/collections/articles">Xem bài viết →</a></div>}
 </section>;
}
