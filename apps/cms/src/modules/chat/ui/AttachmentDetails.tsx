export function AttachmentDetails({name,size}:{name:string;size:number}){
 const extension=name.split('.').pop()?.toUpperCase()||'';
 const type=/^[A-Z0-9]{1,6}$/.test(extension)&&name.includes('.')?extension:'FILE';
 const image=['PNG','JPG','JPEG','WEBP'].includes(type);
 const amount=size<1024*1024?`${Math.max(1,Math.ceil(size/1024))} KB`:`${(size/1024/1024).toFixed(1)} MB`;
 return <><span className={'chat-file-icon '+(type==='PDF'?'is-pdf':image?'is-image':'')} aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">{image?<><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8" cy="8" r="1.5"/><path d="m3 17 5-5 4 4 3-3 6 6"/></>:<><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6M8 13h8M8 17h5"/></>}</svg></span><span className="chat-file-details"><strong title={name}>{name}</strong><small>{type} · {amount}</small></span></>;
}
