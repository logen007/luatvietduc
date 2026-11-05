import type {Where} from 'payload';
import {bundledFile} from './bundled';
export type MediaKind=''|'image'|'svg'|'video'|'audio'|'pdf';
export function mediaName(doc:{filename?:unknown;alt?:unknown}){
 return bundledFile(doc.filename)?.name||String(doc.filename||doc.alt||'Tệp');
}
export function mediaReadOnly(doc:{filename?:unknown}){return Boolean(bundledFile(doc.filename));}
export function mediaURL(value:unknown){
 if(typeof value!=='string')return '';
 if(value.startsWith('/')&&!value.startsWith('//'))return value;
 try{const url=new URL(value);return url.protocol==='https:'&&!url.username&&!url.password?value:'';}catch{return '';}
}
export function mediaFilters(where:Where|undefined){
 const mime=where?.mimeType as Record<string,unknown>|undefined,date=where?.createdAt as Record<string,unknown>|undefined;
 const kind:MediaKind=mime?.equals==='image/svg+xml'?'svg':mime?.equals==='application/pdf'?'pdf':mime?.like==='image/%'?'image':mime?.like==='video/%'?'video':mime?.like==='audio/%'?'audio':'';
 const start=date?.greater_than_equal;
 return {kind,month:typeof start==='string'?start.slice(0,7):''};
}
export function mediaWhere(previous:Where|undefined,kind:MediaKind,month:string):Where{
 const where={...previous};delete where.mimeType;delete where.createdAt;
 if(kind)where.mimeType=kind==='svg'?{equals:'image/svg+xml'}:kind==='pdf'?{equals:'application/pdf'}:{like:kind+'/%'};
 if(/^\d{4}-(0[1-9]|1[0-2])$/.test(month)){
  const [year,index]=month.split('-').map(Number),start=new Date(Date.UTC(year,index-1,1)),end=new Date(Date.UTC(year,index,1));
  where.createdAt={greater_than_equal:start.toISOString(),less_than:end.toISOString()};
 }
 return where;
}
