import type {Metadata} from 'next';
import {publicArticles} from '../../access/articles';
export const sitemapArticles={and:[publicArticles,{body:{not_equals:''}}]};
export const privatePaths=['/admin','/api','/service','/auth','/health','/tai-khoan','/hoi-dap','/tro-chuyen','/quan-tri','/kien-thuc','/chuyen-vien'];
export function siteOrigin(value=process.env.APP_URL||'https://luatvietduc.com'){
 const url=new URL(value);if(!['http:','https:'].includes(url.protocol)||url.username||url.password)throw new Error('Invalid public site origin');return url.origin;
}
export function descriptionText(value:string,max=165){const text=value.replace(/\s+/g,' ').trim();if(text.length<=max)return text;const end=text.lastIndexOf(' ',max-1);return text.slice(0,end>max*.6?end:max-1)+'…';}
export function canonicalPage(path:string,query=new URLSearchParams()){
 let canonical=path==='/thu-vien'?'/phap-luat/viet-nam':path.replace(/^\/phap-luat\/viet-nam\//,'/chu-de/');
 const page=Number(query.get('trang'));if(Number.isSafeInteger(page)&&page>1&&page<=10000)canonical+='?trang='+page;
 return canonical;
}
export function filteredPage(query:URLSearchParams){return [...query].some(([key,value])=>Boolean(value)&&!['trang','utm_source','utm_medium','utm_campaign','utm_content','utm_term','gclid','fbclid'].includes(key));}
export function publicMetadata({title,path,description='',enabled=false,indexable=true,image='/media/legal-hero-stock-poster-v10.webp',language='vi',article,translations}:{title:string;path:string;description?:string;enabled?:boolean;indexable?:boolean;image?:string;language?:string;article?:{published?:string;modified?:string};translations?:Record<string,string>}):Metadata{
 const canonical=siteOrigin()+path,fullTitle=title==='Luật Việt Đức'?title:title+' — Luật Việt Đức',summary=descriptionText(description),imageUrl=new URL(image,siteOrigin()).href;
 return {title:fullTitle,description:summary,alternates:{canonical,...(translations?{languages:Object.fromEntries(Object.entries(translations).map(([lang,url])=>[lang,new URL(url,siteOrigin()).href]))}:{})},robots:{index:enabled&&indexable,follow:enabled},openGraph:{title:fullTitle,description:summary,url:canonical,siteName:'Luật Việt Đức',locale:language==='de'?'de_DE':'vi_VN',images:[{url:imageUrl,alt:title}],...(article?{type:'article',...(validDate(article.published)?{publishedTime:validDate(article.published)!}:{}),...(validDate(article.modified)?{modifiedTime:validDate(article.modified)!}:{})}:{type:'website'})},twitter:{card:'summary_large_image',title:fullTitle,description:summary,images:[imageUrl]}};
}
export function validDate(value?:string|null){return value&&!Number.isNaN(Date.parse(value))?new Date(value).toISOString():undefined;}
export function robotsDocument(enabled:boolean){return 'User-agent: *\n'+(enabled?'Allow: /\n'+privatePaths.map(path=>'Disallow: '+path).join('\n')+'\nSitemap: '+siteOrigin()+'/sitemap.xml\n':'Disallow: /\n');}
export function jsonLd(value:unknown){return JSON.stringify(value).replace(/</g,'\\u003c');}
export function pageSchema({title,path,description,home=false}:{title:string;path:string;description:string;home?:boolean}){
 const origin=siteOrigin(),organization={'@type':'Organization','@id':origin+'/#organization',name:'Luật Việt Đức',url:origin+'/'};
 return {'@context':'https://schema.org','@graph':[...(home?[organization,{'@type':'WebSite','@id':origin+'/#website',name:'Luật Việt Đức',url:origin+'/',publisher:{'@id':origin+'/#organization'}}]:[]),{'@type':'WebPage','@id':origin+path+'#webpage',url:origin+path,name:title,description,isPartOf:{'@id':origin+'/#website'}}]};
}
export function articleSchema({title,path,description,image,published,modified,language='vi',news=false,parent}:{title:string;path:string;description:string;image:string;published?:string|null;modified?:string;language?:string;news?:boolean;parent:{href:string;label:string}}){
 const origin=siteOrigin(),url=origin+path;
 return {'@context':'https://schema.org','@graph':[{'@type':news?'NewsArticle':'Article','@id':url+'#article',mainEntityOfPage:url,url,headline:title,description:descriptionText(description),image:[new URL(image,origin).href],inLanguage:language,...(validDate(published)?{datePublished:validDate(published)}:{}),...(validDate(modified)?{dateModified:validDate(modified)}:{}),publisher:{'@type':'Organization',name:'Luật Việt Đức',url:origin+'/'}},{'@type':'BreadcrumbList',itemListElement:[{'@type':'ListItem',position:1,name:'Luật Việt Đức',item:origin+'/'},{'@type':'ListItem',position:2,name:parent.label,item:origin+parent.href},{'@type':'ListItem',position:3,name:title,item:url}]}]};
}
export function xmlEscape(value:unknown){return String(value).replace(/[<>&"']/g,char=>({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&apos;'}[char]!));}
export const sitemapPageSize=1000;
export function sitemapIndex(total:number,origin=siteOrigin()){
 const count=Math.max(1,Math.ceil(total/sitemapPageSize));
 return '<?xml version="1.0" encoding="UTF-8"?><sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'+Array.from({length:count},(_,i)=>'<sitemap><loc>'+xmlEscape(origin+'/sitemaps/'+i+'.xml')+'</loc></sitemap>').join('')+'</sitemapindex>';
}
export function sitemapDocument(entries:{path:string;updatedAt?:string}[],origin=siteOrigin()){
 return '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'+entries.filter((entry,index)=>entries.findIndex(other=>other.path===entry.path)===index).map(entry=>'<url><loc>'+xmlEscape(origin+entry.path)+'</loc>'+(validDate(entry.updatedAt)?'<lastmod>'+validDate(entry.updatedAt)+'</lastmod>':'')+'</url>').join('')+'</urlset>';
}
