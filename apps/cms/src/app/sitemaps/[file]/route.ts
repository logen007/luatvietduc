import {content,publicLegacyNews,publicPayload,publicSiteSettings} from '../../../modules/public-site/server';
import {sitemapArticles,sitemapDocument,sitemapPageSize} from '../../../modules/public-site/seo';
import {publicPages} from '../../../modules/public-site/routes';
export const dynamic='force-dynamic';
export async function GET(_req:Request,{params}:{params:Promise<{file:string}>}){
 const file=(await params).file;if(!/^\d{1,6}\.xml$/.test(file))return new Response('Not found',{status:404});
 const page=Number(file.slice(0,-4)),settings=await publicSiteSettings();
 if(!settings.publicIndexingEnabled)return new Response(sitemapDocument([]),{headers:{'Content-Type':'application/xml; charset=utf-8','Cache-Control':'no-store'}});
 const result=await (await publicPayload()).find({collection:'articles',overrideAccess:false,draft:false,where:sitemapArticles,limit:sitemapPageSize,page:page+1,sort:'id',depth:0,select:{slug:true,updatedAt:true}});
 if(page>=Math.max(1,result.totalPages))return new Response('Not found',{status:404});
 const entries=[...(page===0?[...publicPages.map(page=>({path:page.path})),{path:'/phap-luat/viet-nam'},{path:'/phap-luat/duc'},...content.groups.map(group=>({path:'/chu-de/'+group.id})),...(await publicLegacyNews()).map(story=>({path:'/tin/'+story.id,updatedAt:story.checked}))]:[]),...result.docs.map(article=>({path:'/bai-viet/'+encodeURIComponent(article.slug),updatedAt:article.updatedAt}))];
 return new Response(sitemapDocument(entries),{headers:{'Content-Type':'application/xml; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
}
