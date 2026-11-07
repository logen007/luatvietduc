'use client';
import {useEffect,useRef,useState} from 'react';
import {usePublicSession,isPublicSessionCurrent} from '../shared/session-client';
import {api} from '../shared/client-api';
import {CSV_COLUMNS,MAX_CSV_BYTES,parseCSV,encodeCSV} from './article-csv';
import {importPreview,importReceipt,type ImportPreviewRow as Row,type ImportReceipt} from './article-import-client';
const labels:Record<string,string>={title:'Tiêu đề',slug:'Permalink',body:'Nội dung',categories:'Danh mục',tags:'Tag',language:'Ngôn ngữ',kind:'Loại bài',status:'Trạng thái',ai_allowed:'AI',source_url:'Nguồn tham khảo',jurisdiction:'Quốc gia'};
const steps=['Chọn tệp CSV','Ghép cột','Đang nhập','Hoàn tất'];
export function ArticleImportPanel(){
 const session=usePublicSession(),generation=useRef(0);
 const [dataRevision,setDataRevision]=useState(session.revision),[step,setStep]=useState(0);
 const [csv,setCSV]=useState(''),[mapped,setMapped]=useState(''),[filename,setFilename]=useState(''),[source,setSource]=useState<string[][]>([]),[mapping,setMapping]=useState<string[]>([]),[rows,setRows]=useState<Row[]>([]),[busy,setBusy]=useState(''),[error,setError]=useState(''),[result,setResult]=useState<ImportReceipt|null>(null);
 useEffect(()=>{generation.current++;setCSV('');setMapped('');setFilename('');setSource([]);setMapping([]);setRows([]);setResult(null);setError('');setBusy('');setStep(0);setDataRevision(session.revision);},[session.revision]);
 if(session.status!=='ready'||dataRevision!==session.revision)return <p role="status">Đang kiểm tra phiên…</p>;
 if(!['owner','support'].includes(session.user?.role||''))return <p role="alert">Tài khoản không có quyền nhập bài viết.</p>;
 const errors=rows.filter(row=>row.errors.length),newRows=rows.filter(row=>row.action==='create');
 async function choose(file?:File){
  const revision=session.revision,current=++generation.current;setRows([]);setMapped('');setResult(null);setError('');setCSV('');setSource([]);setFilename(file?.name||'');if(!file)return;
  if(!/\.csv$/i.test(file.name)){setError('Chọn tệp .csv.');return;}if(file.size>MAX_CSV_BYTES){setError('Tệp vượt quá 2 MB.');return;}
  setBusy('read');try{const bytes=await file.arrayBuffer(),text=new TextDecoder('utf-8',{fatal:true}).decode(bytes);if(current===generation.current&&isPublicSessionCurrent(revision))setCSV(text);}catch{if(current===generation.current)setError('Không đọc được tệp. Hãy lưu lại dưới dạng CSV UTF-8.');}finally{if(current===generation.current)setBusy('');}
 }
 function mapColumns(){
  try{
   const table=parseCSV(csv);if(table.length<2)throw new Error('Tệp chưa có bài viết.');
   if(table.some(row=>row.length!==table[0].length))throw new Error('Số cột giữa các dòng không khớp.');
   const aliases:Record<string,string>={'tiêu đề':'title','nội dung':'body','permalink':'slug','danh mục':'categories','tag':'tags'};
   setSource(table);setMapping(table[0].map(name=>{const key=name.trim().toLowerCase();return CSV_COLUMNS.includes(key as typeof CSV_COLUMNS[number])?key:aliases[key]||'';}));setError('');setStep(1);
  }catch(e){setError(e instanceof Error?e.message:'Không đọc được tệp CSV.');}
 }
 async function run(action:'preview'|'import'){
  if(busy)return;let content=mapped;
  if(action==='preview'){
   const selected=mapping.filter(Boolean);
   if(new Set(selected).size!==selected.length){setError('Mỗi trường chỉ được ghép với một cột CSV.');return;}
   if(!selected.includes('title')||!selected.includes('body')){setError('Hãy ghép đủ Tiêu đề và Nội dung.');return;}
   const indices=mapping.flatMap((name,index)=>name?[index]:[]);content=encodeCSV([indices.map(i=>mapping[i]),...source.slice(1).map(row=>indices.map(i=>row[i]))]);
  }
  if(!content)return;const revision=session.revision,current=generation.current;setBusy(action);setError('');if(action==='import')setStep(2);
  try{const data=await api<unknown>('article-import',{action,csv:content});if(current!==generation.current||!isPublicSessionCurrent(revision))return;if(action==='preview'){const preview=importPreview(data);setMapped(content);setRows(preview);setResult(null);}else{const receipt=importReceipt(data,rows.length);setResult(receipt);setRows([]);setStep(3);}}
  catch(e){if(current===generation.current&&isPublicSessionCurrent(revision)){setError(e instanceof Error?e.message:'Chưa nhập được bài. Thử lại.');if(action==='import')setStep(1);}}finally{if(current===generation.current)setBusy('');}
 }
 return <section className="lvd-csv-import lvd-csv-wizard">
  <ol className="lvd-csv-steps" aria-label="Các bước nhập CSV">{steps.map((label,index)=><li key={label} aria-current={index===step?'step':undefined} className={index<step?'is-complete':''}>{label}</li>)}</ol>
  <div className="lvd-csv-wizard-panel">
  {step===0&&<><h2>Nhập bài viết từ CSV</h2><p>Chọn tệp để nhập tối đa 200 bài. Bài có permalink trùng sẽ được bỏ qua.</p><div className="lvd-csv-file-row"><span>Tệp CSV</span><div><input key={session.revision} type="file" aria-label="Tệp CSV" accept=".csv,text/csv" disabled={Boolean(busy)} onChange={event=>void choose(event.target.files?.[0])}/><small>CSV UTF-8 · Tối đa 2 MB</small></div></div><div className="lvd-csv-toolbar"><button className="lvd-csv-button is-primary" disabled={!csv||Boolean(busy)} onClick={mapColumns}>Tiếp tục</button><a className="lvd-csv-sample" href="/service/article-import" download>CSV mẫu</a></div></>}
  {step===1&&<><h2>Ghép cột CSV với bài viết</h2><p>{filename}</p><div className="lvd-csv-table"><table><thead><tr><th>Cột trong CSV</th><th>Trường bài viết</th></tr></thead><tbody>{source[0]?.map((name,index)=><tr key={index}><td>{name}<small>{source[1]?.[index]?.slice(0,90)}</small></td><td><select aria-label={'Ghép cột '+name} value={mapping[index]||''} disabled={Boolean(busy)} onChange={event=>{const value=event.target.value;setMapping(previous=>previous.map((item,i)=>i===index?value:item));setRows([]);setMapped('');setError('');}}><option value="">Không nhập</option>{CSV_COLUMNS.map(field=><option key={field} value={field}>{labels[field]}</option>)}</select></td></tr>)}</tbody></table></div>
   <div className="lvd-csv-toolbar"><button className="lvd-csv-button" disabled={Boolean(busy)} onClick={()=>{setRows([]);setMapped('');setStep(0);}}>Quay lại</button><button className="lvd-csv-button" disabled={Boolean(busy)} onClick={()=>void run('preview')}>{busy==='preview'?'Đang kiểm tra…':'Kiểm tra tệp'}</button>{rows.length>0&&<button className="lvd-csv-button is-primary" disabled={Boolean(busy)||errors.length>0||!newRows.length} onClick={()=>void run('import')}>Nhập {newRows.length} bài</button>}<a className="lvd-csv-sample" href="/service/article-import" download>CSV mẫu</a></div>
   {rows.length>0&&<><p>{newRows.length} bài mới · {rows.filter(r=>r.action==='skip').length} bài trùng · {errors.length} dòng lỗi</p><div className="lvd-csv-table"><table><thead><tr><th>Dòng</th><th>Tiêu đề</th><th>Trạng thái</th><th>Kết quả</th></tr></thead><tbody>{rows.map(row=><tr key={row.row}><td>{row.row}</td><td>{row.title}<small>{row.slug}</small></td><td>{row.status==='published'?'Xuất bản':'Bản nháp'}</td><td>{row.errors.length?row.errors.join(' '):row.action==='skip'?'Bỏ qua: đã có permalink':'Sẵn sàng'}</td></tr>)}</tbody></table></div></>}
  </>}
  {busy&&<progress aria-label={busy==='import'?'Đang nhập bài viết':'Đang đọc và kiểm tra tệp'}/>}
  {step===2&&<h2>Đang nhập bài viết…</h2>}
  {error&&<p role="alert">{error}</p>}
  {step===3&&result&&<div role="status"><h2>Đã nhập {result.created.length} bài viết</h2>{result.skipped>0&&<p>Bỏ qua {result.skipped} bài trùng permalink.</p>}<a className="lvd-csv-button is-primary" href="/admin/collections/articles">Xem bài viết</a></div>}
  </div>
 </section>;
}
