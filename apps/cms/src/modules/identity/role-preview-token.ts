import {createHash,createHmac,timingSafeEqual} from 'node:crypto';
export const ROLE_PREVIEW_COOKIE='lvd-role-preview',ROLE_PREVIEW_SECONDS=900;
export type PreviewRole='support'|'member';
const cookie=(headers:Headers,name:string)=>headers.get('cookie')?.split(';').map(part=>part.trim()).find(part=>part.startsWith(name+'='))?.slice(name.length+1);
export function realIdentityHeaders(headers:Headers){
 const result=new Headers(headers);
 result.set('cookie',(headers.get('cookie')||'').split(';').map(part=>part.trim()).filter(part=>!part.startsWith(ROLE_PREVIEW_COOKIE+'=')).join('; '));
 result.set('DisableAutologin','true');return result;
}
function credential(headers:Headers){
 const local=cookie(headers,'payload-token')||'',google=cookie(headers,'lvd-session')||'';
 let native:['token'|'sid',string]=['token',local];
 // This decode is binding information only. Payload still authenticates the
 // complete JWT and its live server-side session before accepting a preview.
 try{
  const parts=local.split('.');
  if(local.length<=8192&&parts.length===3&&parts.every(part=>/^[A-Za-z0-9_-]+$/.test(part))){
   const sid=JSON.parse(Buffer.from(parts[1],'base64url').toString('utf8')).sid;
   if(typeof sid==='string'&&/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i.test(sid))native=['sid',sid];
  }
 }catch{/* Older or malformed JWTs remain bound to their complete token. */}
 return local||google?createHash('sha256').update(JSON.stringify([native,google])).digest('hex'):null;
}
function signature(value:string,secret:string){if(secret.length<24)throw new Error('Role preview unavailable');return createHmac('sha256',secret).update('lvd-role-preview-v1:'+value).digest();}
export function signRolePreview(owner:number,role:PreviewRole,headers:Headers,secret=process.env.PAYLOAD_SECRET||'',now=Date.now()){
 const binding=credential(headers);
 if(!Number.isSafeInteger(owner)||owner<1||!['support','member'].includes(role)||!binding)throw new Error('Invalid preview session');
 const body=Buffer.from(JSON.stringify({owner,role,binding,expires:Math.floor(now/1000)+ROLE_PREVIEW_SECONDS})).toString('base64url');
 return body+'.'+signature(body,secret).toString('base64url');
}
export function readRolePreview(owner:number,headers:Headers,secret=process.env.PAYLOAD_SECRET||'',now=Date.now()):PreviewRole|null{
 try{
  const token=cookie(headers,ROLE_PREVIEW_COOKIE);if(!token||token.length>1024)return null;
  const [body,mac,extra]=token.split('.');if(!body||!mac||extra)return null;
  const expected=signature(body,secret),actual=Buffer.from(mac,'base64url');
  if(actual.length!==expected.length||!timingSafeEqual(actual,expected))return null;
  const value=JSON.parse(Buffer.from(body,'base64url').toString('utf8')),seconds=Math.floor(now/1000);
  return value.owner===owner&&['support','member'].includes(value.role)&&value.binding===credential(headers)&&Number.isSafeInteger(value.expires)&&value.expires>seconds&&value.expires<=seconds+ROLE_PREVIEW_SECONDS?value.role:null;
 }catch{return null;}
}
export function readRolePreviewExpires(owner:number,headers:Headers,secret=process.env.PAYLOAD_SECRET||'',now=Date.now()):number|null{
 if(!readRolePreview(owner,headers,secret,now))return null;
 const body=cookie(headers,ROLE_PREVIEW_COOKIE)!.split('.')[0];
 return JSON.parse(Buffer.from(body,'base64url').toString('utf8')).expires*1000;
}
