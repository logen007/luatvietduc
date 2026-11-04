import icons from '../../../public/social-icons.json';
export type SocialLink={label:string;url:string;id?:string|null};
export function socialIcon(link:SocialLink){
 const label=String(link.label||'').trim().toLowerCase();
 const named=icons.find(icon=>icon.name.toLowerCase()===label);if(named)return named;
 try{const host=new URL(link.url).hostname.toLowerCase();return icons.find(icon=>icon.hosts.some(domain=>host===domain||host.endsWith('.'+domain)));}catch{return undefined;}
}
export function configuredSocialLinks(links:SocialLink[]=[]){
 return links.filter(link=>{try{const url=new URL(String(link.url||'').trim());return url.protocol==='https:'&&!url.username&&!url.password;}catch{return false;}}).map(link=>({...link,url:link.url.trim(),icon:socialIcon(link)}));
}
