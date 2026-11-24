import {invalidatePublicSession} from '../shared/session-client';
import {integrationCatalog,isProvider,type Values,type Provider} from './catalog';
// Refresh public fields without losing an edited value or accepting a secret
// from the response. Secret inputs belong only to the current component draft.
export function mergeConnectionDraft(original:Values,draft:Values,fresh:Values,fields:readonly {key:string;secret:boolean}[]):Values{
 const values:Values={};
 for(const field of fields){
  const entered=draft[field.key]||'';
  if(field.secret){if(entered)values[field.key]=entered;}
  else values[field.key]=entered!==(original[field.key]||'')?entered:fresh[field.key]||'';
 }
 return values;
}
export class ConnectionError extends Error{
 constructor(message:string,readonly status=0){super(message);this.name='ConnectionError';}
}
const record=(value:unknown):value is Record<string,unknown>=>Boolean(value)&&typeof value==='object'&&!Array.isArray(value);
type PublicConnection={provider:Provider;values:Values;stored:Record<string,boolean>;version:number;enabled:boolean;checkState:string;checkedAt:string|null;source?:'admin'|'environment'};
function publicConnection(value:unknown):value is PublicConnection{
 if(!record(value)||!isProvider(value.provider)||!record(value.values)||!record(value.stored))return false;
 const fields=integrationCatalog[value.provider].fields,values=value.values,stored=value.stored;
 const publicFields=fields.filter(field=>!field.secret).map(field=>field.key as string),secretFields=fields.filter(field=>field.secret).map(field=>field.key as string);
 return Object.keys(value).every(key=>['provider','values','stored','version','enabled','checkState','checkedAt','source'].includes(key))
  &&publicFields.every(key=>typeof values[key]==='string')&&Object.keys(values).every(key=>publicFields.includes(key))
  &&secretFields.every(key=>typeof stored[key]==='boolean')&&Object.keys(stored).every(key=>secretFields.includes(key))
  &&Number.isSafeInteger(value.version)&&Number(value.version)>=0&&typeof value.enabled==='boolean'
  &&typeof value.checkState==='string'&&['untested','passed','failed','configured'].includes(value.checkState)
  &&(value.checkedAt===null||typeof value.checkedAt==='string'&&Number.isFinite(Date.parse(value.checkedAt)))
  &&(value.source===undefined||value.source==='admin'||value.source==='environment');
}
export function requestConnection():Promise<{connections:PublicConnection[]}>;
export function requestConnection(data:unknown):Promise<{connection:PublicConnection;message?:string}>;
export async function requestConnection(data?:unknown){
 let response:Response;
 try{response=await fetch('/service/integrations',{method:data?'POST':'GET',cache:'no-store',signal:AbortSignal.timeout(data?45000:15000),headers:data?{'content-type':'application/json'}:undefined,body:data?JSON.stringify(data):undefined});}
 catch{throw new ConnectionError(data?'Chưa xác nhận được kết quả. Tải lại trang để kiểm tra cấu hình trước khi thử lại.':'Chưa kết nối được. Kiểm tra mạng rồi thử lại.');}
 const body=await response.json().catch(()=>null);
 if(!response.ok){if(typeof window!=='undefined'&&[401,403].includes(response.status))invalidatePublicSession();throw new ConnectionError(response.status===401?'Phiên đăng nhập đã hết. Đăng nhập lại để tiếp tục.':response.status===403?'Tài khoản chưa có quyền quản lý kết nối.':body?.error||'Dịch vụ đang gián đoạn. Vui lòng thử lại.',response.status);}
 const validList=record(body)&&Array.isArray(body.connections)&&body.connections.every(publicConnection)&&new Set(body.connections.map(item=>item.provider)).size===body.connections.length;
 const validWrite=record(body)&&publicConnection(body.connection)&&(!record(data)||data.provider===undefined||body.connection.provider===data.provider)&&(body.message===undefined||typeof body.message==='string');
 if(data?!validWrite:!validList)throw new ConnectionError(data?'Chưa xác nhận được kết quả. Tải lại trang để kiểm tra cấu hình trước khi thử lại.':'Chưa đọc được cấu hình. Vui lòng thử lại.');
 return body as {connections:PublicConnection[];connection:PublicConnection;message?:string};
}
