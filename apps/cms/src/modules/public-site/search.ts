import type {Group,Topic} from './types';
export const normalize=(value:string)=>value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/gi,'d').toLowerCase().replace(/\s+/g,' ').trim();
export function catalogueTopics(groups:Group[],query='',group='',order='source'):Topic[]{
 const tokens=normalize(query).replace(/\bbhxh\b/g,'bao hiem xa hoi').replace(/\bvollmacht\b/g,'uy quyen').replace(/\berbrecht\b/g,'thua ke').split(/\s+/).filter(Boolean);
 const topics=groups.filter(g=>!group||g.id===group).flatMap(g=>g.titles.map((title,index)=>({id:g.id+'-'+String(index+1).padStart(2,'0'),slug:g.slugs[index],title,groupId:g.id,index:index+1,search:normalize(title+' '+g.title+' '+g.titleDe)}))).filter(topic=>tokens.every(token=>topic.search.includes(token))).map(({search,...topic})=>topic);
 return order==='a-z'?topics.sort((a,b)=>a.title.localeCompare(b.title,'vi')):topics;
}
export function photoForArticle(article:{slug:string;title:string}){
 const known:Record<string,string>={'deutschlandticket-2027':'train','mindestlohn-2026':'work','kindergeld-2026':'family','minijob-603':'work'};
 if(known[article.slug])return known[article.slug];
 const title=normalize(article.title);return /gia dinh|ket hon|con|thua ke/.test(title)?'family':/nha|dat|thue/.test(title)?'housing':/lao dong|viec lam|luong/.test(title)?'work':'berlin';
}

// Only retained catalogue groups have their own topic page. Custom CMS
// categories use the library filter instead of linking to an unknown route.
export function categoryDestination(slug:string,{catalogue=false,country='VN'}:{catalogue?:boolean;country?:string}={}){
 if(slug.startsWith('tin-'))return '/tin-tuc?'+new URLSearchParams({nhom:slug.slice(4)});
 const root='/phap-luat/'+(country==='DE'?'duc':'viet-nam');
 return catalogue?(country==='DE'?root+'/':'/chu-de/')+encodeURIComponent(slug):root+'?'+new URLSearchParams({'linh-vuc':slug});
}
