import {createLocalReq,type Payload} from 'payload';
import {sql} from '@payloadcms/db-postgres';
import type {User} from '../../payload-types';
import {HttpError} from '../chat/service';
import {indexStatus} from '../rag/admin';
import {knowledgeArticleInput} from './article-input';
export function requireKnowledge(user:User|null):asserts user is User{if(!user||!['owner','knowledge','support','reviewer'].includes(user.role))throw new HttpError(403,'Tài khoản chưa được giao quản lý kiến thức AI.');}
export async function knowledgeArticles(payload:Payload,user:User|null,id?:string|null,options:{query?:string;page?:number}={}){
 requireKnowledge(user);
 if(id){if(!/^\d+$/.test(id))throw new HttpError(400,'Bài viết không hợp lệ.');return payload.findByID({collection:'knowledge',id:Number(id),user,overrideAccess:false,draft:true});}
 const query=(options.query||'').trim().slice(0,160),page=options.page||1;
 if(!Number.isSafeInteger(page)||page<1||page>100000)throw new HttpError(400,'Trang không hợp lệ.');
 const result=await payload.find({collection:'knowledge',user,overrideAccess:false,draft:true,limit:25,page,where:query?{title:{contains:query}}:undefined,sort:'-updatedAt',select:{title:true,jurisdiction:true,_status:true,approved:true,updatedAt:true,reviewDueAt:true}});
 const index=await indexStatus(user,result.docs.map(doc=>doc.id));
 return {articles:result.docs.map(doc=>({...doc,index:index.rows.find(row=>row.source_id===doc.id)||null})),indexWorker:index.worker,total:result.totalDocs,page:result.page,totalPages:result.totalPages};
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
