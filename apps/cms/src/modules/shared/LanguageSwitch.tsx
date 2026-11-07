'use client';
import {useLocale} from './locale';
export function LanguageSwitch(){
 const {language,setLanguage}=useLocale();
 return <div className="lvd-language-switch"><button type="button" aria-label={language==='de'?'Zu Vietnamesisch wechseln':'Chuyển sang tiếng Đức'} onClick={()=>setLanguage(language==='vi'?'de':'vi')}><img src={'/assets/flags/'+(language==='vi'?'vn':'de')+'.svg'} width="20" height="14" alt=""/>{language.toUpperCase()}</button></div>;
}
