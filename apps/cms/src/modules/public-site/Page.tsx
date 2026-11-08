import {cache} from 'react';
import path from 'node:path';
import {notFound,permanentRedirect} from 'next/navigation';
import {getPresentationVersion} from '../shared/presentation-version.mjs';
import {homeBenefitPhotos} from '../shared/public-media.mjs';
import {resolvePublicRoute,positivePage,legacyKeyword,groupAliases} from './routes';
import {content,publicArticle,publicArticleList,publicSiteSettings,publicLegacyNews,publicNewsList,publicCategories} from './server';
import {catalogueTopics} from './search';
import {publicMetadata,canonicalPage,filteredPage,pageSchema,articleSchema} from './seo';
import {StructuredData} from './StructuredData';
import {photo} from './photos';
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
 const selectedCategory=route.kind==='library'&&filter&&!content.groups.some(group=>group.id===topicGroup)?(await publicCategories()).find(category=>category.slug===filter):undefined;
 const articleList=route.kind==='home'?await publicNewsList({limit:3}):route.kind==='news'?await publicNewsList({page,query:keyword,group:newsGroup}):route.kind==='library'?await publicArticleList({group:topicGroup,country:route.country,query:keyword,order:query.get('sap-xep')||'source',page,limit:12}):null;
 const topics=route.kind==='library'&&route.country!=='DE'?catalogueTopics(content.groups,keyword,topicGroup,query.get('sap-xep')||'source'):[];
 if(['library','news'].includes(route.kind)){
  const showTopics=Boolean(route.group||keyword||filter||query.get('xem')==='tat-ca')&&route.country!=='DE';
  const last=Math.max(1,articleList?.totalPages||1,showTopics?Math.ceil(topics.length/20):1);
  if(page>last){query.set('trang',String(last));permanentRedirect(pathname+'?'+query);}
 }
 return {route,settings,group,topic,articleList,topics,page,keyword,story,selectedCategory};
});
const descriptions:Record<string,string>={
 home:'Giải đáp pháp luật Việt Nam và Đức. Tìm thông tin về cư trú, quốc tịch, gia đình, tài sản và công việc; trao đổi với chuyên viên về vấn đề của bạn.',
 library:'Thư viện pháp luật Việt Nam: tìm bài viết theo lĩnh vực về quốc tịch, hôn nhân, thừa kế, nhà đất, lao động và các thủ tục liên quan.',
 news:'Tin tức và đời sống tại Đức: cập nhật về cư trú, giấy tờ, việc làm, gia đình, học tập và cộng đồng người Việt.',
 about:'Tìm hiểu Luật Việt Đức và đội ngũ chuyên gia hỗ trợ các vấn đề pháp luật Việt Nam, Đức, từ giấy tờ đến gia đình, tài sản và công việc.',
 contact:'Liên hệ Luật Việt Đức. Gửi câu hỏi hoặc lời nhắn về vấn đề của bạn và nhận phản hồi qua email.',
 privacy:'Cách Luật Việt Đức thu thập, sử dụng và bảo vệ thông tin tài khoản, hội thoại, tài liệu và các quyền của bạn đối với dữ liệu cá nhân.',
 terms:'Điều khoản sử dụng website, thư viện và dịch vụ hỏi đáp của Luật Việt Đức; phạm vi thông tin và trách nhiệm khi sử dụng.',
 help:'Hướng dẫn sử dụng Luật Việt Đức: tìm bài viết, đăng nhập, gửi câu hỏi, tài liệu và tiếp tục trao đổi với chuyên viên.',
};
function metadataInput(data:Awaited<ReturnType<typeof model>>,pathname:string,query:URLSearchParams){
 const title=data.story?.title||data.topic?.title||data.group?.title||(data.route.kind==='home'?'Giải đáp pháp luật Việt Nam và Đức':data.route.title);
 const description=data.story?.summary||(data.group?`Tìm hiểu ${data.group.title.toLocaleLowerCase('vi')} trong thư viện pháp luật ${data.route.country==='DE'?'Đức':'Việt Nam'}. Xem các chủ đề, bài viết và gửi câu hỏi về vấn đề của bạn.`:data.route.country==='DE'?'Thư viện pháp luật Đức: thông tin về cư trú, quốc tịch, gia đình, công việc và các thủ tục dành cho người Việt tại Đức.':descriptions[data.route.kind]||data.route.title);
 return {title,path:canonicalPage(data.group?(data.route.country==='DE'?'/phap-luat/duc/':'/chu-de/')+data.group.id+(data.route.topic?'/'+data.route.topic:''):pathname,query),description,enabled:data.settings.publicIndexingEnabled===true,indexable:data.route.kind!=='topic'&&pathname!=='/tim-kiem'&&!filteredPage(query)&&!(data.route.country==='DE'&&!data.articleList?.totalDocs),...(data.route.kind==='home'?{image:data.settings.heroBanner.poster}:{}),...(data.story?{image:photo(data.story.photo,1440).src,article:{published:data.story.published||undefined,modified:data.story.checked}}:{})};
}
export async function pageMetadata(pathname:string,query:URLSearchParams){return publicMetadata(metadataInput(await model(pathname,query.toString()),pathname,query));}
export async function PublicPage({path:pathname,query}:{path:string;query:URLSearchParams}){
 const data=await model(pathname,query.toString()),{route,group,topic,articleList,page,topics}=data;
 const publicDirectory=path.join(process.cwd(),'public');
 const revision=getPresentationVersion(publicDirectory,['editorial-ui.css']),scriptRevision=getPresentationVersion(publicDirectory,['editorial-ui.js']);
 const section=['library','topic'].includes(route.kind)?'lookup':['news','legacy-news'].includes(route.kind)?'news':route.kind==='about'?'about':'';
 const groups=content.groups.map(({titles,slugs,...group})=>group),groupView=group?groups.find(item=>item.id===group.id):undefined;
 const displayQuery=new URLSearchParams(query);if(data.keyword&&!displayQuery.get('q'))displayQuery.set('q',data.keyword);const filter=displayQuery.get('linh-vuc');if(filter&&groupAliases[filter])displayQuery.set('linh-vuc',groupAliases[filter]);
 const metadata=metadataInput(data,pathname,query);
 const schema=data.story?articleSchema({title:data.story.title,path:metadata.path,description:data.story.summary,image:photo(data.story.photo,1440).src,published:data.story.published,modified:data.story.checked,parent:{href:'/tin-tuc',label:'Tin tức & đời sống'},news:true}):pageSchema({...metadata,home:route.kind==='home'});
 return <><StructuredData value={schema}/><PublicFrame revision={revision} scriptRevision={scriptRevision} home={route.kind==='home'} articleHero={route.kind==='legacy-news'} section={section}>
  {route.kind==='home'&&articleList&&<Home banner={data.settings.heroBanner} groups={groups} partners={content.partners} news={articleList} revision={getPresentationVersion(publicDirectory,['customer-chat.css'])} benefitPhotos={homeBenefitPhotos(path.join(process.cwd(),'public'))}/>}
  {route.kind==='library'&&articleList&&<Library key={pathname+'?'+displayQuery.toString()} selectedCategory={data.selectedCategory?{id:data.selectedCategory.slug,title:data.selectedCategory.name}:undefined} groups={groups} group={groupView} country={route.country} topics={topics.slice((page-1)*20,page*20)} total={topics.length} page={page} path={pathname} query={displayQuery.toString()} articles={articleList}/>}
  {route.kind==='topic'&&groupView&&topic&&<TopicPage group={groupView} topic={topic}/>}
  {route.kind==='news'&&articleList&&<News key={query.toString()} articles={articleList} query={query.toString()} categories={content.newsCategories}/>}
  {route.kind==='legacy-news'&&data.story&&<LegacyStory story={data.story}/>}
  {route.kind==='about'&&<About team={content.team}/>}
  {route.kind==='privacy'&&<Policy copy={content.policies.privacy} extra={data.settings.privacyText||''}/>}
  {route.kind==='terms'&&<Policy copy={content.policies.terms}/>}
  {route.kind==='contact'&&<Contact/>}
  {route.kind==='help'&&<Help/>}
 </PublicFrame></>;
}
