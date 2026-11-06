import {permalink} from '../taxonomy/slug';
export const CSV_COLUMNS=['title','slug','body','categories','tags','language','kind','status','ai_allowed','source_url','jurisdiction'] as const;
export const MAX_IMPORT_ROWS=200,MAX_CSV_BYTES=2*1024*1024;
export function parseCSV(text:string):string[][]{
 if(new TextEncoder().encode(text).length>MAX_CSV_BYTES)throw new Error('Tệp vượt quá 2 MB.');
 text=text.replace(/^\uFEFF/,'');
 const first=text.split(/\r?\n/,1)[0],delimiter=first.includes(';')&&!first.includes(',')?';':',';
 const rows:string[][]=[];let row:string[]=[],cell='',quoted=false,closed=false;
 const add=()=>{if(row.length>=CSV_COLUMNS.length)throw new Error('CSV có quá nhiều cột. Hãy dùng file mẫu.');row.push(cell);cell='';closed=false;};
 const end=()=>{add();if(row.some(value=>value.trim()))rows.push(row);row=[];if(rows.length>MAX_IMPORT_ROWS+1)throw new Error('Mỗi lần nhập tối đa 200 bài.');};
 for(let i=0;i<text.length;i++){
  const c=text[i];
  if(quoted){if(c==='"'){if(text[i+1]==='"'){cell+='"';i++;}else{quoted=false;closed=true;}}else cell+=c;continue;}
  if(c==='"'){if(cell||closed)throw new Error('Dấu ngoặc kép trong CSV không hợp lệ.');quoted=true;}
  else if(c===delimiter)add();
  else if(c==='\n'||c==='\r'){if(c==='\r'&&text[i+1]==='\n')i++;end();}
  else{if(closed)throw new Error('Có ký tự thừa sau dấu ngoặc kép.');cell+=c;}
 }
 if(quoted)throw new Error('CSV thiếu dấu ngoặc kép đóng.');
 if(cell||row.length||closed)end();return rows;
}
export function encodeCSV(rows:unknown[][]){return '\uFEFF'+rows.map(row=>row.map(value=>{const v=String(value??'');return '"'+v.replace(/"/g,'""')+'"';}).join(',')).join('\r\n')+'\r\n';}
export type ImportRow={row:number;title:string;slug:string;body:string;categories:string[];tags:string[];language:'vi'|'de';kind:'article'|'news'|'question';status:'draft'|'published';aiAllowed:boolean;sourceUrl:string;jurisdiction:'VN'|'DE'|'BOTH';errors:string[]};
export function readArticleCSV(csv:string):ImportRow[]{
 const [header,...lines]=parseCSV(csv);if(!header||!lines.length)throw new Error('Tệp chưa có bài viết.');
 const names=header.map(value=>value.trim().toLowerCase());
 if(names.some((n,i)=>!CSV_COLUMNS.includes(n as typeof CSV_COLUMNS[number])||names.indexOf(n)!==i))throw new Error('Tên cột không hợp lệ hoặc bị trùng. Hãy dùng file mẫu.');
 if(!names.includes('title')||!names.includes('body'))throw new Error('Cần hai cột title và body.');
 const seen=new Set<string>();
 return lines.map((line,index)=>{
  const data=Object.fromEntries(names.map((name,i)=>[name,(line[i]||'').trim()])),errors:string[]=[];
  if(line.some(cell=>cell.includes('\u0000')))errors.push('Nội dung chứa ký tự không hợp lệ.');
  if(line.length!==names.length)errors.push('Số cột không khớp.');
  const title=data.title||'',body=data.body||'',slug=permalink(data.slug||title);
  if(!title||title.length>240)errors.push('Tiêu đề cần từ 1 đến 240 ký tự.');
  if(!body||body.length>16000)errors.push('Nội dung cần từ 1 đến 16.000 ký tự.');
  if(!slug||slug.length>240)errors.push('Permalink không hợp lệ.');
  if(seen.has(slug))errors.push('Permalink trùng trong tệp.');seen.add(slug);
  const language=data.language||'vi',kind=data.kind||'article',status=data.status||'draft',jurisdiction=data.jurisdiction||'BOTH',ai=data.ai_allowed||'false';
  if(!['vi','de'].includes(language))errors.push('language phải là vi hoặc de.');
  if(!['article','news','question'].includes(kind))errors.push('kind phải là article, news hoặc question.');
  if(!['draft','published'].includes(status))errors.push('status phải là draft hoặc published.');
  if(!['VN','DE','BOTH'].includes(jurisdiction))errors.push('jurisdiction phải là VN, DE hoặc BOTH.');
  if(!['true','false','1','0'].includes(ai))errors.push('ai_allowed phải là true hoặc false.');
  if(data.source_url){try{const url=new URL(data.source_url);if(url.protocol!=='https:'||url.username||url.password)throw 0;}catch{errors.push('source_url phải là địa chỉ HTTPS.');}}
  const split=(s:string)=>{const values=[...new Set((s||'').split('|').map(v=>v.trim()).filter(Boolean))];if(values.length>50)errors.push('Mỗi bài tối đa 50 danh mục hoặc tag.');return values.slice(0,50);};
  const categories=split(data.categories),tags=split(data.tags);
  return {row:index+2,title,body,slug,categories,tags,language,kind,status,aiAllowed:['true','1'].includes(ai),sourceUrl:data.source_url||'',jurisdiction,errors} as ImportRow;
 });
}
