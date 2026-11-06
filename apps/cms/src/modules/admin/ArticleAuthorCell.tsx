import {cache} from 'react';
import {headers} from 'next/headers';
import type {DefaultServerCellComponentProps,Payload} from 'payload';
import {canWriteContent} from '../identity/permissions';
import {pool} from '../shared/db';
const viewer=cache(async(payload:Payload)=>(await payload.auth({headers:await headers()})).user);
const authorName=cache(async(id:string)=>{
 // The creation audit records the writer; reviewers and later editors are not
 // authors. Imported legacy records without attribution deliberately stay blank.
 const result=await pool.query<{name:string|null}>(`SELECT u.name FROM audit_events e LEFT JOIN users u ON u.id=e.actor_id WHERE e.action='articles.create' AND e.record_id=$1 ORDER BY e.created_at,e.id LIMIT 1`,[id]);
 return result.rows[0]?.name||'';
});
export function ArticleAuthorField(){return null;}
export async function ArticleAuthorCell({payload,rowData,className,collectionSlug}:DefaultServerCellComponentProps){
 if(collectionSlug!=='articles'||!canWriteContent(await viewer(payload)))return null;
 const id=String(rowData.id||'');if(!/^\d+$/.test(id))return null;
 let name='';try{name=await authorName(id);}catch{return null;}
 return name?<span className={className}>{name}</span>:null;
}
