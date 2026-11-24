import {sanitizeArticleBody,articleText} from '../content/article-body';
import {HttpError} from '../http/errors';

export function knowledgeBody(value:unknown,entryType='knowledge',requireText=true){
 if(typeof value!=='string')throw new HttpError(400,'Nhập nội dung bài viết.');
 const body=sanitizeArticleBody(value),plain=articleText(body).trim();
 if(body.length>16000)throw new HttpError(400,'Nội dung tối đa 16.000 ký tự.');
 if(!body.trim()||(requireText&&!plain))throw new HttpError(400,'Nhập nội dung bài viết.');
 if(entryType==='rule'&&(!plain||plain.length>4000))throw new HttpError(400,'Mỗi quy tắc cần nội dung và tối đa 4.000 ký tự.');
 return body;
}

export function knowledgeDefaults(data:Record<string,any>,original:Record<string,any>={},now=new Date()){
 const next={...data},entryType=next.entryType??original.entryType??'knowledge';
 next.entryType=entryType;next.jurisdiction=next.jurisdiction??original.jurisdiction??'BOTH';
 if(typeof next.body==='string')next.body=knowledgeBody(next.body,entryType,entryType==='rule'||next._status==='published');
 if(!next.sourceUrl){
  let origin=process.env.APP_URL||'https://luatvietduc.com';
  try{const url=new URL(origin);if(url.protocol!=='https:'||url.username||url.password)origin='https://luatvietduc.com';}catch{origin='https://luatvietduc.com';}
  next.sourceUrl=original.sourceUrl||origin.replace(/\/$/,'')+'/admin/knowledge#'+crypto.randomUUID();
 }
 next.effectiveFrom=next.effectiveFrom||original.effectiveFrom||now.toISOString();
 const renewed=next._status==='published'||entryType==='rule'&&next.ruleEnabled===true&&original.ruleEnabled!==true;
 next.reviewDueAt=renewed&&(!next.reviewDueAt||next.reviewDueAt===original.reviewDueAt)?new Date(now.getTime()+90*86400000).toISOString():next.reviewDueAt||original.reviewDueAt||new Date(now.getTime()+90*86400000).toISOString();
 return next;
}

