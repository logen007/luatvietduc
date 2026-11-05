import {sql} from '@payloadcms/db-postgres';
import {HttpError} from '../http/errors';
import type {CollectionBeforeChangeHook,PayloadRequest} from 'payload';
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
 const body=String(data.body??originalDoc?.body??'');
 if(!body.trim()||body.length>4000)throw new HttpError(400,'Mỗi quy tắc cần nội dung và tối đa 4.000 ký tự.');
 const enabled=data.ruleEnabled??(data._status==='published'?true:originalDoc?.ruleEnabled??false);
 data.ruleEnabled=Boolean(enabled);data._status='draft';data.approved=false;
 if(enabled){
  data.reviewedBy=req.user?.id;data.reviewedAt=new Date().toISOString();
  const result=await (await session(req)).execute(sql`SELECT count(*)::integer AS count,COALESCE(sum(length(body)),0)::integer AS size FROM knowledge WHERE entry_type='rule' AND rule_enabled=true AND id<>${originalDoc?.id||0}`);
  if(result.rows[0].count>=20||result.rows[0].size+body.length>16000)throw new HttpError(400,'Tối đa 20 quy tắc đang bật, tổng cộng 16.000 ký tự. Tắt hoặc gộp bớt quy tắc trước khi bật thêm.');
 }
 return data;
};
