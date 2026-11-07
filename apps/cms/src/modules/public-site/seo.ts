import type {Metadata} from 'next';
import {publicArticles} from '../../access/articles';
export const sitemapArticles={and:[publicArticles,{body:{not_equals:''}}]};
export const privatePaths=['/admin','/api','/service','/auth','/health','/tai-khoan','/hoi-dap','/tro-chuyen','/quan-tri','/kien-thuc','/chuyen-vien'];
export function siteOrigin(value=process.env.APP_URL||'https://luatvietduc.com'){
 const url=new URL(value);if(!['http:','https:'].includes(url.protocol)||url.username||url.password)throw new Error('Invalid public site origin');return url.origin;
}
export function publicMetadata({title,path,description='',enabled=false,indexable=true}:{title:string;path:string;description?:string;enabled?:boolean;indexable?:boolean}):Metadata{
 const canonical=siteOrigin()+path;
 return {title:title==='Luật Việt Đức'?title:title+' — Luật Việt Đức',description,alternates:{canonical},robots:{index:enabled&&indexable,follow:enabled},openGraph:{title,description,url:canonical,siteName:'Luật Việt Đức',type:'website'}};
}
export function xmlEscape(value:unknown){return String(value).replace(/[<>&"']/g,char=>({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&apos;'}[char]!));}
export const sitemapPageSize=1000;
export function sitemapIndex(total:number,origin=siteOrigin()){
 const count=Math.max(1,Math.ceil(total/sitemapPageSize));
 return '<?xml version="1.0" encoding="UTF-8"?><sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'+Array.from({length:count},(_,i)=>'<sitemap><loc>'+xmlEscape(origin+'/sitemaps/'+i+'.xml')+'</loc></sitemap>').join('')+'</sitemapindex>';
}
export function sitemapDocument(entries:{path:string;updatedAt?:string}[],origin=siteOrigin()){
 return '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'+entries.map(entry=>'<url><loc>'+xmlEscape(origin+entry.path)+'</loc>'+(entry.updatedAt&&!Number.isNaN(Date.parse(entry.updatedAt))?'<lastmod>'+new Date(entry.updatedAt).toISOString()+'</lastmod>':'')+'</url>').join('')+'</urlset>';
}
