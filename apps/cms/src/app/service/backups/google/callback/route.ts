import {NextResponse} from 'next/server';
import {cookies} from 'next/headers';
import {jwtVerify} from 'jose';
import {backupOwner} from '../../../../../modules/backup/access';
import {storedValues} from '../../../../../modules/integrations/store';
import {seal} from '../../../../../modules/integrations/crypto';
import {transaction} from '../../../../../modules/shared/db';
export const dynamic='force-dynamic';
export async function GET(req:Request){
 const origin=process.env.APP_URL||'http://localhost:3000';
 const finish=(success:boolean)=>{const r=NextResponse.redirect(origin+'/admin/settings/backups?drive='+(success?'connected':'failed'));r.cookies.delete({name:'lvd-drive-oauth',path:'/service/backups/google'});return r;};
 try{
 const user=await backupOwner(req),url=new URL(req.url),cookie=(await cookies()).get('lvd-drive-oauth')?.value;
 if(!cookie||!url.searchParams.get('code'))return finish(false);
 const {payload:flow}=await jwtVerify(cookie,new TextEncoder().encode(process.env.PAYLOAD_SECRET),{algorithms:['HS256']});
 if(flow.state!==url.searchParams.get('state')||flow.userId!==user.id||!Number.isInteger(flow.version))return finish(false);
 const {row,values:v}=await storedValues('drive',Number(flow.version));
 const response=await fetch('https://oauth2.googleapis.com/token',{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},body:new URLSearchParams({client_id:v.clientId,client_secret:v.clientSecret,code:url.searchParams.get('code')!,grant_type:'authorization_code',redirect_uri:origin+'/service/backups/google/callback',code_verifier:String(flow.verifier)}),redirect:'error',signal:AbortSignal.timeout(10000)});
 const token=response.ok?await response.json():null;
 if(!token?.refresh_token||!String(token.scope||'').split(' ').includes('https://www.googleapis.com/auth/drive.file'))return finish(false);
 const folder=await fetch('https://www.googleapis.com/drive/v3/files',{method:'POST',headers:{Authorization:'Bearer '+token.access_token,'content-type':'application/json'},body:JSON.stringify({name:'Luật Việt Đức — Sao lưu',mimeType:'application/vnd.google-apps.folder'}),redirect:'error',signal:AbortSignal.timeout(10000)});
 const created=folder.ok?await folder.json():null;if(!created?.id)return finish(false);
 await transaction(async db=>{
 const result=await db.query("UPDATE lvd_integrations SET encrypted_values=$1,enabled=false,check_state='untested',version=version+1,updated_at=now(),updated_by=$3 WHERE provider='drive' AND version=$2 RETURNING version",[seal('drive',{...v,refreshToken:String(token.refresh_token),folderId:String(created.id)}),row.version,user.id]);
 if(!result.rowCount)throw new Error('Configuration changed');
 await db.query("INSERT INTO lvd_integration_events(provider,action,actor_id,version) VALUES('drive','oauth.connect',$1,$2)",[user.id,result.rows[0].version]);
 });return finish(true);
 }catch{return finish(false);}
}
