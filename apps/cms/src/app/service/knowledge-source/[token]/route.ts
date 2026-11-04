import {pool} from '../../../../modules/shared/db';
export const dynamic='force-dynamic';
export async function GET(_req:Request,{params}:{params:Promise<{token:string}>}){
 const {token}=await params;
 const headers={'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'};
 if(!/^[a-f0-9-]{36}$/.test(token))return Response.json({error:'Không tìm thấy bài viết.'},{status:404,headers});
 try{
  const source=(await pool.query("SELECT title,body,jurisdiction,updated_at FROM knowledge WHERE source_url=$1 AND approved AND _status='published' AND effective_from<=now() AND review_due_at>now() AND (expires_at IS NULL OR expires_at>now()) LIMIT 1",[(process.env.APP_URL||'https://luatvietduc.com')+'/service/knowledge-source/'+token])).rows[0];
  return source?Response.json({source:'Bài viết chuyên viên — Luật Việt Đức',...source},{headers}):Response.json({error:'Bài viết chưa xuất bản hoặc đã được thu hồi.'},{status:404,headers});
 }catch{return Response.json({error:'Tạm thời chưa đọc được nguồn.'},{status:503,headers});}
}
