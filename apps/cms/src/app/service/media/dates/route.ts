import {getPayload} from 'payload';
import config from '@payload-config';
import {pool} from '../../../../modules/shared/db';
export const dynamic='force-dynamic';
export async function GET(req:Request){
 const headers={'Cache-Control':'private, no-store'};
 try{
  const payload=await getPayload({config}),{user}=await payload.auth({headers:req.headers});
  if(!user||!['owner','support'].includes(user.role))return Response.json({error:'Không có quyền xem thư viện tệp.'},{status:user?403:401,headers});
  const {rows}=await pool.query("SELECT to_char(created_at AT TIME ZONE 'UTC','YYYY-MM') AS month,count(*)::int AS count FROM media GROUP BY 1 ORDER BY 1 DESC LIMIT 240");
  return Response.json({dates:rows},{headers});
 }catch{return Response.json({error:'Chưa tải được danh sách ngày.'},{status:503,headers});}
}
