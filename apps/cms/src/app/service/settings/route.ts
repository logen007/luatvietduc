import {getPayload} from 'payload';
import config from '@payload-config';
import {publicSettings} from '../../../modules/settings/view';
import {siteSettings} from '../../../modules/settings/public';
export const dynamic='force-dynamic';
const headers={'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'};
export async function GET(){
 try{return Response.json(publicSettings(await siteSettings(await getPayload({config}))),{headers});}
 catch{return Response.json({error:'Dịch vụ tạm thời chưa sẵn sàng. Vui lòng thử lại.'},{status:500,headers});}
}
