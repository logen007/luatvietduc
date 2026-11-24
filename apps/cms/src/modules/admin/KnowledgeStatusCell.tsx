import {cache} from 'react';
import {headers} from 'next/headers';
import Link from 'next/link';
import type {DefaultServerCellComponentProps,Payload} from 'payload';

// React cache belongs to this server render; no user or document is retained
// between requests. Native list rows may contain staged draft checkbox values.
const currentUser=cache(async(payload:Payload)=>(await payload.auth({headers:await headers()})).user);
const appliedDocument=cache(async(payload:Payload,id:string|number)=>{
 const user=await currentUser(payload);if(!user)return null;
 return payload.findByID({collection:'knowledge',id,user,overrideAccess:false,draft:false,depth:0,select:{entryType:true,ruleEnabled:true,updatedAt:true}});
});
export async function KnowledgeStatusCell(props:DefaultServerCellComponentProps){
 const {rowData,cellData,payload,i18n}=props;let label='—',pending=false;
 try{
  const applied=await appliedDocument(payload,rowData.id);
  if(applied){
   if(rowData.entryType==='rule'||applied.entryType==='rule'){
    label=applied.entryType==='rule'&&applied.ruleEnabled===true?'Đã bật':'Đang tắt';
    pending=rowData.entryType!==applied.entryType||typeof rowData.ruleEnabled==='boolean'&&rowData.ruleEnabled!==applied.ruleEnabled||new Date(rowData.updatedAt).getTime()>new Date(applied.updatedAt).getTime();
   }else label=i18n.t(cellData==='published'?'version:published':cellData==='changed'?'version:draftHasPublishedVersion':'version:draft');
  }
 }catch{/* An unavailable authorized read must not claim that a staged rule is enabled. */}
 const content=<span className={props.className} title={pending?'Có thay đổi chưa áp dụng':undefined}>{label}</span>;
 return props.link?<Link prefetch={false} href={props.linkURL||`${payload.config.routes.admin}/collections/knowledge/${encodeURIComponent(String(rowData.id))}`}>{content}</Link>:content;
}
