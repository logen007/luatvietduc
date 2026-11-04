'use client';
import {useEffect,useSyncExternalStore} from 'react';
import translations from './de.json';
type Language='vi'|'de';
const dictionary:Record<string,string>=translations;
function snapshot():Language{try{return sessionStorage.getItem('lvd-lang')==='de'?'de':'vi';}catch{return 'vi';}}
function subscribe(notify:()=>void){document.addEventListener('lvd:languagechange',notify);window.addEventListener('storage',notify);return()=>{document.removeEventListener('lvd:languagechange',notify);window.removeEventListener('storage',notify);};}
export function translate(text:string,language:Language,values:Record<string,string|number>={}){const value=language==='de'?(dictionary[text]||text):text;return value.replace(/\{(\w+)\}/g,(match,key)=>String(values[key]??match));}
export function setLanguage(language:Language){try{sessionStorage.setItem('lvd-lang',language);}catch{}document.documentElement.lang=language;document.dispatchEvent(new CustomEvent('lvd:languagechange',{detail:{lang:language}}));}
export function useLocale(){const language=useSyncExternalStore(subscribe,snapshot,()=> 'vi' as Language);useEffect(()=>{document.documentElement.lang=language;},[language]);return {language,setLanguage,t:(text:string,values?:Record<string,string|number>)=>translate(text,language,values)};}
export function LocaleText({text}:{text:string}){const {t}=useLocale();return <>{t(text)}</>;}
export function LocaleDate({value}:{value:string}){const {language}=useLocale();return <>{new Date(value).toLocaleDateString(language==='de'?'de-DE':'vi-VN')}</>;}

export function LocaleNav({label,className,children}:{label:string;className?:string;children:React.ReactNode}){const {t}=useLocale();return <nav className={className} aria-label={t(label)}>{children}</nav>;}
