import {HttpError} from '../http/errors';
export const accountActions=['register','login','verify','resend','forgot','reset'] as const;
export type AccountAction=typeof accountActions[number];
export function accountInput(action:AccountAction,data:Record<string,unknown>){
 const email=typeof data.email==='string'?data.email.trim().toLowerCase():'';
 const password=typeof data.password==='string'?data.password:'';
 const token=typeof data.token==='string'?data.token:'';
 if(['register','login','resend','forgot'].includes(action)&&(!email||email.length>254||!/^[^\s<>@,;\x00-\x1f\x7f]+@[^\s<>@,;\x00-\x1f\x7f]+\.[^\s<>@,;\x00-\x1f\x7f]+$/.test(email)))throw new HttpError(400,'Enter a valid email address.');
 if(['register','reset'].includes(action)&&(password.length<12||password.length>128))throw new HttpError(400,'Use a password between 12 and 128 characters.');
 if(action==='login'&&(!password||password.length>1024))throw new HttpError(400,'Enter your email and password.');
 if(['verify','reset'].includes(action)&&!/^[a-f0-9]{40,128}$/i.test(token))throw new HttpError(400,'This link is invalid or has expired.');
 const conversation=typeof data.conversation==='string'&&/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i.test(data.conversation)?data.conversation:'';
 return {email,password,token,conversation,language:data.language==='de'?'de':'vi',name:email.split('@')[0].slice(0,100)};
}
