type MediaReceipt={id:number;filename:string;updatedAt?:string;[key:string]:unknown};
export function mediaReceipt(value:unknown,expectedId?:number):MediaReceipt{
 const wrapper=value as {doc?:unknown}|null,doc=(wrapper?.doc??value) as MediaReceipt|null;
 if(!doc||typeof doc!=='object'||Array.isArray(doc)||!Number.isSafeInteger(doc.id)||doc.id<1||typeof doc.filename!=='string'||!doc.filename.trim()||(expectedId!==undefined&&(doc.id!==expectedId||typeof doc.updatedAt!=='string'||!Number.isFinite(Date.parse(doc.updatedAt)))))throw new Error('Chưa xác nhận được tệp đã lưu. Tải lại thư viện để kiểm tra.');
 return doc;
}

// A successful HTTP status alone is not an upload receipt. This transport
// never retries an ambiguous write and stops when its owning view is closed.
export function uploadMediaFile(file:File,signal:AbortSignal,onProgress:(value:number)=>void,createRequest=()=>new XMLHttpRequest()):Promise<MediaReceipt>{
 return new Promise((resolve,reject)=>{
  if(signal.aborted){reject(new Error('Đã dừng tải tệp.'));return;}
  const xhr=createRequest();let settled=false;
  const abort=()=>xhr.abort();
  const finish=(error?:Error,doc?:MediaReceipt)=>{
   if(settled)return;settled=true;signal.removeEventListener('abort',abort);
   xhr.onload=xhr.onerror=xhr.ontimeout=xhr.onabort=null;xhr.upload.onprogress=null;
   if(error)reject(error);else resolve(doc!);
  };
  try{
   xhr.open('POST','/api/media');xhr.timeout=90000;xhr.responseType='json';
   xhr.upload.onprogress=event=>{if(!settled&&event.lengthComputable&&event.total>0)onProgress(Math.min(99,Math.round(event.loaded/event.total*100)));};
   xhr.onload=()=>{
    if(xhr.status<200||xhr.status>=300){finish(new Error(xhr.response?.errors?.[0]?.message||'Chưa tải được tệp.'));return;}
    try{finish(undefined,mediaReceipt(xhr.response));}catch(error){finish(error as Error);}
   };
   xhr.onerror=xhr.ontimeout=()=>finish(new Error('Chưa xác nhận tải xong. Kiểm tra thư viện trước khi thử lại.'));
   xhr.onabort=()=>finish(new Error('Đã dừng tải tệp.'));
   signal.addEventListener('abort',abort,{once:true});
   const form=new FormData();form.append('file',file);form.append('_payload',JSON.stringify({title:file.name.replace(/\.[^.]+$/,''),alt:''}));xhr.send(form);
  }catch(error){finish(error instanceof Error?error:new Error('Chưa tải được tệp.'));}
 });
}
