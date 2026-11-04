// One public presentation contract for the retained pages and React pages.
// No session, provider credentials or private settings belong here.
const safeURL=value=>{
 const url=String(value||'').trim();
 if(url.startsWith('/')&&!url.startsWith('//')&&!/^\/admin(?:\/|$)/.test(url))return url;
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
  tagline:settings.tagline??'Thông tin pháp luật Việt Nam & Đức.',
  logo:safeURL(settings.logo),
  accent:/^#[\da-f]{6}$/i.test(settings.accentColor||'')?settings.accentColor:null,
  footerText:String(settings.footerText||'').replace(/Thông tin tham khảo; không thay thế việc xem xét hồ sơ cụ thể\.?/gi,'').trim(),
  primary,footer:navigation.footer,
 };
}
export function copyright(shell,version){return '© '+shell.name+'.'+(version?' · v'+version:'')+(shell.footerText?' '+shell.footerText:'');}
