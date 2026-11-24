'use client';
import {AppLink} from '../shared/AppLink';
import {useRouter} from 'next/navigation';
import {isPageLink} from '../shared/navigation';
import type {PublicCopy} from './types';
import {Arrow,Breadcrumb,usePublicCopy} from './ui';
import {publicHref} from '../shared/public-shell.mjs';
export function canonicalCopy(html:string){return html.replace(/href="(#[/][^"]*)"/g,(_,href:string)=>'href="'+publicHref(href).replaceAll('&','&amp;').replaceAll('"','&quot;')+'"');}
export function Policy({copy,extra=''}:{copy:PublicCopy;extra?:string}){const l=usePublicCopy(),router=useRouter();return <><div onClick={event=>{if(event.defaultPrevented||event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;const link=(event.target as Element).closest<HTMLAnchorElement>('a[href]');if(!link||!event.currentTarget.contains(link)||link.hasAttribute('download')||link.target&&link.target!=='_self')return;const href=link.getAttribute('href')!;if(isPageLink(href)){event.preventDefault();router.push(href);}}} dangerouslySetInnerHTML={{__html:canonicalCopy(l(copy.vi,copy.de))}}/>{extra&&<p className="container native-policy-extra">{extra}</p>}</>;}
export function Help(){const l=usePublicCopy();return <div className="container page"><Breadcrumb title={l('Trợ giúp','Hilfe')}/><header className="page-heading"><h1>{l('Trợ giúp','Hilfe')}</h1></header><div className="prose"><h2>{l('Đặt câu hỏi','Fragen stellen')}</h2><p>{l('Nêu vấn đề cần giải quyết. Bạn có thể hỏi tiếp trong cùng cuộc trò chuyện.','Beschreiben Sie Ihr Anliegen. Sie können im selben Gespräch nachfragen.')}</p><AppLink href="/hoi-dap">{l('Mở trò chuyện','Chat öffnen')} <Arrow/></AppLink><h2>{l('Tra cứu kiến thức','Wissen nachschlagen')}</h2><p>{l('Nhập từ khóa trong thư viện hoặc chọn một lĩnh vực để xem nội dung liên quan.','Suchen Sie in der Bibliothek oder wählen Sie ein Rechtsgebiet.')}</p><AppLink href="/thu-vien">{l('Thư viện','Bibliothek')} <Arrow/></AppLink></div></div>;}
