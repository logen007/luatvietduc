import type {Attachment} from './contracts';
export type ChatDraft={text:string;attachments:Attachment[]};
type HandoffRetry={key:string;body:string;internal:false;fileIds:string[]};
type HandoffDraft=ChatDraft&{retry?:HandoffRetry};
export function draftOwnerKey(user:{id:number|string;role?:string;jurisdictions?:string[]}|null|undefined){return user?JSON.stringify([String(user.id),user.role||'',...(user.jurisdictions||[]).slice().sort()]):'guest';}
export function draftMatchesDelivery(draft:ChatDraft,body:string,fileIds:string[]){return draft.text.trim()===body&&draft.attachments.length===fileIds.length&&draft.attachments.every((file,index)=>file.id===fileIds[index]);}
const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const empty=():ChatDraft=>({text:'',attachments:[]});
export const handoffKey='lvd-chat-handoff-v1';
const lifetime=15*60*1000;
function copy(draft:ChatDraft):ChatDraft{return {text:draft.text,attachments:draft.attachments.map(file=>({...file}))};}
// Per-workspace memory only; never a transcript cache or a cross-account store.
export function createDraftBook(){
 const drafts=new Map<string,ChatDraft>();
 return {
  save(id:string,draft:ChatDraft){drafts.delete(id);if(draft.text||draft.attachments.length)drafts.set(id,copy(draft));if(drafts.size>50)drafts.delete(drafts.keys().next().value!);},
  get(id:string){return copy(drafts.get(id)||empty());},
  remove(id:string){drafts.delete(id);},
  clear(){drafts.clear();},
 };
}
type Storage=Pick<globalThis.Storage,'getItem'|'setItem'|'removeItem'>;
// Explicit, tab-local account navigation only. Consumption requires the current
// server-owned conversation list; a URL or stored user ID alone proves nothing.
export function saveDraftHandoff(storage:Storage,userId:number|null,conversation:string,draft:ChatDraft,now=Date.now(),retryKey?:string){
 if(!uuid.test(conversation))throw new Error('Chưa xác định được cuộc trò chuyện.');
 const retry=retryKey&&/^[\w-]{16,80}$/.test(retryKey)?{key:retryKey,body:draft.text.trim(),internal:false,fileIds:draft.attachments.map(file=>file.id)}:undefined;
 storage.setItem(handoffKey,JSON.stringify({version:1,userId,conversation,expires:now+lifetime,draft,...(retry?{retry}:{})}));
}
export function takeDraftHandoff(storage:Storage,userId:number|null,ownedIds:string[],requested:string|null,now=Date.now()):HandoffDraft|null{
 try{
  const raw=storage.getItem(handoffKey);storage.removeItem(handoffKey);
  if(!raw||raw.length>100000)return null;
  const item=JSON.parse(raw),draft=item?.draft;
  if(item.version!==1||!uuid.test(item.conversation)||requested!==item.conversation||!ownedIds.includes(item.conversation)||!Number.isFinite(item.expires)||item.expires<=now||item.expires>now+lifetime||(item.userId!==null&&item.userId!==userId))return null;
  if(!draft||typeof draft.text!=='string'||draft.text.length>20000||!Array.isArray(draft.attachments)||draft.attachments.length>4)return null;
  const files:Attachment[]=[];
  for(const file of draft.attachments){
   if(!file||typeof file.id!=='string'||!uuid.test(file.id)||files.some(item=>item.id===file.id)||typeof file.name!=='string'||file.name.length>180||!Number.isSafeInteger(file.size)||file.size<1||file.size>10*1024*1024||typeof file.mimeType!=='string'||file.mimeType.length>100)return null;
   files.push({id:file.id,name:file.name,size:file.size,mimeType:file.mimeType,url:'/service/chat-files/'+file.id});
  }
  const retry=item.retry;
  const validRetry=retry&&typeof retry.key==='string'&&/^[\w-]{16,80}$/.test(retry.key)&&retry.body===draft.text.trim()&&retry.internal===false&&Array.isArray(retry.fileIds)&&retry.fileIds.length===files.length&&retry.fileIds.every((id:unknown,index:number)=>id===files[index].id);
  return {text:draft.text,attachments:files,...(validRetry?{retry:{key:retry.key,body:retry.body,internal:false as const,fileIds:files.map(file=>file.id)}}:{})};
 }catch{return null;}
}
