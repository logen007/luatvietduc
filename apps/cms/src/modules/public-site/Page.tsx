import {cache} from 'react';
import path from 'node:path';
import {notFound,permanentRedirect} from 'next/navigation';
import {getPresentationVersion} from '../shared/presentation-version.mjs';
import {resolvePublicRoute,positivePage,legacyKeyword,groupAliases} from './routes';
import {content,publicArticle,publicArticleList,publicSiteSettings,publicLegacyNews,publicNewsList} from './server';
import {catalogueTopics} from './search';
import {publicMetadata} from './seo';
import {PublicFrame} from './Frame';
import {Home} from './Home';
import {Library,TopicPage} from './Library';
import {News,LegacyStory} from './News';
import {About,Policy,Help} from './Information';
import {Contact} from './Contact';
const model=cache(async(pathname:string,queryString:string)=>{
 const route=resolvePublicRoute(pathname);if(!route)notFound();
 const query=new URLSearchParams(queryString),page=positivePage(query.get('trang')),keyword=legacyKeyword(query),group=content.groups.find(group=>group.id===route.group);
 if(route.group&&!group)notFound();
 const settings=await publicSiteSettings();
 let story=null;
 if(route.kind==='legacy-news'){
  if(await publicArticle(route.slug!))permanentRedirect('/bai-viet/'+route.slug);
  story=(await publicLegacyNews()).find(story=>story.id===route.slug)||null;if(!story)notFound();
 }
 let topic=null;
 if(route.kind==='topic'){
  if(!group||route.country==='DE'||!route.topic||route.topic>group.count)notFound();
  topic={id:group.id+'-'+String(route.topic).padStart(2,'0'),slug:group.slugs[route.topic-1],title:group.titles[route.topic-1],groupId:group.id,index:route.topic};
  if(await publicArticle(topic.slug))permanentRedirect('/bai-viet/'+topic.slug);
 }
 const newsGroup=query.get('nhom')||'';
 const filter=query.get('linh-vuc')||'',topicGroup=route.group||groupAliases[filter]||filter;
 const articleList=route.kind==='home'?await publicNewsList({limit:3}):route.kind==='news'?await publicNewsList({page,query:keyword,group:newsGroup}):route.kind==='library'?await publicArticleList({group:topicGroup,country:route.country,query:keyword,order:query.get('sap-xep')||'source',page,limit:12}):null;
 const topics=route.kind==='library'&&route.country!=='DE'?catalogueTopics(content.groups,keyword,topicGroup,query.get('sap-xep')||'source'):[];
 if(['library','news'].includes(route.kind)){
  const showTopics=Boolean(route.group||keyword||filter||query.get('xem')==='tat-ca')&&route.country!=='DE';
  const last=Math.max(1,articleList?.totalPages||1,showTopics?Math.ceil(topics.length/20):1);
  if(page>last){query.set('trang',String(last));permanentRedirect(pathname+'?'+query);}
 }
 return {route,settings,group,topic,articleList,topics,page,keyword,story};
});
export async function pageMetadata(pathname:string,query:URLSearchParams){
 const data=await model(pathname,query.toString());
 return publicMetadata({title:data.story?.title||data.topic?.title||data.group?.title||data.route.title,path:pathname,description:data.story?.summary||(data.route.kind==='home'?'Giải đáp và thư viện pháp luật Việt Nam, Đức.':data.group?.title||data.route.title),enabled:data.settings.publicIndexingEnabled===true,indexable:data.route.kind!=='topic'&&pathname!=='/tim-kiem'&&!query.size&&!(data.route.country==='DE'&&data.group&&!data.articleList?.totalDocs)});
}
export async function PublicPage({path:pathname,query}:{path:string;query:URLSearchParams}){
 const data=await model(pathname,query.toString()),{route,group,topic,articleList,page,topics}=data;
 const revision=getPresentationVersion(path.join(process.cwd(),'public'));
 const section=['library','topic'].includes(route.kind)?'lookup':['news','legacy-news'].includes(route.kind)?'news':route.kind==='about'?'about':'';
 const groups=content.groups.map(({titles,slugs,...group})=>group),groupView=group?groups.find(item=>item.id===group.id):undefined;
 const displayQuery=new URLSearchParams(query);if(data.keyword&&!displayQuery.get('q'))displayQuery.set('q',data.keyword);const filter=displayQuery.get('linh-vuc');if(filter&&groupAliases[filter])displayQuery.set('linh-vuc',groupAliases[filter]);
 return <PublicFrame revision={revision} home={route.kind==='home'} articleHero={route.kind==='legacy-news'} section={section}>
  {route.kind==='home'&&articleList&&<Home groups={groups} partners={content.partners} news={articleList}/>}
  {route.kind==='library'&&articleList&&<Library groups={groups} group={groupView} country={route.country} topics={topics.slice((page-1)*20,page*20)} total={topics.length} page={page} path={pathname} query={displayQuery.toString()} articles={articleList}/>}
  {route.kind==='topic'&&groupView&&topic&&<TopicPage group={groupView} topic={topic}/>}
  {route.kind==='news'&&articleList&&<News articles={articleList} query={query.toString()} categories={content.newsCategories}/>}
  {route.kind==='legacy-news'&&data.story&&<LegacyStory story={data.story}/>}
  {route.kind==='about'&&<About team={content.team}/>}
  {route.kind==='privacy'&&<Policy copy={content.policies.privacy} extra={data.settings.privacyText||''}/>}
  {route.kind==='terms'&&<Policy copy={content.policies.terms}/>}
  {route.kind==='contact'&&<Contact/>}
  {route.kind==='help'&&<Help/>}
 </PublicFrame>;
}
