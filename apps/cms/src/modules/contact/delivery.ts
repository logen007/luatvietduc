import type {Values} from '../integrations/catalog';
import {validateValues} from '../integrations/validation';
import type {Contact} from './input';
export function contactEmail(contact:Contact,connection:Values,recipient:string){
 validateValues('email',connection);
 if(!/^[^\s<>@,;]+@[^\s<>@,;]+\.[^\s<>@,;]+$/.test(recipient))throw new Error('Contact recipient unavailable');
 return {from:`${connection.fromName} <${connection.fromAddress}>`,to:[recipient],reply_to:contact.email,subject:'[Liên hệ] '+contact.subject,text:`Họ tên: ${contact.name}\nEmail phản hồi: ${contact.email}\n\n${contact.message}`};
}
export async function deliverContact(contact:Contact,connection:Values,recipient:string,request:typeof fetch=fetch){
 const response=await request('https://api.resend.com/emails',{
  method:'POST',headers:{Authorization:'Bearer '+connection.apiKey,'content-type':'application/json','Idempotency-Key':'contact/'+contact.key},
  body:JSON.stringify(contactEmail(contact,connection,recipient)),redirect:'error',signal:AbortSignal.timeout(10000),
 });
 if(!response.ok)throw new Error('Contact provider unavailable');
 const result=await response.json();if(typeof result?.id!=='string'||!result.id)throw new Error('Contact not accepted');
 return {ok:true};
}
