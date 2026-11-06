import {createLocalReq,initTransaction,commitTransaction,killTransaction,type Payload,type PayloadRequest} from 'payload';
import {sql} from '@payloadcms/db-postgres';
import type {User} from '../../payload-types';
import {canWriteContent} from '../identity/permissions';
import {HttpError} from '../http/errors';
import {readJsonRequest} from '../http/request';
import {payloadTransaction} from '../shared/payload-transaction';
import {CSV_COLUMNS,MAX_CSV_BYTES,encodeCSV,readArticleCSV} from './article-csv';
import {sanitizeArticleBody,articleText,isRichBody} from './article-body';
type Term={id:number;name:string;slug:string;parent?:number|Term|null};
async function taxonomy(payload:Payload,req:PayloadRequest){
 const [categories,tags]=await Promise.all(['categories','tags'].map(collection=>payload.find({collection:collection as 'categories'|'tags',limit:10000,pagination:false,depth:0,overrideAccess:false,req,sort:'name'})));
 return {categories:categories.docs as Term[],tags:tags.docs as Term[]};
}
const allowed=(user:User|null)=>{if(!canWriteContent(user))throw new HttpError(403,'Tài khoản không có quyền nhập bài viết.');};
export async function planArticleImport(payload:Payload,user:User|null,csv:string,req?:PayloadRequest){
 allowed(user);req??=await createLocalReq({user:user!},payload);
 let rows:ReturnType<typeof readArticleCSV>;try{rows=readArticleCSV(csv);}catch(error){throw new HttpError(400,error instanceof Error?error.message:'CSV không hợp lệ.');}
 const terms=await taxonomy(payload,req);
 const existing=await payload.find({collection:'articles',req,overrideAccess:false,draft:true,depth:0,limit:200,pagination:false,where:{slug:{in:rows.map(r=>r.slug)}}});
 const slugs=new Set(existing.docs.map(doc=>doc.slug));
 const index=(items:Term[])=>{const values=new Map<string,Set<number>>();for(const item of items)for(const key of [item.slug,item.name]){if(!values.has(key))values.set(key,new Set());values.get(key)!.add(item.id);}return values;};
 const categoryIndex=index(terms.categories),tagIndex=index(terms.tags);
 return rows.map(row=>{
  const errors=[...row.errors];
  const resolve=(values:string[],items:Map<string,Set<number>>,label:string)=>values.flatMap(value=>{const matches=[...(items.get(value)||[])];if(matches.length!==1){errors.push(label+' không tồn tại hoặc trùng tên: '+value);return [];}return [matches[0]];});
  const categories=resolve(row.categories,categoryIndex,'Danh mục'),tags=resolve(row.tags,tagIndex,'Tag');
  const rich=!isRichBody(row.body)&&/<(?:p|h[1-6]|ul|ol|table|blockquote|img|div)\b/i.test(row.body)?'<div data-lvd-richtext="1">'+row.body+'</div>':row.body;
  const body=sanitizeArticleBody(rich);if(body.length>16000)errors.push('Nội dung sau xử lý vượt 16.000 ký tự.');
  if(!body.trim()||(isRichBody(body)&&!articleText(body).trim()&&!/<img\s/.test(body)))errors.push('Nội dung trống sau khi làm sạch.');
  return {...row,body,categories,tags,errors,action:errors.length?'error':slugs.has(row.slug)?'skip':'create'};
 });
}
export async function commitArticleImport(payload:Payload,user:User|null,csv:string){
 allowed(user);const req=await createLocalReq({user:user!},payload);await initTransaction(req);
 try{
  await(await payloadTransaction(req)).execute(sql`SELECT pg_advisory_xact_lock(163805, 1)`);
  const rows=await planArticleImport(payload,user,csv,req);
  if(rows.some(row=>row.errors.length))throw new HttpError(400,'Tệp còn dòng lỗi. Kiểm tra lại trước khi nhập.');
  const created:{id:number;title:string}[]=[];
  for(const row of rows){if(row.action==='skip')continue;
   const doc=await payload.create({collection:'articles',req,overrideAccess:false,draft:row.status==='draft',data:{title:row.title,slug:row.slug,body:row.body,categories:row.categories,tags:row.tags,language:row.language,kind:row.kind,jurisdiction:row.jurisdiction,sourceUrl:row.sourceUrl||undefined,_status:row.status,reviewState:row.status==='published'?'approved':'draft',aiAllowed:row.aiAllowed}});
   created.push({id:doc.id,title:doc.title});
  }
  await commitTransaction(req);return {created,skipped:rows.filter(row=>row.action==='skip').length};
 }catch(error){await killTransaction(req);throw error;}
}
export async function articleImportRequest(request:Request,payload:Payload,user:User|null){
 allowed(user);
 if(request.method==='GET'){
  const req=await createLocalReq({user:user!},payload),terms=await taxonomy(payload,req);
  // One draft example per current category, plus every tag and combination.
  const base=(title:string,category:string,tags:string,language='vi',kind='article')=>[title,'','Nội dung mẫu — thay bằng bài viết của bạn.',category,tags,language,kind,'draft','false','','BOTH'];
  const rows:unknown[][]=[Array.from(CSV_COLUMNS),...terms.categories.map((term,i)=>base('Bài mẫu: '+term.name,term.slug,i%3===0?'vietnam':i%3===1?'germany':'vietnam|germany','vi',term.slug.startsWith('tin-')?'news':'article')),...terms.tags.map(term=>base('Mẫu tag: '+term.name,'',term.slug)),base('Mẫu nhiều danh mục',terms.categories.slice(0,2).map(t=>t.slug).join('|'),terms.tags.map(t=>t.slug).join('|')),base('Beispiel auf Deutsch','','germany','de'),base('Mẫu câu hỏi và trả lời','','vietnam|germany','vi','question')];
  return new Response(encodeCSV(rows),{headers:{'Content-Type':'text/csv; charset=utf-8','Content-Disposition':'attachment; filename="luat-viet-duc-bai-viet-mau.csv"','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});
 }
 if(request.method!=='POST')throw new HttpError(405,'Phương thức không hợp lệ.');
 const data=await readJsonRequest(request,MAX_CSV_BYTES*2+1024);
 if(typeof data.csv!=='string'||!['preview','import'].includes(String(data.action)))throw new HttpError(400,'Chọn tệp CSV hợp lệ.');
 if(data.action==='import')return Response.json(await commitArticleImport(payload,user,data.csv),{headers:{'Cache-Control':'private, no-store'}});
 const rows=await planArticleImport(payload,user,data.csv);
 return Response.json({rows:rows.map(({body,...row})=>({...row,bodyPreview:articleText(body).slice(0,140)}))},{headers:{'Cache-Control':'private, no-store'}});
}
