import {cache} from 'react';
import {headers} from 'next/headers';
import type {DefaultServerCellComponentProps,Payload} from 'payload';
import {canWriteContent} from '../identity/permissions';
import {pool} from '../shared/db';
import {articleAuthorsQuery,createArticleAuthorLoader,type ArticleAuthorRow} from './article-author-loader';
const viewer=cache(async(payload:Payload)=>(await payload.auth({headers:await headers()})).user);
const authorLoader=cache(()=>createArticleAuthorLoader(async ids=>(await pool.query<ArticleAuthorRow>(articleAuthorsQuery,[ids])).rows));
export function ArticleAuthorField(){return null;}
export async function ArticleAuthorCell({payload,rowData,className,collectionSlug}:DefaultServerCellComponentProps){
 if(collectionSlug!=='articles'||!canWriteContent(await viewer(payload)))return null;
 const id=String(rowData.id||'');if(!/^\d+$/.test(id))return null;
 let name='';try{name=await authorLoader().load(id);}catch{return null;}
 return name?<span className={className}>{name}</span>:null;
}
