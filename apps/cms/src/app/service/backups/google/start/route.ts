import {NextResponse} from 'next/server';
import {randomBytes,createHash} from 'node:crypto';
import {SignJWT} from 'jose';
import {backupOwner} from '../../../../../modules/backup/access';
import {readRow} from '../../../../../modules/integrations/store';
import {unseal} from '../../../../../modules/integrations/crypto';
import {IntegrationError} from '../../../../../modules/integrations/validation';
export const dynamic='force-dynamic';
export async function GET(req:Request){
 try{
 const user=await backupOwner(req),row=await readRow('drive'),origin=process.env.APP_URL||'http://localhost:3000';
 if(!row)return NextResponse.redirect(origin+'/admin/settings/backups?error=save-config-first');
 const v=unseal('drive',row.encrypted_values),state=randomBytes(32).toString('base64url'),verifier=randomBytes(32).toString('base64url');
 const cookie=await new SignJWT({state,verifier,userId:user.id,version:row.version}).setProtectedHeader({alg:'HS256'}).setExpirationTime('10m').sign(new TextEncoder().encode(process.env.PAYLOAD_SECRET));
 const url=new URL('https://accounts.google.com/o/oauth2/v2/auth');
 Object.entries({client_id:v.clientId,redirect_uri:origin+'/service/backups/google/callback',response_type:'code',scope:'https://www.googleapis.com/auth/drive.file',access_type:'offline',prompt:'consent',state,code_challenge:createHash('sha256').update(verifier).digest('base64url'),code_challenge_method:'S256'}).forEach(([k,value])=>url.searchParams.set(k,value));
 const response=NextResponse.redirect(url);response.cookies.set('lvd-drive-oauth',cookie,{httpOnly:true,secure:origin.startsWith('https:'),sameSite:'lax',path:'/service/backups/google',maxAge:600});return response;
 }catch(e){return NextResponse.json({error:e instanceof IntegrationError?e.message:'Chưa bắt đầu được kết nối Drive.'},{status:e instanceof IntegrationError?e.status:503,headers:{'Cache-Control':'no-store'}});}
}
