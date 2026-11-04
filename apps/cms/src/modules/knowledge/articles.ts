import {createLocalReq,type Payload} from 'payload';
import {sql} from '@payloadcms/db-postgres';
import type {User} from '../../payload-types';
import {HttpError} from '../chat/service';
import {knowledgeArticleInput} from './article-input';
export function requireKnowledge(user:User|null):asserts user is User{if(!user||!['owner','knowledge','support','reviewer'].includes(user.role))throw new HttpError(403,'Tài khoản chưa được giao quản lý kiến thức AI.');}
export async function knowledgeArticles(payload:Payload,user:User|null,id?:string|null){
 requireKnowledge(user);
 if(id){if(!/^\d+$/.test(id))throw new HttpError(400,'Bài viết không hợp lệ.');return payload.findByID({collection:'knowledge',id:Number(id),user,overrideAccess:false,draft:true});}
 const result=await payload.find({collection:'knowledge',user,overrideAccess:false,draft:true,limit:100,sort:'-updatedAt',select:{title:true,jurisdiction:true,_status:true,approved:true,updatedAt:true,reviewDueAt:true}});
 return {articles:result.docs,total:result.totalDocs,countries:user.role==='owner'?['VN','DE']:user.jurisdictions||[]};
}
export async function writeKnowledgeArticle(payload:Payload,user:User|null,input:any){
 requireKnowledge(user);
 const tx=await payload.db.beginTransaction();if(!tx)throw new Error('Knowledge transaction unavailable');
 const req=await createLocalReq({user},payload);req.transactionID=tx;
 try{
  let original:any;
  if(input.id){
   if(!Number.isSafeInteger(input.id)||input.id<1)throw new HttpError(400,'Bài viết không hợp lệ.');
   original=await payload.findByID({collection:'knowledge',id:input.id,user,overrideAccess:false,req,draft:true});
   const session=(payload.db as any).sessions[String(tx)];
   const locked=await session.db.execute(sql`SELECT updated_at FROM knowledge WHERE id=${input.id} FOR UPDATE`);
   if(!input.updatedAt||new Date(locked.rows[0]?.updated_at).getTime()!==new Date(input.updatedAt).getTime())throw new HttpError(409,'Bài viết đã thay đổi. Tải lại bài trước khi lưu.');
  }
  const data=knowledgeArticleInput(input,user,original);
  const doc=original?await payload.update({collection:'knowledge',id:original.id,data,user,overrideAccess:false,req}):await payload.create({collection:'knowledge',data,user,overrideAccess:false,req});
  await payload.db.commitTransaction(tx);return doc;
 }catch(error){await payload.db.rollbackTransaction(tx);throw error;}
}
