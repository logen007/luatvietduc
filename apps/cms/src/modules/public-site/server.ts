import {cache} from 'react';
import {getPayload,type Where} from 'payload';
import config from '../../payload.config';
import {publicArticles} from '../../access/articles';
import {publicSettings} from '../settings/view';
import content from './content.json';
import originalPosts from '../legacy/posts.json';
import {photoForArticle,normalize} from './search';
import {keepsLegacyCopy} from './legacy-news';
import type {ArticleList,LegacyNews,Card} from './types';
export {content};
export const publicPayload=cache(()=>getPayload({config}));
export const publicSiteSettings=cache(async()=>publicSettings(await (await publicPayload()).findGlobal({slug:'site-settings',overrideAccess:true,depth:1})));
export const publicArticle=cache(async(slug:string)=>{
 const result=await (await publicPayload()).find({collection:'articles',overrideAccess:false,draft:false,where:{and:[publicArticles,{slug:{equals:slug}}]},limit:1,depth:1});
 return result.docs[0]||null;
});
export const publicCategories=cache(async()=>{
 const result=await (await publicPayload()).find({collection:'categories',overrideAccess:false,depth:0,limit:1000,sort:'name'});return result.docs;
});
export const publicLegacyNews=cache(async():Promise<LegacyNews[]>=>{
 // Strictly bounded reads of known mirror records, used only for comparison.
 // Private mirror content is never returned to the page or search engine.
 const mirrors=await (await publicPayload()).find({collection:'articles',overrideAccess:true,depth:0,limit:content.newsSlugs.length,where:{slug:{in:content.newsSlugs}},select:{slug:true,title:true,body:true,kind:true,jurisdiction:true,sourceUrl:true,reviewState:true,reviewedAt:true,aiAllowed:true,_status:true}});
 return content.newsStories.filter(story=>keepsLegacyCopy(mirrors.docs.find(mirror=>mirror.slug===story.id),originalPosts.find(post=>post.slug===story.id)));
});
export async function publicNewsList({query='',group='',editorialType='',page=1,limit=12}={}){
 const [cms,archive]=await Promise.all([publicArticleList({kind:'news',query,group:group?'tin-'+group:'',editorialType,page,limit}),publicLegacyNews()]);
 const legacy=archive.filter(story=>(!group||story.category===group)&&(!editorialType||story.type===editorialType)&&(!query||normalize(story.title+' '+story.summary).includes(normalize(query))));
 const offset=Math.max(0,(page-1)*limit-cms.totalDocs),fallback:Card[]=legacy.slice(offset,offset+Math.max(0,limit-cms.docs.length)).map((story,index)=>({id:-1-offset-index,slug:story.id,title:story.title,summary:story.summary,photo:story.photo,kind:story.type,language:'vi',href:'/tin/'+story.id}));
 const totalDocs=cms.totalDocs+legacy.length;
 return {...cms,docs:[...cms.docs,...fallback],totalDocs,totalPages:Math.max(1,Math.ceil(totalDocs/limit))};
}
export async function publicArticleList({kind='legal',query='',group='',country='',editorialType='',order='source',page=1,limit=12}:{kind?:'legal'|'news';query?:string;group?:string;country?:string;editorialType?:string;order?:string;page?:number;limit?:number}={}):Promise<ArticleList>{
 const where:Where[]=[publicArticles,kind==='news'?{or:[{kind:{equals:'news'}},{slug:{in:content.newsSlugs}}]}:{and:[{kind:{not_equals:'news'}},{slug:{not_in:content.newsSlugs}}]}];
 if(query)where.push({or:[{title:{contains:query}},{body:{contains:query}}]});
 if(kind==='news'&&editorialType==='guide')where.push({kind:{not_equals:'news'}});
 if(kind==='news'&&editorialType==='news')where.push({kind:{equals:'news'}});
 if(country)where.push({jurisdiction:{in:[country,'BOTH']}});
 if(group){const category=(await publicCategories()).find(category=>category.slug===group);if(!category)return {docs:[],totalDocs:0,totalPages:1,page};where.push({categories:{in:[category.id]}});}
 const result=await (await publicPayload()).find({collection:'articles',overrideAccess:false,draft:false,where:{and:where},sort:order==='a-z'?['title','id']:['-updatedAt','id'],depth:0,page,limit,select:{id:true,slug:true,title:true,body:true,language:true,kind:true}});
 return {docs:result.docs.map(article=>({id:article.id,slug:article.slug,title:article.title,summary:String(article.body||'').replace(/\s+/g,' ').trim().slice(0,180),kind:article.kind||'article',language:article.language,photo:photoForArticle(article)})),page:result.page||page,totalPages:result.totalPages,totalDocs:result.totalDocs};
}
