import {publicSiteSettings} from '../../modules/public-site/server';
import {robotsDocument} from '../../modules/public-site/seo';
export const dynamic='force-dynamic';
export async function GET(){const settings=await publicSiteSettings();return new Response(robotsDocument(settings.publicIndexingEnabled===true),{headers:{'Content-Type':'text/plain; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});}
