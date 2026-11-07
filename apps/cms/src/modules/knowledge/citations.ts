import type {Faq} from '../assistant/faq';
export function internalSourceURL(value:unknown){
 if(typeof value!=='string')return false;
 try{return new URL(value,'https://luatvietduc.com').pathname.startsWith('/service/knowledge-source/');}catch{return false;}
}
export function answerCitation(source:Faq){
 return {id:source.id,title:source.title,...(source.article_origin_id&&!internalSourceURL(source.source_url)?{url:source.source_url}:{})};
}
export function customerMetadata(metadata:any){
 if(!metadata||!Array.isArray(metadata.sources))return metadata;
 return {...metadata,sources:metadata.sources.map((source:any)=>{
  if(!source||!internalSourceURL(source.url))return source;
  const {url,...rest}=source;return rest;
 })};
}
