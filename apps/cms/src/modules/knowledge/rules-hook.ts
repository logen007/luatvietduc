import {sql} from '@payloadcms/db-postgres';
import {HttpError} from '../http/errors';
import type {CollectionBeforeChangeHook,CollectionAfterChangeHook,PayloadRequest} from 'payload';
import {articleText} from '../content/article-body';
import {knowledgeBody} from './content';
async function session(req:PayloadRequest){
 if(!req.transactionID)throw new Error('Knowledge transaction required');
 const id=await req.transactionID,db=(req.payload.db as any).sessions[String(id)]?.db;
 if(!db)throw new Error('Knowledge transaction unavailable');return db;
}
export async function lockKnowledgeRules({req}:{req:PayloadRequest}){
 await (await session(req)).execute(sql`SELECT pg_advisory_xact_lock(73051105)`);
}
export const validateKnowledgeRule:CollectionBeforeChangeHook=async({data,originalDoc,req})=>{
 if(!originalDoc?.articleOrigin&&typeof data.sourceUrl==='string')data.sourceUrl=data.sourceUrl.replace('/service/knowledge-source/','/admin/knowledge#');
 data.entryType=data.entryType??originalDoc?.entryType??'knowledge';
 if(!['knowledge','rule'].includes(data.entryType))throw new HttpError(400,'Loại nội dung không hợp lệ.');
 if(data.entryType!=='rule'){data.ruleEnabled=false;return data;}
 if(data.articleOrigin||originalDoc?.articleOrigin)throw new Error('Bài viết công khai không thể trở thành quy tắc nội bộ.');
 const body=articleText(knowledgeBody(data.body??originalDoc?.body,'rule')).trim();
 const apiPublish=req.context.knowledgeApiPublish;
 const enabled=typeof apiPublish==='boolean'?apiPublish:data.ruleEnabled??(data._status==='published'?true:originalDoc?.ruleEnabled??false);
 data.ruleEnabled=Boolean(enabled);data._status='draft';data.approved=false;
 if(enabled){
  data.reviewedBy=req.user?.id;data.reviewedAt=new Date().toISOString();
  if(req.context.knowledgeDraftOnly!==true||typeof apiPublish==='boolean'){
   const result=await (await session(req)).execute(sql`SELECT body FROM knowledge WHERE entry_type='rule' AND rule_enabled=true AND id<>${originalDoc?.id||0} ORDER BY id LIMIT 20`);
   if(result.rows.length>=20||result.rows.reduce((sum:number,row:any)=>sum+articleText(row.body).trim().length,0)+body.length>16000)throw new HttpError(400,'Tối đa 20 quy tắc đang bật, tổng cộng 16.000 ký tự. Tắt hoặc gộp bớt quy tắc trước khi bật thêm.');
  }
 }
 return data;
};

// Draft creates need a main row for identity/version ownership. Keep the user's
// checkbox choice in the saved version, but do not apply it until Publish.
export const stageNativeRule:CollectionAfterChangeHook=async({doc,operation,req})=>{
 if(operation==='create'&&req.context.knowledgeDraftOnly===true&&typeof req.context.knowledgeApiPublish!=='boolean'&&doc.entryType==='rule'&&doc.ruleEnabled===true&&!doc.articleOrigin)
  await(await session(req)).execute(sql`UPDATE knowledge SET rule_enabled=false WHERE id=${doc.id} AND entry_type='rule' AND article_origin_id IS NULL`);
 return doc;
};
