import type {User} from '../../payload-types';
import {HttpError} from '../chat/service';
export function knowledgeArticleInput(input:any,user:User,original?:any){
 if(!['owner','knowledge','support','reviewer'].includes(user.role))throw new HttpError(403,'Tài khoản chưa có quyền nạp kiến thức.');
 const title=typeof input.title==='string'?input.title.trim():'',body=typeof input.body==='string'?input.body.trim():'';
 if(!title||title.length>240||!body||body.length>16000)throw new HttpError(400,'Nhập tiêu đề và nội dung bài viết (tối đa 16.000 ký tự).');
 const countries=(user.jurisdictions||[]).filter(x=>['VN','DE'].includes(x));
 const jurisdiction=input.jurisdiction||(countries.length===1?countries[0]:original?.jurisdiction);
 if(!['VN','DE'].includes(jurisdiction)||(user.role!=='owner'&&!countries.includes(jurisdiction)))throw new HttpError(403,'Chọn quốc gia trong phạm vi được giao.');
 let sourceUrl=typeof input.sourceUrl==='string'?input.sourceUrl.trim():'';
 if(!sourceUrl)sourceUrl=original?.sourceUrl||(process.env.APP_URL||'https://luatvietduc.com')+'/service/knowledge-source/'+crypto.randomUUID();
 try{const url=new URL(sourceUrl);if(url.protocol!=='https:'||url.username||url.password)throw 0;}catch{throw new HttpError(400,'Nguồn tham khảo cần là liên kết HTTPS.');}
 const now=new Date();
 const date=(value:any,fallback:string)=>{if(!value)return fallback;const parsed=new Date(value);if(!Number.isFinite(parsed.getTime()))throw new HttpError(400,'Ngày rà soát không hợp lệ.');return parsed.toISOString();};
 const aliases=typeof input.questionAliases==='string'?input.questionAliases.trim():'';
 if(aliases.length>4000)throw new HttpError(400,'Phần cách hỏi tương đương quá dài.');
 return {title,body,jurisdiction,sourceUrl,questionAliases:aliases,effectiveFrom:date(input.effectiveFrom,original?.effectiveFrom||now.toISOString()),reviewDueAt:date(input.reviewDueAt,original?.reviewDueAt||new Date(now.getTime()+90*86400000).toISOString()),expiresAt:input.expiresAt?date(input.expiresAt,''):null,_status:input.publish===true?'published' as const:'draft' as const,...(input.publish===true?{approved:true}:{approved:false})};
}
