'use client';
import {createContext,useContext,useEffect,useSyncExternalStore,type ReactNode} from 'react';
import translations from './de.json';
import vietnamese from './vi.json';
import {withAsciiTransition} from './ascii-transition';
type Language='vi'|'de';
const dictionary:Record<string,string>=translations;
const vietnameseCopy:Record<string,string>=vietnamese;
let fallback:Language|null=null;
const InitialLanguage=createContext<Language>('vi');
export function LocaleProvider({language,children}:{language:Language;children:ReactNode}){return <InitialLanguage.Provider value={language}>{children}</InitialLanguage.Provider>;}
function snapshot(initial:Language='vi'):Language{try{const cookie=/(?:^|;\s*)lvd-lang=(vi|de)(?:;|$)/.exec(document.cookie)?.[1];if(cookie==='de'||cookie==='vi')return cookie;const saved=sessionStorage.getItem('lvd-lang');return saved==='de'||saved==='vi'?saved:(fallback||initial);}catch{return fallback||initial;}}
function subscribe(notify:()=>void){document.addEventListener('lvd:languagechange',notify);window.addEventListener('storage',notify);return()=>{document.removeEventListener('lvd:languagechange',notify);window.removeEventListener('storage',notify);};}
export function translate(text:string,language:Language,values:Record<string,string|number>={}){const value=language==='de'?(dictionary[text]||text):(vietnameseCopy[text]||text);return value.replace(/\{(\w+)\}/g,(match,key)=>String(values[key]??match));}
export function setLanguage(language:Language){if(snapshot()===language)return;withAsciiTransition(()=>{fallback=language;try{sessionStorage.setItem('lvd-lang',language);}catch{}document.cookie='lvd-lang='+language+'; Path=/; Max-Age=31536000; SameSite=Lax'+(location.protocol==='https:'?'; Secure':'');document.documentElement.lang=language;document.dispatchEvent(new CustomEvent('lvd:languagechange',{detail:{lang:language}}));});}
export function useLocale(){const initial=useContext(InitialLanguage);const language=useSyncExternalStore(subscribe,()=>snapshot(initial),()=>initial);useEffect(()=>{document.documentElement.lang=language;document.cookie='lvd-lang='+language+'; Path=/; Max-Age=31536000; SameSite=Lax'+(location.protocol==='https:'?'; Secure':'');},[language]);return {language,setLanguage,t:(text:string,values?:Record<string,string|number>)=>translate(text,language,values)};}
export function LocaleText({text}:{text:string}){const {t}=useLocale();return <>{t(text)}</>;}
export function LocaleDate({value}:{value:string}){const {language}=useLocale();return <>{new Date(value).toLocaleDateString(language==='de'?'de-DE':'vi-VN')}</>;}

export function LocaleNav({label,className,children}:{label:string;className?:string;children:React.ReactNode}){const {t}=useLocale();return <nav className={className} aria-label={t(label)}>{children}</nav>;}
