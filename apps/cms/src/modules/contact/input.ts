import {HttpError} from '../chat/service';
export type Contact={name:string;email:string;subject:string;message:string;key:string};
export function parseContact(value:unknown):Contact{
 if(!value||typeof value!=='object'||Array.isArray(value))throw new HttpError(400,'Vui lòng kiểm tra thông tin liên hệ.');
 const input=value as Record<string,unknown>;
 const text=(key:string,max:number)=>{
  if(typeof input[key]!=='string')throw new HttpError(400,'Vui lòng điền đầy đủ thông tin liên hệ.');
  const result=input[key].trim();
  if(!result||result.length>max||/\0/.test(result))throw new HttpError(400,'Thông tin liên hệ chưa hợp lệ hoặc quá dài.');
  return result;
 };
 const contact={name:text('name',120),email:text('email',254).toLowerCase(),subject:text('subject',160),message:text('message',3000),key:text('key',36)};
 if(/[\r\n\x01-\x1f\x7f]/.test(contact.name+contact.email+contact.subject)||!/^[^\s<>@,;]+@[^\s<>@,;]+\.[^\s<>@,;]+$/.test(contact.email)||!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(contact.key)||Boolean(input.website))throw new HttpError(400,'Vui lòng kiểm tra họ tên, email và tiêu đề.');
 return contact;
}
