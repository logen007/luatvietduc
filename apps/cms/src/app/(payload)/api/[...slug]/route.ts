import config from "@payload-config";
import {getPayload} from 'payload';
import {logoutRequest} from '../../../../modules/identity/logout';
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
  if(slug?.length===2&&slug[0]==='users'&&slug[1]==='logout')return logoutRequest(request,await getPayload({config}));
  return nativePost(request,args);
}
export const DELETE = REST_DELETE(config);
export const PATCH = REST_PATCH(config);
export const PUT = REST_PUT(config);
export const OPTIONS = REST_OPTIONS(config);
