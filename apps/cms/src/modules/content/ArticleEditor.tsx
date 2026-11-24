'use client';
import dynamic from 'next/dynamic';
import type {TextareaFieldClientProps} from 'payload';

// Payload registers field components on every admin route. Keep the registry
// entry light so login, lists, settings and inbox do not download Tiptap.
const RichArticleEditor=dynamic(()=>import('./RichArticleEditor').then(module=>module.ArticleEditor),{
 loading:()=> <div className="field-type textarea lvd-article-editor" aria-busy="true" data-editor-loading="true"><p className="lvd-editor-loading-message" role="status">Đang mở trình soạn thảo…</p></div>,
});
export function ArticleEditor(props:TextareaFieldClientProps){return <RichArticleEditor {...props}/>;}
