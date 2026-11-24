import type { Values } from '../integrations/catalog';
export async function driveAccess(v:Values){
 const response=await fetch('https://oauth2.googleapis.com/token',{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},body:new URLSearchParams({client_id:v.clientId,client_secret:v.clientSecret,refresh_token:v.refreshToken,grant_type:'refresh_token'}),redirect:'error',signal:AbortSignal.timeout(10000)});
 if(!response.ok)throw new Error('Drive authorization unavailable');
 const body=await response.json();if(!body.access_token)throw new Error('Drive token missing');return String(body.access_token);
}
