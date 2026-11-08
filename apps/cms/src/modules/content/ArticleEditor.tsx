'use client';
import dynamic from 'next/dynamic';
import type {TextareaFieldClientProps} from 'payload';

// Payload registers field components on every admin route. Keep the registry
// entry light so login, lists, settings and inbox do not download Tiptap.
const RichArticleEditor=dynamic(()=>import('./RichArticleEditor').then(module=>module.ArticleEditor),{
 loading:()=> <div className="lvd-rich-editor" aria-busy="true" style={{minHeight:360}}/>,
});
export function ArticleEditor(props:TextareaFieldClientProps){return <RichArticleEditor {...props}/>;}
