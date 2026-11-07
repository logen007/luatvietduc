import {getPayload} from 'payload';
import config from '@payload-config';
import {profileAvatarResponse} from '../../../../../modules/identity/profile';
export const dynamic='force-dynamic';
export async function GET(_request:Request,{params}:{params:Promise<{id:string}>}){return profileAvatarResponse(await getPayload({config}),(await params).id);}
