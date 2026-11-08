import {articleSummary} from './article-summary';
import {pool} from '../shared/db';
import {cache} from 'react';
import {getPayload,type Where} from 'payload';
import config from '../../payload.config';
import {publicArticles} from '../../access/articles';
import {sitemapArticles} from './seo';
import {publicSettings} from '../settings/view';
import content from './content.json';
import originalPosts from '../legacy/posts.json';
import {photoForArticle,normalize,categoryDestination} from './search';
import {keepsLegacyCopy} from './legacy-news';
import type {ArticleList,LegacyNews,Card} from './types';
export {content};
export const publicPayload=cache(()=>getPayload({config}));
export const publicSiteSettings=cache(async()=>publicSettings(await (await publicPayload()).findGlobal({slug:'site-settings',overrideAccess:true,depth:1})));
export const publicArticle=cache(async(slug:string)=>{
 const result=await (await publicPayload()).find({collection:'articles',overrideAccess:false,draft:false,where:{and:[publicArticles,{slug:{equals:slug}}]},limit:1,depth:1});
 return result.docs[0]||null;
});
// Request-local only: a withdrawal or edit is checked again on the next request.
export const publicArticleSummary=cache(async(slug:string)=>{
 const article=await publicArticle(slug);return article?articleSummary(article.body):null;
});
export const publicArticleTranslations=cache(async(group?:string|null)=>{
 if(!group)return [];
 const result=await (await publicPayload()).find({collection:'articles',overrideAccess:false,draft:false,where:{and:[sitemapArticles,{translationGroup:{equals:group}}]},limit:2,depth:0,select:{slug:true,language:true}});
 return result.docs;
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
async function publicSearchIds(query:string){
 // Retrieve identifiers only. Native Payload filters below remain the final
 // authority for public access, taxonomy, country, ordering and pagination.
 const pattern='%'+query.replace(/[!%_]/g,'!$&')+'%';
 const result=await pool.query<{id:number}>(`WITH public_bodies AS (
  SELECT id,title,body LIKE $2 AS rich,
   CASE WHEN body LIKE $2 THEN regexp_replace(regexp_replace(body,$3,' ','gi'),'<[^>]*>','','g') ELSE body END AS body_text
  FROM articles WHERE _status='published' AND review_state='approved'
 ), decoded AS (
  SELECT id,title,rich,CASE WHEN rich THEN
   regexp_replace(
    regexp_replace(
     regexp_replace(
      regexp_replace(
       regexp_replace(
        regexp_replace(body_text,'&(nbsp|#0*160|#x0*a0);',' ','gi'),
        '&(lt|#0*60|#x0*3c);','<','gi'),
       '&(gt|#0*62|#x0*3e);','>','gi'),
      '&(quot|#0*34|#x0*22);','"','gi'),
     '&(apos|#0*39|#x0*27);',chr(39),'gi'),
    '&(amp|#0*38|#x0*26);','&','gi')
   ELSE body_text END AS body_text FROM public_bodies
 ) SELECT id FROM decoded WHERE title ILIKE $1 ESCAPE '!'
  OR (CASE WHEN rich THEN regexp_replace(replace(body_text,chr(160),' '),'[[:space:]]+',' ','g') ELSE body_text END) ILIKE $1 ESCAPE '!'`,[
   pattern,'<div data-lvd-richtext="1">%',
   '<[[:space:]]*/?[[:space:]]*(p|h[2-4]|div|blockquote|ul|ol|li|hr|br|table|thead|tbody|tr|th|td)([[:space:]][^>]*)?/?>',
  ]);
 return result.rows.map(row=>row.id);
}
const newsCategoryNames:Record<string,[string,string]>={'doi-song':['Đời sống & đi lại','Alltag & Mobilität'],'cu-tru':['Cư trú & giấy tờ','Aufenthalt & Dokumente'],'viec-lam':['Việc làm','Arbeit'],'gia-dinh':['Gia đình','Familie'],'hoc-tap':['Học tập','Bildung'],'cong-dong':['Cộng đồng','Community']};
function cardCategory(slug:string,name:string,country='VN'){
 const news=slug.startsWith('tin-')?newsCategoryNames[slug.slice(4)]:undefined;
 const group=content.groups.find(group=>group.id===slug);
 return {name:news?.[0]||name,nameDe:news?.[1]||group?.titleDe,href:categoryDestination(slug,{catalogue:Boolean(group),country})};
}
export async function publicNewsList({query='',group='',editorialType='',page=1,limit=12}={}){
 const [cms,archive]=await Promise.all([publicArticleList({kind:'news',query,group:group?'tin-'+group:'',editorialType,page,limit}),publicLegacyNews()]);
 const legacy=archive.filter(story=>(!group||story.category===group)&&(!editorialType||story.type===editorialType)&&(!query||normalize(story.title+' '+story.summary).includes(normalize(query))));
 const offset=Math.max(0,(page-1)*limit-cms.totalDocs),fallback:Card[]=legacy.slice(offset,offset+Math.max(0,limit-cms.docs.length)).map((story,index)=>({id:-1-offset-index,slug:story.id,title:story.title,summary:story.summary,photo:story.photo,published:story.published,readingMinutes:articleSummary([...story.paragraphs,...(story.points||[])].join(' ')).readingMinutes,category:cardCategory('tin-'+story.category,newsCategoryNames[story.category]?.[0]||story.category),kind:story.type,language:'vi',href:'/tin/'+story.id}));
 const totalDocs=cms.totalDocs+legacy.length;
 return {...cms,docs:[...cms.docs,...fallback],totalDocs,totalPages:Math.max(1,Math.ceil(totalDocs/limit))};
}
export async function publicArticleList({kind='legal',query='',group='',country='',editorialType='',order='source',page=1,limit=12}:{kind?:'legal'|'news';query?:string;group?:string;country?:string;editorialType?:string;order?:string;page?:number;limit?:number}={}):Promise<ArticleList>{
 const where:Where[]=[publicArticles,kind==='news'?{or:[{kind:{equals:'news'}},{slug:{in:content.newsSlugs}}]}:{and:[{kind:{not_equals:'news'}},{slug:{not_in:content.newsSlugs}}]}];
 const keyword=query.trim().replace(/\s+/g,' ');
 if(keyword){const ids=await publicSearchIds(keyword);if(!ids.length)return {docs:[],totalDocs:0,totalPages:1,page};where.push({id:{in:ids}});}
 if(kind==='news'&&editorialType==='guide')where.push({kind:{not_equals:'news'}});
 if(kind==='news'&&editorialType==='news')where.push({kind:{equals:'news'}});
 if(country)where.push({jurisdiction:{in:[country,'BOTH']}});
 if(group){const category=(await publicCategories()).find(category=>category.slug===group);if(!category)return {docs:[],totalDocs:0,totalPages:1,page};where.push({categories:{in:[category.id]}});}
 const [result,categories]=await Promise.all([
  publicPayload().then(payload=>payload.find({
   collection:'articles',overrideAccess:false,draft:false,where:{and:where},
   sort:order==='a-z'?['title','id']:order==='newest'?['-createdAt','-id']:['-updatedAt','id'],depth:0,page,limit,
   select:{id:true,slug:true,title:true,body:true,language:true,kind:true,jurisdiction:true,createdAt:true,categories:true},
  })),
  publicCategories(),
 ]);
 const categoriesById=new Map(categories.map(category=>[category.id,category]));
 const docs=result.docs.map(article=>{
  const categoryId=article.categories?.[0];
  const category=categoryId?categoriesById.get(typeof categoryId==='number'?categoryId:categoryId.id):undefined;
  const summary=articleSummary(article.body);
  return {
   id:article.id,slug:article.slug,title:article.title,summary:summary.summary,
   kind:article.kind||'article',language:article.language,photo:photoForArticle(article),
   published:article.createdAt,readingMinutes:summary.readingMinutes,
   ...(category?{category:cardCategory(category.slug,category.name,country||article.jurisdiction)}:{}),
  };
 });
 return {docs,page:result.page||page,totalPages:result.totalPages,totalDocs:result.totalDocs};
}
