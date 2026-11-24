import {expireLowPriorityConversations} from '../chat/qualification';
import {processNextAnswer} from './queue';
const runtime=globalThis as typeof globalThis&{lvdAnswerWorker?:boolean};
export function startAnswerWorker(){
 if(runtime.lvdAnswerWorker)return;
 runtime.lvdAnswerWorker=true;
 console.info('Answer worker started');
 const clean=async()=>{
  try{await expireLowPriorityConversations();}catch{console.error('Conversation cleanup temporarily unavailable');}
  setTimeout(clean,30000).unref();
 };
 setTimeout(clean,30000).unref();
 // Two bounded consumers. Database leases coordinate multiple processes and
 // survive a restart. Provider calls never run in the customer's POST request.
 for(let consumer=0;consumer<2;consumer++){
  const tick=async()=>{
   let processed=false;
   try{processed=await processNextAnswer();}catch{console.error('Answer worker temporarily unavailable');}
   setTimeout(tick,processed?50:1000).unref();
  };
  setTimeout(tick,1000+consumer*100).unref();
 }
}
