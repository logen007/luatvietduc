// Single source for the custom page heading and native breadcrumb.
import {adminLinks} from './navigation-model';
const settings={label:adminLinks.settings.label,url:adminLinks.settings.href};
export const adminPages={
 settings:{title:adminLinks.settings.label,nav:[{label:adminLinks.settings.label}]},
 connections:{title:adminLinks.connections.label,nav:[settings,{label:adminLinks.connections.label}]},
 backups:{title:adminLinks.backups.label,nav:[settings,{label:adminLinks.backups.label}]},
 knowledge:{title:adminLinks.knowledge.label,nav:[{label:adminLinks.knowledge.label}]},
 inbox:{title:adminLinks.inbox.label,nav:[{label:adminLinks.inbox.label}]},
} as const;
export type AdminPage=keyof typeof adminPages;
