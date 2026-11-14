// Internal AI knowledge is managed through authenticated admin APIs only.
// Retire old source links without revealing whether a record exists.
export const dynamic='force-dynamic';
export async function GET(_req:Request,_context:{params:Promise<{token:string}>}){
 return Response.json({error:'Không tìm thấy bài viết.'},{status:404,headers:{'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','X-Robots-Tag':'noindex, nofollow'}});
}
