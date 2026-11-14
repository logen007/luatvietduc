import config from "@payload-config";
import {getPayload,APIError} from 'payload';
import {logoutRequest} from '../../../../modules/identity/logout';
import {withPasswordLoginLock} from '../../../../modules/identity/password-login';
import {readNativeLoginRequest} from '../../../../modules/identity/native-login-request';
import {HttpError} from '../../../../modules/http/errors';
import {
  REST_GET,
  REST_POST,
  REST_DELETE,
  REST_PATCH,
  REST_PUT,
  REST_OPTIONS,
} from "@payloadcms/next/routes";
export const GET = REST_GET(config);
const nativePost=REST_POST(config);
export async function POST(request:Request,args:{params:Promise<{slug?:string[]}>}){
  const {slug}=await args.params;
  // Payload's endpoint matcher accepts mixed-case actions too.
  const action=slug?.length===2&&slug[0]==='users'?slug[1].toLowerCase():'';
  if(action==='logout')return logoutRequest(request,await getPayload({config}));
  if(action==='login'){
    try{
      const {email,forwarded}=await readNativeLoginRequest(request);
      return await withPasswordLoginLock(email,()=>nativePost(forwarded,args));
    }catch(error){
      if(error instanceof APIError||error instanceof HttpError)return Response.json({errors:[{message:error.message}],error:error.message},{status:error.status,headers:{'Cache-Control':'private, no-store'}});
      throw error;
    }
  }
  return nativePost(request,args);
}
export const DELETE = REST_DELETE(config);
export const PATCH = REST_PATCH(config);
export const PUT = REST_PUT(config);
export const OPTIONS = REST_OPTIONS(config);
