import React from 'react';
import type { AdminViewServerProps } from 'payload';
import {DefaultTemplate} from '@payloadcms/next/templates';
import { redirect } from 'next/navigation';
import { IntegrationPanel } from '../integrations/Panel';
import { KnowledgePanel } from '../knowledge/Panel';
import { Workspace } from '../chat/Workspace';
import { BackupPanel } from '../backup/Panel';
function guard(props:AdminViewServerProps,roles=['owner']){
 const user=props.initPageResult.req.user;
 if(!user)redirect('/admin/login');
 if(!roles.includes(user.role))return false;
 return true;
}
function Page({props,title,children,compact=false}:{props:AdminViewServerProps;title:string;children:React.ReactNode;compact?:boolean}){
 const {req,permissions,visibleEntities}=props.initPageResult;
 return <DefaultTemplate {...props} req={req} permissions={permissions} visibleEntities={{collections:visibleEntities.collections,globals:visibleEntities.globals}}><div className={compact?"lvd-admin-inbox-page":"lvd-admin-page live-page"}>{!compact&&<header className="lvd-admin-page-heading"><a href="/admin">Tổng quan</a><h1>{title}</h1></header>}{children}</div></DefaultTemplate>;
}
const denied=<p role="alert">Tài khoản chưa được phân quyền cho mục này.</p>;
export function ConnectionsView(props:AdminViewServerProps){return <Page props={props} title="Kết nối dịch vụ">{guard(props)?<IntegrationPanel/>:denied}</Page>}
export function BackupsView(props:AdminViewServerProps){return <Page props={props} title="Sao lưu & khôi phục">{guard(props)?<BackupPanel/>:denied}</Page>}
export function KnowledgeView(props:AdminViewServerProps){return <Page props={props} title="Kiến thức AI">{guard(props,['owner','knowledge','reviewer','support'])?<KnowledgePanel/>:denied}</Page>}
export function InboxView(props:AdminViewServerProps){return <Page props={props} title="Hộp thư chuyên viên" compact>{guard(props,['owner','support','operations'])?<Workspace staff embedded/>:denied}</Page>}
export function SettingsView(props:AdminViewServerProps){
 if(!guard(props))return <Page props={props} title="Cài đặt">{denied}</Page>;
 const sections=[
  {title:'Website',items:[['Nhận diện, giao diện & mạng xã hội','/admin/globals/site-settings']]},
  {title:'Kết nối',items:[['Google, Gemini, email & lưu tệp','/admin/settings/connections']]},
  {title:'Bảo trì',items:[['Sao lưu & khôi phục','/admin/settings/backups'],['Nhật ký hoạt động','/admin/collections/audit-events']]},
 ];
 return <Page props={props} title="Cài đặt hệ thống"><div className="lvd-admin-settings-grid">{sections.map(section=><section key={section.title}><h2>{section.title}</h2>{section.items.map(([label,href])=><a key={href} href={href}>{label}<span aria-hidden="true">↗</span></a>)}</section>)}</div></Page>;
}
