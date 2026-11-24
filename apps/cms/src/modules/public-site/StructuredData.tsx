import {jsonLd} from './seo';
export function StructuredData({value}:{value:unknown}){return <script type="application/ld+json" dangerouslySetInnerHTML={{__html:jsonLd(value)}}/>;}
