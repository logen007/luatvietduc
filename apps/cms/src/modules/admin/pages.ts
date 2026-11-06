// Single source for the custom page heading and native breadcrumb.
import {adminLinks} from './navigation-model';
const settings={label:adminLinks.settings.label,url:adminLinks.settings.href};
export const adminPages={
 importArticles:{title:'Nhập bài viết',nav:[{label:adminLinks.articles.label,url:adminLinks.articles.href},{label:'Nhập CSV'}]},
 settings:{title:adminLinks.settings.label,nav:[{label:adminLinks.settings.label}]},
 connections:{title:adminLinks.connections.label,nav:[settings,{label:adminLinks.connections.label}]},
 backups:{title:adminLinks.backups.label,nav:[settings,{label:adminLinks.backups.label}]},
 answerRules:{title:adminLinks.answerRules.label,nav:[{label:adminLinks.knowledge.label,url:adminLinks.knowledge.href},{label:adminLinks.answerRules.label}]},
 knowledge:{title:adminLinks.knowledge.label,nav:[{label:adminLinks.knowledge.label}]},
 inbox:{title:adminLinks.inbox.label,nav:[{label:adminLinks.inbox.label}]},
} as const;
export type AdminPage=keyof typeof adminPages;
