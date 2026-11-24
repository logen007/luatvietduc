import {NextResponse} from 'next/server';
import {cookies} from 'next/headers';
import {jwtVerify} from 'jose';
import {backupOwner} from '../../../../../modules/backup/access';
import {storedValues} from '../../../../../modules/integrations/store';
import {seal} from '../../../../../modules/integrations/crypto';
import {transaction} from '../../../../../modules/shared/db';
import {IntegrationError} from '../../../../../modules/integrations/validation';
import {folderFailure,tokenFailure,type DriveOAuthError} from '../../../../../modules/backup/oauth-result';
import {cookieValue} from '../../../../../modules/identity/session';
import {LOCAL_COOKIE} from '../../../../../modules/identity/session-cookies';
export const dynamic='force-dynamic';
export async function GET(req:Request){
 const origin=process.env.APP_URL||'http://localhost:3000';
 const finish=(success:boolean,reason:DriveOAuthError='unknown')=>{const r=NextResponse.redirect(origin+'/admin/settings/backups?drive='+(success?'connected':'failed&reason='+reason));r.headers.set('Cache-Control','no-store');r.cookies.delete({name:'lvd-drive-oauth',path:'/service/backups/google'});return r;};
 let phase:DriveOAuthError='state';
 try{
 const url=new URL(req.url),cookie=(await cookies()).get('lvd-drive-oauth')?.value;
 if(!cookie||!url.searchParams.get('state'))return finish(false,'state');
 phase='expired';
 const {payload:flow}=await jwtVerify(cookie,new TextEncoder().encode(process.env.PAYLOAD_SECRET),{algorithms:['HS256']});
 if(flow.state!==url.searchParams.get('state')||!Number.isInteger(flow.userId)||!Number.isInteger(flow.version)||typeof flow.verifier!=='string')return finish(false,'state');
 phase='session';
 // Payload rejects cookie JWTs on cross-site navigations. Only after verifying
 // this short-lived OAuth state, submit the existing credential to Payload's
 // native JWT strategy; it still verifies signature, session and current role.
 const headers=new Headers(req.headers),localToken=cookieValue(headers,LOCAL_COOKIE);
 headers.set('DisableAutologin','true');if(localToken)headers.set('Authorization','JWT '+localToken);
 const user=await backupOwner(new Request(req.url,{headers}));
 if(flow.userId!==user.id)return finish(false,'state');
 if(url.searchParams.get('error'))return finish(false,tokenFailure(url.searchParams.get('error')));
 if(!url.searchParams.get('code'))return finish(false,'state');
 phase='save';
 const {row,values:v}=await storedValues('drive',Number(flow.version));
 phase='google';
 const response=await fetch('https://oauth2.googleapis.com/token',{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},body:new URLSearchParams({client_id:v.clientId,client_secret:v.clientSecret,code:url.searchParams.get('code')!,grant_type:'authorization_code',redirect_uri:origin+'/service/backups/google/callback',code_verifier:String(flow.verifier)}),redirect:'error',signal:AbortSignal.timeout(10000)});
 const token=await response.json().catch(()=>null);
 if(!response.ok)return finish(false,tokenFailure(token?.error));
 if(!token?.refresh_token)return finish(false,'refresh');
 if(!String(token.scope||'').split(' ').includes('https://www.googleapis.com/auth/drive.file'))return finish(false,'scope');
 phase='folder';
 const folder=await fetch('https://www.googleapis.com/drive/v3/files',{method:'POST',headers:{Authorization:'Bearer '+token.access_token,'content-type':'application/json'},body:JSON.stringify({name:'Luật Việt Đức — Sao lưu',mimeType:'application/vnd.google-apps.folder'}),redirect:'error',signal:AbortSignal.timeout(10000)});
 const created=await folder.json().catch(()=>null);if(!folder.ok)return finish(false,folderFailure(created,folder.status));if(!created?.id)return finish(false,'folder');
 phase='save';
 await transaction(async db=>{
 const result=await db.query("UPDATE lvd_integrations SET encrypted_values=$1,enabled=false,check_state='untested',version=version+1,updated_at=now(),updated_by=$3 WHERE provider='drive' AND version=$2 RETURNING version",[seal('drive',{...v,refreshToken:String(token.refresh_token),folderId:String(created.id)}),row.version,user.id]);
 if(!result.rowCount)throw new Error('Configuration changed');
 await db.query("INSERT INTO lvd_integration_events(provider,action,actor_id,version) VALUES('drive','oauth.connect',$1,$2)",[user.id,result.rows[0].version]);
 });return finish(true);
 }catch(e){return finish(false,e instanceof IntegrationError&&e.status===409?'changed':phase);}
}
