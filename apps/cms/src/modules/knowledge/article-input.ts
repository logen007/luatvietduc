import type {User} from '../../payload-types';
import {HttpError} from '../chat/service';
import {knowledgeBody} from './content';
import {canWriteContent} from '../identity/permissions';
export function knowledgeArticleInput(input:any,user:User,original?:any){
 if(!['owner','knowledge','support','reviewer'].includes(user.role))throw new HttpError(403,'Tài khoản chưa có quyền nạp kiến thức.');
 const title=typeof input.title==='string'?input.title.trim():'',raw=typeof input.body==='string'?input.body.trim():'';
 if(!title||title.length>240||!raw||raw.length>16000)throw new HttpError(400,'Nhập tiêu đề và nội dung bài viết (tối đa 16.000 ký tự).');
 const entryType=input.entryType??original?.entryType??'knowledge';
 if(!['knowledge','rule'].includes(entryType))throw new HttpError(400,'Loại nội dung không hợp lệ.');
 const body=knowledgeBody(raw,entryType);
 const countries=(user.jurisdictions||[]).filter(x=>['VN','DE'].includes(x));
 if(!canWriteContent(user)&&!countries.length)throw new HttpError(403,'Tài khoản chưa được giao phạm vi công việc.');
 const jurisdiction='BOTH' as const;
 let sourceUrl=typeof input.sourceUrl==='string'?input.sourceUrl.trim():'';
 if(!sourceUrl)sourceUrl=original?.sourceUrl||(process.env.APP_URL||'https://luatvietduc.com')+'/admin/knowledge#'+crypto.randomUUID();
 try{const url=new URL(sourceUrl);if(url.protocol!=='https:'||url.username||url.password)throw 0;}catch{throw new HttpError(400,'Nguồn tham khảo cần là liên kết HTTPS.');}
 const now=new Date();
 const date=(value:any,fallback:string)=>{if(!value)return fallback;const parsed=new Date(value);if(!Number.isFinite(parsed.getTime()))throw new HttpError(400,'Ngày rà soát không hợp lệ.');return parsed.toISOString();};
 const aliases=typeof input.questionAliases==='string'?input.questionAliases.trim():original?.questionAliases||'';
 if(aliases.length>4000)throw new HttpError(400,'Phần cách hỏi tương đương quá dài.');
 const ids=(value:unknown)=>{if(!Array.isArray(value)||value.length>100)throw new HttpError(400,'Danh mục hoặc tag không hợp lệ.');const result=value.map(item=>typeof item==='object'&&item?item.id:item);if(result.some(id=>!Number.isSafeInteger(id)||id<1))throw new HttpError(400,'Danh mục hoặc tag không hợp lệ.');return [...new Set<number>(result)];};
 return {title,body,entryType,jurisdiction,sourceUrl,questionAliases:aliases,categories:ids(input.categories??original?.categories??[]),tags:ids(input.tags??original?.tags??[]),effectiveFrom:date(input.effectiveFrom,original?.effectiveFrom||now.toISOString()),reviewDueAt:date(input.reviewDueAt,input.publish===true?new Date(now.getTime()+90*86400000).toISOString():original?.reviewDueAt||new Date(now.getTime()+90*86400000).toISOString()),expiresAt:input.expiresAt===undefined?original?.expiresAt||null:input.expiresAt?date(input.expiresAt,''):null,ruleEnabled:entryType==='rule'&&input.publish===true,_status:entryType==='rule'?'draft' as const:input.publish===true?'published' as const:'draft' as const,approved:entryType!=='rule'&&input.publish===true};
}
