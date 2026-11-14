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

export function mediaEditable(doc:{uploadedBy?:unknown},user?:{id?:unknown;role?:string}|null){
 const uploader=doc.uploadedBy&&typeof doc.uploadedBy==='object'?(doc.uploadedBy as {id?:unknown}).id:doc.uploadedBy;
 return user?.role==='owner'||Boolean(user?.role==='support'&&user.id!=null&&uploader!=null&&String(uploader)===String(user.id));
}

// List responses may omit virtual URL fields. Native file routes still enforce
// the same collection ACL for both originals and generated thumbnails.
export function mediaPreviewURL(doc:{filename?:string;url?:string;thumbnailURL?:string;sizes?:Record<string,{url?:string;filename?:string}|null>}){
 const direct=mediaURL(doc.thumbnailURL||doc.sizes?.thumbnail?.url||doc.url||bundledFile(doc.filename)?.url);
 if(direct)return direct;
 const filename=doc.sizes?.thumbnail?.filename||doc.filename;
 return filename&&!/[\\/]/.test(filename)?'/api/media/file/'+encodeURIComponent(filename):'';
}
