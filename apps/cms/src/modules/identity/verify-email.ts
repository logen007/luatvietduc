import {APIError,createLocalReq,initTransaction,commitTransaction,killTransaction,headersWithCors,type Endpoint,type Payload,type PayloadRequest} from 'payload';
import {sql} from '@payloadcms/db-postgres';
import {payloadTransaction} from '../shared/payload-transaction';

export async function verifyAccountEmail(payload:Payload,token:string,request?:PayloadRequest){
 const req=request||await createLocalReq({},payload),shouldCommit=await initTransaction(req);
 try{
  // Native verification writes the full account snapshot. Lock before its read
  // so it cannot restore stale credentials, permissions or sessions.
  await(await payloadTransaction(req)).execute(sql`SELECT id FROM users WHERE _verificationtoken=${token} ORDER BY id FOR UPDATE`);
  const result=await payload.verifyEmail({collection:'users',token,req});
  if(shouldCommit)await commitTransaction(req);
  return result;
 }catch(error){await killTransaction(req);throw error;}
}

export const verifyEmailEndpoint:Endpoint={
 path:'/verify/:id',method:'post',handler:async req=>{
  const token=req.routeParams?.id;if(typeof token!=='string')throw new APIError('ID was not specified',400);
  await verifyAccountEmail(req.payload,token,req);
  return Response.json({message:req.t('authentication:accountVerified')},{headers:headersWithCors({headers:new Headers(),req})});
 },
};
