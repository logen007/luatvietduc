import {AppLink} from '../shared/AppLink';
import React from 'react';
import {AnswerRulesPanel} from '../knowledge/AnswerRulesPanel';
import {ArticleImportPanel} from '../content/ArticleImportPanel';
import type { AdminViewServerProps } from 'payload';
import {Gutter,SetStepNav} from '@payloadcms/ui';
import {adminPages,type AdminPage} from './pages';
import {adminLinks,adminSettingsSections} from './navigation-model';
import {DefaultTemplate} from '@payloadcms/next/templates';
import { redirect } from 'next/navigation';
import { IntegrationPanel } from '../integrations/Panel';
import { Workspace } from '../chat/Workspace';
import { BackupPanel } from '../backup/Panel';
import {isAdmin,canEnterAdmin} from '../identity/permissions';
function guard(props:AdminViewServerProps,staff=false){
 const user=props.initPageResult.req.user;
 if(!user)redirect('/admin/login');
 return staff?canEnterAdmin(user):isAdmin(user);
}
function Page({props,page,children,compact=false}:{props:AdminViewServerProps;page:AdminPage;children:React.ReactNode;compact?:boolean}){
 const {req,permissions,visibleEntities}=props.initPageResult;
 const definition=adminPages[page];
 return <DefaultTemplate {...props} req={req} permissions={permissions} visibleEntities={{collections:visibleEntities.collections,globals:visibleEntities.globals}}><SetStepNav nav={definition.nav.map(item=>({...item}))}/><Gutter className={compact?"lvd-admin-inbox-page":"lvd-admin-page"}>{!compact&&<header className="lvd-admin-page-heading"><h1>{definition.title}</h1></header>}{children}</Gutter></DefaultTemplate>;
}

const denied=<p role="alert">Tài khoản chưa được phân quyền cho mục này.</p>;
export function ConnectionsView(props:AdminViewServerProps){return <Page props={props} page="connections">{guard(props)?<IntegrationPanel/>:denied}</Page>}
export function BackupsView(props:AdminViewServerProps){return <Page props={props} page="backups">{guard(props)?<BackupPanel/>:denied}</Page>}
export function KnowledgeView(props:AdminViewServerProps){if(!guard(props,true))return <Page props={props} page="knowledge">{denied}</Page>;redirect(adminLinks.knowledge.href);}
export function InboxView(props:AdminViewServerProps){return <Page props={props} page="inbox" compact>{guard(props,true)?<Workspace staff embedded/>:denied}</Page>}
export function SettingsView(props:AdminViewServerProps){
 if(!guard(props))return <Page props={props} page="settings">{denied}</Page>;
 return <Page props={props} page="settings"><div className="lvd-admin-settings-grid">{adminSettingsSections.map(section=><section key={section.title}><h2>{section.title}</h2>{section.items.map(({label,href})=><AppLink key={href} href={href}>{label}<span aria-hidden="true">↗</span></AppLink>)}</section>)}</div></Page>;
}

export function ArticleImportView(props:AdminViewServerProps){return <Page props={props} page="importArticles">{guard(props,true)?<ArticleImportPanel/>:denied}</Page>}

export function AnswerRulesView(props:AdminViewServerProps){return <Page props={props} page="answerRules">{guard(props,true)?<AnswerRulesPanel/>:denied}</Page>}
