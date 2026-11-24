'use client';
export type ConfirmOptions={title:string;message:string;confirmLabel?:string;cancelLabel?:string;danger?:boolean};
let opened=false;
// Shared by React and imperative navigation guards, in either application root.
export function confirmAction(options:ConfirmOptions):Promise<boolean>{
 if(typeof document==='undefined'||opened)return Promise.resolve(false);
 opened=true;
 return new Promise(resolve=>{
  const previous=document.activeElement,dialog=document.createElement('dialog'),german=document.documentElement.lang.startsWith('de');
  dialog.className='lvd-confirm-dialog'+(document.querySelector('.lvd-chat')?' is-dark':'');dialog.setAttribute('aria-labelledby','lvd-confirm-title');dialog.setAttribute('aria-describedby','lvd-confirm-description');
  const heading=document.createElement('h2');heading.id='lvd-confirm-title';heading.textContent=options.title;
  const description=document.createElement('p');description.id='lvd-confirm-description';description.textContent=options.message;
  const close=document.createElement('button');close.type='button';close.className='lvd-confirm-close';close.textContent='×';close.setAttribute('aria-label',german?'Schließen':'Đóng');
  const actions=document.createElement('div');actions.className='lvd-confirm-actions';
  const cancel=document.createElement('button');cancel.type='button';cancel.textContent=options.cancelLabel||(german?'Abbrechen':'Hủy');
  const accept=document.createElement('button');accept.type='button';accept.className=options.danger?'is-danger':'is-primary';accept.textContent=options.confirmLabel||(german?'Bestätigen':'Xác nhận');
  actions.append(cancel,accept);dialog.append(close,heading,description,actions);
  let settled=false;
  const finish=(accepted:boolean)=>{
   if(settled)return;settled=true;
   window.removeEventListener('pagehide',cancelAction);window.removeEventListener('popstate',cancelAction);
   if(dialog.open)dialog.close();dialog.remove();opened=false;
   if(previous instanceof HTMLElement&&previous.isConnected)previous.focus({preventScroll:true});
   resolve(accepted);
  };
  const cancelAction=()=>finish(false);
  cancel.addEventListener('click',cancelAction);close.addEventListener('click',cancelAction);accept.addEventListener('click',()=>finish(true));
  dialog.addEventListener('cancel',event=>{event.preventDefault();finish(false);});dialog.addEventListener('close',cancelAction);
  dialog.addEventListener('click',event=>{if(event.target!==dialog)return;const rect=dialog.getBoundingClientRect();if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)finish(false);});
  window.addEventListener('pagehide',cancelAction);window.addEventListener('popstate',cancelAction);
  document.body.append(dialog);
  try{dialog.showModal();cancel.focus({preventScroll:true});}catch{finish(false);}
 });
}
