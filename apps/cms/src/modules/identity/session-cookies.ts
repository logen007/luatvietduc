import type {NextResponse} from 'next/server';
import {GOOGLE_SESSION_SECONDS} from './session-policy';
export const LOCAL_COOKIE='payload-token',GOOGLE_COOKIE='lvd-session',OAUTH_COOKIE='lvd-oauth';
const options=()=>({httpOnly:true,secure:(process.env.APP_URL||'').startsWith('https:'),sameSite:'lax' as const,path:'/'});
export function clearSessionCookies(response:NextResponse){
 for(const name of [LOCAL_COOKIE,GOOGLE_COOKIE,OAUTH_COOKIE])response.cookies.set(name,'',{...options(),expires:new Date(0),maxAge:0});
 // OAuth state is scoped separately; clearing '/' alone leaves the flow alive.
 response.cookies.set(OAUTH_COOKIE,'',{...options(),path:'/auth/google',expires:new Date(0),maxAge:0});
}
export function setGoogleSession(response:NextResponse,token:string){
 clearSessionCookies(response);response.cookies.set(GOOGLE_COOKIE,token,{...options(),maxAge:GOOGLE_SESSION_SECONDS});
}
export function setPasswordSession(response:NextResponse,login:{token:string;exp?:number}){
 clearSessionCookies(response);const now=Math.floor(Date.now()/1000);
 response.cookies.set(LOCAL_COOKIE,login.token,{...options(),maxAge:Math.max(1,(login.exp||now+7200)-now)});
}
