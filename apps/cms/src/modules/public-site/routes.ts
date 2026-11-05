import {publicHref,legacyGroupAliases} from '../shared/public-shell.mjs';
export type PublicRoute={kind:'home'|'library'|'topic'|'news'|'legacy-news'|'about'|'contact'|'privacy'|'terms'|'help';path:string;title:string;country?:'VN'|'DE';group?:string;topic?:number;slug?:string};
export const publicPages=[
 {kind:'home',path:'/',title:'Luật Việt Đức'},
 {kind:'library',path:'/thu-vien',title:'Pháp luật Việt Nam',country:'VN'},
 {kind:'news',path:'/tin-tuc',title:'Tin tức & đời sống'},
 {kind:'about',path:'/gioi-thieu',title:'Giới thiệu'},
 {kind:'contact',path:'/lien-he',title:'Liên hệ'},
 {kind:'privacy',path:'/quyen-rieng-tu',title:'Quyền riêng tư'},
 {kind:'terms',path:'/dieu-khoan',title:'Điều khoản sử dụng'},
 {kind:'help',path:'/tro-giup',title:'Trợ giúp'},
] as const;
export const groupAliases=legacyGroupAliases;
export function resolvePublicRoute(path:string):PublicRoute|null{
 const page=publicPages.find(page=>page.path===path);if(page)return {...page};
 if(path==='/tim-kiem')return {kind:'library',path,title:'Kết quả tìm kiếm',country:'VN'};
 const story=/^\/tin\/([a-z0-9-]+)$/.exec(path);if(story)return {kind:'legacy-news',path,title:'Tin tức',slug:story[1]};
 const match=/^\/(?:phap-luat\/(viet-nam|duc)(?:\/(.*))?|chu-de\/(.+))$/.exec(path);
 if(!match)return null;
 const country=match[1]==='duc'?'DE':'VN',parts=(match[2]||match[3]||'').split('/').filter(Boolean);
 if(parts.length>2||parts[1]&&(!/^\d{1,2}$/.test(parts[1])||Number(parts[1])<1))return null;
 const group=parts[0]?groupAliases[parts[0]]||parts[0]:undefined,topic=parts[1]?Number(parts[1]):undefined;
 return {kind:topic?'topic':'library',path,title:country==='DE'?'Pháp luật Đức':country==='VN'?'Pháp luật Việt Nam':'Thư viện',country,group,topic};
}
export function redirectTarget(path:string,query:URLSearchParams){
 const target=publicHref(path);if(target===path)return null;
 const result=new URL(target,'https://internal.invalid');for(const [key,value] of query)result.searchParams.set(key,value);return result.pathname+result.search+result.hash;
}
export function positivePage(value:unknown){const n=Number(value||1);return Number.isSafeInteger(n)&&n>0&&n<=10000?n:1;}
export function queryParams(value:Record<string,string|string[]|undefined>){const result=new URLSearchParams();for(const [key,v] of Object.entries(value))if(typeof v==='string')result.set(key,v);return result;}
export function legacyKeyword(query:URLSearchParams){const situations:Record<string,string>={'uy-quyen':'ủy quyền','thua-ke':'thừa kế','nha-dat':'nhà đất','giay-to':'giấy tờ','dau-tu':'đầu tư','tien-thue':'chuyển tiền'};return (query.get('q')||situations[query.get('tinh-huong')||'']||'').trim().slice(0,180);}
