import {canEnterAdmin} from '../identity/permissions';
import {createLocalReq,type Payload} from 'payload';
import {sql} from '@payloadcms/db-postgres';
import type {Article,User} from '../../payload-types';
import {activeValues} from '../integrations/store';
import {pool} from '../shared/db';
import {HttpError} from '../http/errors';
import {permalink} from '../taxonomy/slug';
import {setTranslationGroup} from './translation-group';
import {translateArticleText,type ArticleLanguage} from './translation-provider';
export function requireArticleEditor(user:User|null):asserts user is User{
 if(!user)throw new HttpError(401,'Đăng nhập để tiếp tục.');
 if(!canEnterAdmin(user))throw new HttpError(403,'Tài khoản chưa có quyền viết bài.');
}
async function editableArticle(payload:Payload,user:User,id:number){
 const result=await payload.find({collection:'articles',user,overrideAccess:false,draft:true,depth:0,limit:1,where:{id:{equals:id}}});
 const article=result.docs[0];
 if(!article||(user.role!=='owner'&&!(article.jurisdiction==='BOTH'?user.jurisdictions?.length:user.jurisdictions?.includes(article.jurisdiction))))throw new HttpError(403,'Không có quyền sửa bài viết này.');
 if(!article.translationGroup)throw new HttpError(409,'Lưu lại bài viết trước khi thêm bản dịch.');
 return article;
}
export async function articleLanguages(payload:Payload,user:User|null,id:number){
 requireArticleEditor(user);const source=await editableArticle(payload,user,id);
 const result=await payload.find({collection:'articles',user,overrideAccess:false,draft:true,depth:0,limit:2,where:{translationGroup:{equals:source.translationGroup}}});
 return {articles:result.docs.filter(a=>user.role==='owner'||(a.jurisdiction==='BOTH'?user.jurisdictions?.length:user.jurisdictions?.includes(a.jurisdiction))).map(a=>({id:a.id,language:a.language})),translationReady:Boolean(await activeValues('translation'))};
}
export async function articleTranslation(payload:Payload,user:User|null,input:Record<string,unknown>,signal?:AbortSignal){
 requireArticleEditor(user);
 if(input.mode==='draft'){
  if(!['vi','de'].includes(String(input.language))||typeof input.title!=='string'||typeof input.body!=='string'||!input.title.trim()||!input.body.trim()||input.title.length>240||input.body.length>16000||/[\u0000]/.test(input.title+input.body))throw new HttpError(400,'Nhập tiêu đề và nội dung hợp lệ trước khi dịch.');
  const connection=await activeValues('translation');
  if(!connection)throw new HttpError(503,'Chưa bật AI dịch bài viết. Admin thêm khóa riêng tại Cài đặt → Kết nối dịch vụ → Dịch bài viết.');
  return {translation:await translateArticleText({title:input.title,body:input.body},input.language as ArticleLanguage,connection,signal)};
 }
 if(!Number.isSafeInteger(input.id)||Number(input.id)<1||!['vi','de'].includes(String(input.language))||!['copy','manual','ai','preview'].includes(String(input.mode))||typeof input.updatedAt!=='string')throw new HttpError(400,'Yêu cầu dịch chưa hợp lệ.');
 const source=await editableArticle(payload,user,Number(input.id)),language=input.language as ArticleLanguage;
 if(source.language===language)throw new HttpError(400,'Chọn ngôn ngữ khác với bản gốc.');
 if(source.updatedAt!==input.updatedAt)throw new HttpError(409,'Bài gốc đã thay đổi. Tải lại trước khi dịch.');
 const findSibling=async()=>(await payload.find({collection:'articles',user,overrideAccess:false,draft:true,depth:0,limit:1,where:{and:[{translationGroup:{equals:source.translationGroup}},{language:{equals:language}}]}})).docs[0];
 if(input.mode==='ai'){
  const existing=await findSibling();
  if(existing)return {id:existing.id,existing:true};
 }
 // Reading settings borrows the shared SQL pool too. Finish that read before
 // holding an advisory-lock client, so parallel articles cannot exhaust it.
 const connection=['copy','manual'].includes(String(input.mode))?null:await activeValues('translation');
 const lock=await pool.connect();let acquired=false;
 try{
  const locked=await lock.query('SELECT pg_try_advisory_lock(hashtext($1)) AS locked',['article-translation:'+source.translationGroup]);
  if(!locked.rows[0].locked)throw new HttpError(409,'Bài này đang được dịch. Chờ hoàn tất rồi thử lại.');
  acquired=true;
  const existing=await findSibling();
  if(existing&&input.mode!=='preview')return {id:existing.id,existing:true};
  let text={title:source.title,body:source.body};
  if(!['copy','manual'].includes(String(input.mode))){
   if(!connection)throw new HttpError(503,'Chưa bật AI dịch bài viết. Admin thêm khóa riêng tại Cài đặt → Kết nối dịch vụ → Dịch bài viết.');
   text=await translateArticleText(text,language,connection,signal);
  }
  signal?.throwIfAborted();
  const tx=await payload.db.beginTransaction();if(!tx)throw new Error('Translation transaction unavailable');
  const req=await createLocalReq({user},payload);req.transactionID=tx;
  try{
   const session=(payload.db as any).sessions[String(tx)];
   const row=(await session.db.execute(sql`SELECT updated_at FROM articles WHERE id=${source.id} FOR UPDATE`)).rows[0];
   // Native Save draft advances the latest version without changing the main
   // row. Read that revision after the same row lock used by editorial writes.
   const latest=(await session.db.execute(sql`SELECT version_updated_at FROM _articles_v WHERE parent_id=${source.id} AND latest=true ORDER BY updated_at DESC LIMIT 1`)).rows[0];
   const milliseconds=(value:unknown)=>value instanceof Date?value.getTime():new Date(String(value)).getTime();
   const timestamp=Math.max(milliseconds(row?.updated_at),latest?milliseconds(latest.version_updated_at):0);
   if(!row||timestamp!==milliseconds(source.updatedAt))throw new HttpError(409,'Bài gốc đã thay đổi trong lúc dịch. Tải lại rồi thử lại.');
   // Recheck both account role and article scope after the provider call.
   const freshUser=await payload.findByID({collection:'users',id:user.id,overrideAccess:true,req});requireArticleEditor(freshUser);
   await editableArticle(payload,freshUser,source.id);
   if(input.mode==='preview'){
    await payload.db.commitTransaction(tx);return {translation:text};
   }
   setTranslationGroup(req,source.translationGroup!);
   const ids=(items:Article['categories'])=>(items||[]).map(item=>typeof item==='object'?item.id:item);
   if(input.mode==='manual')text={title:'',body:''};
   const doc=await payload.create({collection:'articles',user:freshUser,overrideAccess:false,req,draft:true,data:{...text,slug:(permalink(text.title)||'bai-viet')+'-'+language+'-'+source.id,language,jurisdiction:source.jurisdiction,kind:source.kind,categories:ids(source.categories),tags:ids(source.tags),sourceUrl:source.sourceUrl,legalField:source.legalField,effectiveFrom:source.effectiveFrom,reviewDueAt:source.reviewDueAt,reviewState:'draft',_status:'draft',aiAllowed:false}});
   await payload.db.commitTransaction(tx);return {id:doc.id,existing:false};
  }catch(error){await payload.db.rollbackTransaction(tx);throw error;}
 }finally{try{if(acquired)await lock.query('SELECT pg_advisory_unlock(hashtext($1))',['article-translation:'+source.translationGroup]);}finally{lock.release();}}
}
