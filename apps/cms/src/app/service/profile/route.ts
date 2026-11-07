import {getPayload} from 'payload';
import config from '@payload-config';
import {profileRequest} from '../../../modules/identity/profile';
export const dynamic='force-dynamic';
export const runtime='nodejs';
async function handle(request:Request){return profileRequest(request,await getPayload({config}));}
export const GET=handle;
export const PATCH=handle;
export const POST=handle;
export const DELETE=handle;
