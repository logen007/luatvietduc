import {MAX_IMPORT_ROWS} from './article-csv';
export type ImportPreviewRow={row:number;title:string;slug:string;status:'draft'|'published';action:'create'|'skip'|'error';errors:string[]};
export type ImportReceipt={created:{id:number;title:string}[];skipped:number};
const record=(value:unknown):value is Record<string,unknown>=>Boolean(value)&&typeof value==='object'&&!Array.isArray(value);
export function importPreview(value:unknown):ImportPreviewRow[]{
 const rows=record(value)?value.rows:null;
 if(!Array.isArray(rows)||!rows.length||rows.length>MAX_IMPORT_ROWS||!rows.every(row=>record(row)&&Number.isSafeInteger(row.row)&&Number(row.row)>=2&&typeof row.title==='string'&&typeof row.slug==='string'&&['draft','published'].includes(String(row.status))&&['create','skip','error'].includes(String(row.action))&&Array.isArray(row.errors)&&row.errors.every(error=>typeof error==='string')))
  throw new Error('Chưa đọc được kết quả kiểm tra. Kiểm tra tệp lại.');
 return rows as ImportPreviewRow[];
}
export function importReceipt(value:unknown,expectedRows:number):ImportReceipt{
 if(!Number.isSafeInteger(expectedRows)||expectedRows<1||expectedRows>MAX_IMPORT_ROWS||!record(value)||!Array.isArray(value.created)||!Number.isSafeInteger(value.skipped)||Number(value.skipped)<0||value.created.length+Number(value.skipped)!==expectedRows||!value.created.every(doc=>record(doc)&&Number.isSafeInteger(doc.id)&&Number(doc.id)>0&&typeof doc.title==='string'))
  throw new Error('Chưa xác nhận được kết quả nhập. Kiểm tra danh sách bài viết trước khi thử lại.');
 return value as ImportReceipt;
}
