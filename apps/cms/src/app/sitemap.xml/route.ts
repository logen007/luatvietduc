import {publicPayload,publicSiteSettings} from '../../modules/public-site/server';
import {sitemapArticles,sitemapDocument,sitemapIndex} from '../../modules/public-site/seo';
export const dynamic='force-dynamic';
export async function GET(){
 const settings=await publicSiteSettings();
 const xml=settings.publicIndexingEnabled?sitemapIndex((await (await publicPayload()).count({collection:'articles',overrideAccess:false,where:sitemapArticles})).totalDocs):sitemapDocument([]);
 return new Response(xml,{headers:{'Content-Type':'application/xml; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
}
