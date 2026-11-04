"use client";
import {useLocale} from './locale';
import {usePublicSettings} from '../settings/client';
import {configuredSocialLinks} from './social';
export function SocialLinks(){
 const {t}=useLocale(),settings=usePublicSettings(),links=configuredSocialLinks(settings?.socialLinks||[]);
 if(!links.length)return null;
 return <div className="lvd-footer-social" aria-label={t("Mạng xã hội")}>{links.map((link,index)=><a key={link.id||link.label+'-'+index} className={link.icon?'lvd-social-icon':undefined} href={link.url} aria-label={link.icon?.name||link.label} title={link.icon?.name||link.label} target="_blank" rel="noopener noreferrer">{link.icon?<svg viewBox="0 0 24 24" aria-hidden="true">{link.icon.paths.map((d,i)=><path key={i} d={d} fillRule="evenodd"/>)}</svg>:link.label}</a>)}</div>;
}
