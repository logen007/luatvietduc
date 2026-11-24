"use client";
import {useEffect,useState} from 'react';
import icons from '../../../public/social-icons.json';
import {useLocale} from './locale';
import {usePublicSettings} from '../settings/client';
import {configuredSocialLinks} from './social';
export function SocialLinks(){
 const {t}=useLocale(),settings=usePublicSettings(),[catalog,setCatalog]=useState(icons);
 useEffect(()=>{let active=true;fetch('/social-icons.json',{cache:'no-store'}).then(r=>r.ok?r.json():null).then(value=>{if(active&&Array.isArray(value)&&value.every(i=>typeof i.name==='string'&&Array.isArray(i.hosts)&&typeof i.viewBox==='string'&&Array.isArray(i.paths)&&i.paths.every((d:unknown)=>typeof d==='string')))setCatalog(value);}).catch(()=>{});return()=>{active=false;};},[]);
 const links=configuredSocialLinks(settings?.socialLinks||[],catalog);
 if(!links.length)return null;
 return <div className="lvd-footer-social" aria-label={t("Mạng xã hội")}>{links.map((link,index)=><a key={link.id||link.label+'-'+index} className={link.icon?'lvd-social-icon':undefined} href={link.url} aria-label={link.icon?.name||link.label} title={link.icon?.name||link.label} target="_blank" rel="noopener noreferrer">{link.icon?<svg viewBox={link.icon.viewBox} aria-hidden="true">{link.icon.paths.map((d,i)=><path key={i} d={d} fillRule="evenodd"/>)}</svg>:link.label}</a>)}</div>;
}
