import {getPayload} from 'payload';
import config from '@payload-config';
import {profilePasswordRequest} from '../../../../modules/identity/profile';
export const dynamic='force-dynamic';
export async function POST(request:Request){return profilePasswordRequest(request,await getPayload({config}));}
