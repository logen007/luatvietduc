// One public presentation contract for the retained pages and React pages.
// No session, provider credentials or private settings belong here.
const publicAliases={'/tra-cuu':'/thu-vien','/chu-de':'/thu-vien','/hoi-dap':'/thu-vien?xem=tat-ca','/ve-chuyen-trang':'/gioi-thieu','/chinh-sach-thong-tin':'/quyen-rieng-tu','/hoi-dap-ai':'/tro-chuyen','/gui-cau-hoi':'/tro-chuyen','/dang-nhap':'/tai-khoan?mode=signin','/tai-khoan/dang-nhap':'/tai-khoan?mode=signin','/khong-gian-ca-nhan':'/tai-khoan','/chuyen-vien':'/admin/inbox','/thu-vien-quan-tri':'/admin/knowledge','/so-do':'/tro-giup','/song-o-duc':'/tin-tuc?loai=guide','/cam-nang':'/tin-tuc?loai=guide','/goc-viet-kieu':'/tin-tuc?loai=guide','/tin-phap-luat':'/tin-tuc','/cong-dong':'/tin-tuc?nhom=cong-dong'};
export const legacyGroupAliases={'gia-dinh':'hon-nhan-gia-dinh','lao-dong':'lao-dong-viec-lam-bhxh','cu-tru':'xuat-nhap-canh-cu-tru','nha-dat':'nha-o-dat-dai','dau-tu':'dau-tu-kinh-doanh-thuong-mai','ngan-hang':'tai-chinh-ngan-hang-bao-hiem','hanh-chinh':'to-tung-hanh-chinh'};
export function publicHref(value){
 let raw=String(value||'').trim();if(raw.startsWith('#/'))raw='/'+raw;
 if(raw.startsWith('/#/'))raw=raw.slice(2);
 if(!raw.startsWith('/')||raw.startsWith('//')||/[\\\u0000-\u001f]/.test(raw))return raw;
 const parsed=new URL(raw,'https://internal.invalid'),path=parsed.pathname.replace(/\/$/,'')||'/';
 let target=publicAliases[path]||path;
 const group=/^(\/chu-de\/|\/phap-luat\/(?:viet-nam|duc)\/)([^/]+)(.*)$/.exec(path);
 if(group&&legacyGroupAliases[group[2]])target=group[1]+legacyGroupAliases[group[2]]+group[3];
 if(/^\/hoi-dap\/[^/]+$/.test(path))target='/bai-viet/'+path.split('/')[2];
 if(/^\/tai-khoan\/cau-hoi\/[^/]+$/.test(path)){target='/tro-chuyen';parsed.searchParams.set('conversation',path.split('/').at(-1));}
 const result=new URL(target,'https://internal.invalid');for(const [key,value] of parsed.searchParams)result.searchParams.set(key,value);
 if(result.pathname==='/gioi-thieu'&&result.searchParams.get('muc')==='doi-ngu'){result.searchParams.delete('muc');result.hash='doi-ngu';}
 if(parsed.hash)result.hash=parsed.hash;
 return result.pathname+result.search+result.hash;
}
export function legacyTarget(hash){
 if(!String(hash).startsWith('#/'))return null;
 const target=publicHref(hash);
 return target.startsWith('/')&&!target.startsWith('//')&&!/[\\\u0000-\u001f]/.test(target)?target:null;
}
const safeURL=value=>{
 const raw=String(value||'');
 // Validate again after alias handling: publicHref also serves legacy routing
 // and intentionally returns an unrecognized input unchanged.
 if(/[\\\u0000-\u001f\u007f]/.test(raw))return null;
 const url=publicHref(raw);
 if(url.startsWith('/')){
  if(url.startsWith('//'))return null;
  try{
   const pathname=decodeURIComponent(new URL(url,'https://internal.invalid').pathname);
   return pathname.startsWith('//')||/[\\\u0000-\u001f\u007f]/.test(pathname)||/^\/admin(?:\/|$)/i.test(pathname)?null:url;
  }catch{return null;}
 }
 try{const parsed=new URL(url);return parsed.protocol==='https:'&&!parsed.username&&!parsed.password?url:null;}catch{return null;}
};
export function publicShell(settings={},navigation={primary:[],footer:[]}){
 const primary=[],seen=new Set();
 for(const link of [...navigation.primary,...(settings.navigation||[])]){
  const href=safeURL(link.href||link.url),label=String(link.label||'').trim();
  if(!href||!label||/^\/bai-viet\/?$/.test(href)||seen.has(href))continue;
  seen.add(href);primary.push({key:link.key||href,href,label});
 }
 return {
  name:settings.siteName||'Luật Việt Đức',
  tagline:settings.tagline??'Thông tin pháp luật Việt Nam – Đức.',
  logo:safeURL(settings.logo),
  headerLogoHeight:Math.min(64,Math.max(16,Number(settings.headerLogoHeight)||32)),
  footerLogoHeight:Math.min(120,Math.max(16,Number(settings.footerLogoHeight)||44)),
  accent:/^#[\da-f]{6}$/i.test(settings.accentColor||'')?settings.accentColor:null,
  footerText:String(settings.footerText||'').replace(/Thông tin tham khảo; không thay thế việc xem xét hồ sơ cụ thể\.?/gi,'').trim(),
  primary,footer:navigation.footer.map(column=>({...column,links:column.links.map(([label,href])=>[label,publicHref(href)])})),
 };
}
export function copyright(shell,version){return '© '+shell.name+'.'+(version?' · v'+version:'')+(shell.footerText?' '+shell.footerText:'');}
