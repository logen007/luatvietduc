// A deterministic, read-only import of the owner's existing public copy. The
// active React pages consume this snapshot, never execute the legacy renderer.
import fs from 'node:fs';
import vm from 'node:vm';
import {createHash} from 'node:crypto';
const base=new URL('../../../',import.meta.url);
const sources=['assets/catalog-source.js','assets/bilingual.js','assets/catalog.js','assets/site-features.js','assets/legal-pages.js','assets/legal-de.js','apps/cms/src/presentation/legal-runtime-js/01-information-pages.js','assets/news-content.js'];
export function importPublicContent(){
 const window={addEventListener(){},LVD_CONTENT:{articles:[]}},document={addEventListener(){},querySelectorAll(){return[];},documentElement:{}};
 const context=vm.createContext({window,document,URLSearchParams,sessionStorage:{getItem(){return null;}},setTimeout(){},queueMicrotask(){}});
 const bytes=sources.map(name=>fs.readFileSync(new URL(name,base),'utf8'));
 bytes.forEach((source,index)=>{
  vm.runInContext(source,context,{filename:sources[index],timeout:1000});
 });
 const source=window.LVD_CATALOG_SOURCE;
 const postSource=fs.readFileSync(new URL('apps/cms/src/modules/legacy/posts.json',base),'utf8'),posts=JSON.parse(postSource);
 const groups=source.groups.map((g,index)=>({id:g.id,title:g.title,titleDe:window.LVD_I18N.groupTitle(g.title,'de'),icon:g.icon,index:index+1,count:g.titles.length,titles:g.titles,slugs:g.titles.map((title,i)=>posts.find(post=>post.category===g.id&&post.title===title)?.slug||g.id+'-'+String(i+1).padStart(2,'0'))}));
 if(groups.length!==16||groups.reduce((n,g)=>n+g.count,0)!==303)throw new Error('Catalogue preservation failed');
 const policies=Object.fromEntries(['privacy','terms'].map(kind=>[kind,{vi:window.LVD_LEGAL[kind](),de:window.LVD_LEGAL_DE[kind]()}]));
 for(const policy of Object.values(policies))for(const html of Object.values(policy))if(/<script|\son\w+\s*=|javascript:/i.test(html))throw new Error('Policy snapshot contains active content');
 const partners=window.LVD_FEATURES.partnerItems.map(item=>{
  const filename=new URL(item.logo).pathname.split('/').at(-1).toLowerCase().replace(/\.(png|jpe?g)$/i,'.webp');
  const logo='/assets/logos/'+filename;
  if(!fs.existsSync(new URL('.'+logo,base)))throw new Error('Missing packaged partner logo: '+filename);
  return {...item,logo};
 });
 return {sourceHash:createHash('sha256').update(bytes.join('\0')).update(postSource).digest('hex'),groups,articleAliases:window.LVD_CATALOG.articleAliases,team:window.LVD_FEATURES.team,partners,newsSlugs:window.LVD_NEWS.stories.map(story=>story.id),newsStories:window.LVD_NEWS.stories,newsCategories:window.LVD_NEWS.categories,policies};
}
const target=new URL('../src/modules/public-site/content.json',import.meta.url);
const serialized=JSON.stringify(importPublicContent(),null,2)+'\n';
if(process.argv.includes('--check')){
 if(fs.readFileSync(target,'utf8')!==serialized)throw new Error('Public content snapshot is stale; run node scripts/import-public-content.mjs');
}else if(process.argv[1]&&new URL('file://'+process.argv[1]).href===import.meta.url){fs.mkdirSync(new URL('.',target),{recursive:true});fs.writeFileSync(target,serialized);}
