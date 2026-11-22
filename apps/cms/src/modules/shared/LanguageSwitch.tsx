'use client';
import {useLocale} from './locale';
export function LanguageSwitch(){
 const {language,setLanguage}=useLocale();
 return <div className="lvd-language-switch"><button type="button" role="switch" aria-checked={language==='de'} aria-label={language==='de'?'Deutsch':'Tiếng Đức'} title={language==='de'?'Zu Vietnamesisch wechseln':'Chuyển sang tiếng Đức'} onClick={()=>setLanguage(language==='vi'?'de':'vi')}>{(['vi','de'] as const).map(value=><img key={value} src={'/assets/flags/'+(value==='vi'?'vn':'de')+'.svg'} width="24" height="16" alt="" data-active={language===value}/>)}</button></div>;
}
