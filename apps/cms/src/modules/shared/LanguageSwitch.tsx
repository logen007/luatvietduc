'use client';
import {useLocale} from './locale';
export function LanguageSwitch(){
 const {language,setLanguage}=useLocale();
 return <div className="lvd-language-switch" role="group" aria-label={language==='de'?'Sprache':'Ngôn ngữ'}>{(['vi','de'] as const).map(value=><button key={value} type="button" aria-label={value==='vi'?'Tiếng Việt':'Deutsch'} title={value==='vi'?'Tiếng Việt':'Deutsch'} aria-pressed={language===value} onClick={()=>setLanguage(value)}><img src={'/assets/flags/'+(value==='vi'?'vn':'de')+'.svg'} width="24" height="16" alt=""/></button>)}</div>;
}
