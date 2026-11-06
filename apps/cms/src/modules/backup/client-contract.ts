export type BackupStatus={authorized:boolean;drive:{enabled:boolean};runtime?:{ready:boolean|null}|null;jobs:{id:string;kind:string;state:string;message?:string|null;created_at:string}[];snapshots:{id:string;created_at:string;bytes:number|string;restore_tested_at?:string|null}[]};
const record=(value:unknown):value is Record<string,any>=>Boolean(value)&&typeof value==='object'&&!Array.isArray(value);
const uuid=(value:unknown)=>typeof value==='string'&&/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i.test(value);
const date=(value:unknown)=>typeof value==='string'&&Boolean(value)&&Number.isFinite(Date.parse(value));
export function readBackupStatus(value:unknown):BackupStatus{
 if(!record(value)||typeof value.authorized!=='boolean'||!record(value.drive)||typeof value.drive.enabled!=='boolean'||(value.runtime!=null&&(!record(value.runtime)||![true,false,null].includes(value.runtime.ready)))||!Array.isArray(value.jobs)||!Array.isArray(value.snapshots)||value.jobs.some((job:unknown)=>!record(job)||!uuid(job.id)||!['backup','restore-test'].includes(job.kind)||!['queued','running','complete','failed'].includes(job.state)||!date(job.created_at)||(job.message!=null&&typeof job.message!=='string'))||value.snapshots.some((snapshot:unknown)=>!record(snapshot)||!uuid(snapshot.id)||!date(snapshot.created_at)||!['string','number'].includes(typeof snapshot.bytes)||(typeof snapshot.bytes==='string'&&!/^\d+$/.test(snapshot.bytes))||!Number.isSafeInteger(Number(snapshot.bytes))||Number(snapshot.bytes)<0||(snapshot.restore_tested_at!=null&&!date(snapshot.restore_tested_at))))throw new Error('Chưa tải được trạng thái sao lưu.');
 return value as BackupStatus;
}
export function readBackupReceipt(value:unknown):{id:string;message:string}{
 if(!record(value)||!uuid(value.id)||typeof value.message!=='string'||!value.message.trim())throw new Error('Chưa xác nhận tác vụ. Làm mới trạng thái trước khi thử lại.');
 return {id:value.id,message:value.message};
}
