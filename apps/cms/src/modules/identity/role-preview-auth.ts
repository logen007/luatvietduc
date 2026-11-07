import type {Payload} from 'payload';
import {ROLE_PREVIEW_COOKIE,realIdentityHeaders,readRolePreview,type PreviewRole} from './role-preview-token';
import type {User} from '../../payload-types';
export type PreviewUser=User&{collection:'users';rolePreview?:PreviewRole};
export async function realPreviewIdentity(payload:Payload,headers:Headers){
 // Strip the preview before re-entering Payload. Native JWT and app-session
 // validation remain authoritative, including revocation and account changes.
 return (await payload.auth({headers:realIdentityHeaders(headers)})).user;
}
export async function authenticateRolePreview(payload:Payload,headers:Headers){
 if(!(headers.get('cookie')||'').split(';').some(part=>part.trim().startsWith(ROLE_PREVIEW_COOKIE+'=')))return null;
 const user=await realPreviewIdentity(payload,headers);
 if(user?.collection!=='users'||user.role!=='owner')return null;
 const role=readRolePreview(Number(user.id),headers);if(!role)return null;
 return {...user,role,jurisdictions:role==='support'?['VN','DE']:[],rolePreview:role,_strategy:'role-preview'} as PreviewUser;
}
