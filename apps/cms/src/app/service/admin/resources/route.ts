import {getPayload} from 'payload';
import config from '@payload-config';
import {resourceMetrics} from '../../../../modules/settings/resource-metrics';
import {HttpError} from '../../../../modules/http/errors';
export const dynamic='force-dynamic';
export async function GET(req:Request){
 try{const payload=await getPayload({config}),{user}=await payload.auth({headers:req.headers});return Response.json(await resourceMetrics(user),{headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});}
 catch(error){return Response.json({error:error instanceof HttpError?error.message:'Chưa đọc được tài nguyên website.'},{status:error instanceof HttpError?error.status:503,headers:{'Cache-Control':'no-store'}});}
}
