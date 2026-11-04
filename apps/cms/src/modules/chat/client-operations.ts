import type {Message} from './contracts';

// React state disables controls on the next render. This lock also covers two
// events arriving before that render, and cannot be released by an older task.
export function createOperationGate(){
 let active:symbol|null=null;
 return {
  begin(){if(active)return null;return active=Symbol();},
  isCurrent(ticket:symbol){return active===ticket;},
  end(ticket:symbol){if(active!==ticket)return false;active=null;return true;},
  busy(){return active!==null;},
  reset(){active=null;},
 };
}

type Draft={body:string;internal:boolean;fileIds:string[]};
export type MessageReceipt={id:string|number;role:'user'|'staff';duplicate?:boolean};
type Delivery={receipt:MessageReceipt;key:string};
type Attempt={conversation:string;draft:Draft;key:string;task:Promise<Delivery>|null};

// Only the save response confirms delivery. A failed save keeps its key for an
// idempotent retry; subsequent transcript/list reads do not belong to this state.
export function createMessageOutbox(
 request:(conversation:string,draft:Draft&{key:string})=>Promise<MessageReceipt>,
 newKey=()=>crypto.randomUUID() as string,
){
 let pending:Attempt|null=null;
 function send(conversation:string,draft:Draft):Promise<Delivery>{
  if(!pending||pending.conversation!==conversation||pending.draft.body!==draft.body||pending.draft.internal!==draft.internal||JSON.stringify(pending.draft.fileIds)!==JSON.stringify(draft.fileIds)){
   pending={conversation,draft:{...draft,fileIds:[...draft.fileIds]},key:newKey(),task:null};
  }
  const attempt=pending;
  if(attempt.task)return attempt.task;
  attempt.task=Promise.resolve().then(()=>request(conversation,{...attempt.draft,key:attempt.key})).then(receipt=>{
   if(!receipt||! /^[1-9]\d*$/.test(String(receipt.id))||!['user','staff'].includes(receipt.role))throw new Error('Không thể đọc phản hồi của dịch vụ. Vui lòng thử lại.');
   if(pending===attempt)pending=null;
   return {receipt,key:attempt.key};
  }).finally(()=>{attempt.task=null;});
  return attempt.task;
 }
 return {send,reset(){pending=null;},pendingKey:()=>pending?.key};
}

export function validateAttachmentBatch(files:Pick<File,'name'|'size'>[],existingCount:number){
 if(files.length+existingCount>4)throw new Error('Mỗi tin nhắn tối đa 4 tệp.');
 for(const file of files){
  if(file.size>10*1024*1024)throw new Error('Mỗi tệp tối đa 10 MB.');
  if(!file.size||! /\.(pdf|docx|txt|png|jpe?g|webp)$/i.test(file.name))throw new Error('Chọn PDF, DOCX, TXT hoặc ảnh; tối đa 10 MB/tệp.');
 }
}

// Merge overlapping transcript pages in one pass before sorting. Server values
// replace an acknowledged local message when its canonical timestamp arrives.
export function mergeMessages(previous:Message[],incoming:Message[]):Message[]{
 if(!incoming.length)return previous;
 const byId=new Map(previous.map(message=>[String(message.id),message]));
 for(const message of incoming)byId.set(String(message.id),message);
 return [...byId.values()].sort((left,right)=>{const a=BigInt(left.id),b=BigInt(right.id);return a<b?-1:a>b?1:0;});
}
