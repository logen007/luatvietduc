import type {CollectionBeforeOperationHook,CollectionBeforeValidateHook,CollectionBeforeChangeHook} from 'payload';
import {revokeAppUserSessions,revokeAppSession} from './app-sessions';
import {cookieValue} from './session';
const resetting=new WeakSet<object>();
export const trackAccountOperation:CollectionBeforeOperationHook=({operation,args})=>{
 if(args.req){if(operation==='resetPassword')resetting.add(args.req);else if(['create','update','login'].includes(operation))resetting.delete(args.req);}return args;
};
// Payload resetPassword validates the reset token and hashes the new password
// before this hook, within the same transaction as its native session changes.
export const revokeResetSessions:CollectionBeforeValidateHook=async({operation,data,req})=>{
 if(operation==='update'&&resetting.has(req)&&data?.id&&data.hash&&data.salt){await revokeAppUserSessions(Number(data.id),req);resetting.delete(req);}
 return data;
};
export const revokeChangedCredentials:CollectionBeforeChangeHook=async({operation,data,originalDoc,req})=>{
 if(operation!=='update'||!originalDoc)return data;
 const password=typeof data.password==='string'&&Boolean(data.password),email=data.email!==undefined&&data.email!==originalDoc.email,unverified=data._verified===false&&originalDoc._verified!==false;
 if(password||email||unverified){
  await revokeAppUserSessions(Number(originalDoc.id),req);
  if(email||unverified)data.sessions=[];
 }
 return data;
};
export const retireGoogleSessionOnLogin=async({req}:{req:Parameters<CollectionBeforeChangeHook>[0]['req']})=>{
 await revokeAppSession(cookieValue(req.headers,'lvd-session'),req);
};
