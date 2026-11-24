import type {Conversation,TransitionReceipt} from './contracts';
import {canEnterAdmin} from '../identity/permissions';

// Apply only an acknowledged write. A subsequent read can fail independently;
// it must not undo this state or retain private data after returning a thread.
export function applyTransitionReceipt(conversation:Conversation,receipt:TransitionReceipt,action:string,staff?:{id:number;role:string}):Conversation{
 const assignedTo=action==='claim'?staff?.id:receipt.state==='queued'?null:conversation.assignedTo;
 if(conversation.restricted||(staff&&!canEnterAdmin(staff)&&receipt.state==='queued'))return {
  id:conversation.id,title:'Yêu cầu chờ tiếp nhận',jurisdiction:conversation.jurisdiction,
  ...receipt,assignedTo,restricted:true,registered:conversation.registered,createdAt:conversation.createdAt,aiEnabled:false,
 };
 return {...conversation,...receipt,assignedTo,aiEnabled:false,aiStartedAt:null,aiMessageId:null,...(assignedTo==null?{assignedName:null}:{})};
}
