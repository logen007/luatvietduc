import {getPayload} from 'payload';
import config from '@payload-config';
import {NextResponse} from 'next/server';
import {readJsonRequest} from '../../../../modules/http/request';
import {HttpError} from '../../../../modules/http/errors';
import {rateLimit} from '../../../../modules/chat/service';
import {articleLanguages,articleTranslation,requireArticleEditor} from '../../../../modules/content/translations';
export const dynamic='force-dynamic';
const json=(data:unknown,status=200)=>NextResponse.json(data,{status,headers:{'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});
async function handle(req:Request){
 try{
  const payload=await getPayload({config}),{user}=await payload.auth({headers:req.headers});requireArticleEditor(user);
  if(req.method==='GET'){
   const raw=new URL(req.url).searchParams.get('id')||'';
   if(!/^[1-9]\d{0,9}$/.test(raw))throw new HttpError(400,'Lưu bài viết trước khi thêm bản dịch.');
   return json(await articleLanguages(payload,user,Number(raw)));
  }
  const input=await readJsonRequest(req,2048);await rateLimit('article-translation:'+user.id,6);
  return json(await articleTranslation(payload,user,input,req.signal));
 }catch(error){
  if(error instanceof HttpError)return json({error:error.message},error.status);
  return json({error:'Chưa hoàn tất bản dịch. Nội dung gốc được giữ nguyên; vui lòng thử lại.'},503);
 }
}
export const GET=handle;export const POST=handle;
