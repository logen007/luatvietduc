import {adminI18n} from './modules/admin/i18n';
import {adminPages} from './modules/admin/pages';
import {withAdminPresentation,adminDateFormat} from './modules/admin/presentation';
import { buildConfig } from "payload";
import { postgresAdapter } from "@payloadcms/db-postgres";
import { runtimeStorage } from "./modules/integrations/storage";
import { runtimeEmail } from "./modules/integrations/email";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Users } from "./modules/identity/users";
import {Categories,Tags} from "./modules/taxonomy/collections";
import { Articles } from "./modules/content/articles";
import { Audit } from "./modules/content/audit";
import { SiteSettings } from "./modules/settings/config";
import { Knowledge } from "./modules/knowledge/collection";
import { Media } from "./modules/storage/collection";
import {QuickReplies} from "./modules/quick-replies/collection";
import sharp from 'sharp';
const dirname = path.dirname(fileURLToPath(import.meta.url));
export default buildConfig({
  sharp,
  i18n:adminI18n,
  secret: process.env.PAYLOAD_SECRET || "",
  serverURL: process.env.APP_URL || "http://localhost:3000",
  admin: {
    theme: "dark",
    dateFormat: adminDateFormat,
    components: {
      afterNavLinks: ["./modules/admin/Navigation#AdminNavigation"],
      views: {
        importArticles:{Component:'./modules/admin/Views#ArticleImportView',meta:{title:adminPages.importArticles.title},path:'/articles/import',exact:true},
        logout: {Component:'./modules/identity/AdminLogout#AdminLogout',path:'/logout',exact:true},
        dashboard: {Component:"./modules/settings/AdminWelcome#AdminDashboard"},
        settings: { Component: "./modules/admin/Views#SettingsView", meta:{title:adminPages.settings.title}, path: "/settings", exact: true },
        connections: { Component: "./modules/admin/Views#ConnectionsView", meta:{title:adminPages.connections.title}, path: "/settings/connections", exact: true },
        backups: { Component: "./modules/admin/Views#BackupsView", meta:{title:adminPages.backups.title}, path: "/settings/backups", exact: true },
        answerRules:{Component:'./modules/admin/Views#AnswerRulesView',meta:{title:adminPages.answerRules.title},path:'/knowledge/rules',exact:true},
        knowledge: { Component: "./modules/admin/Views#KnowledgeView", meta:{title:adminPages.knowledge.title}, path: "/knowledge", exact: true },
        inbox: { Component: "./modules/admin/Views#InboxView", meta:{title:adminPages.inbox.title}, path: "/inbox", exact: true },
      },
      beforeLogin: ["./modules/settings/AdminWelcome#GoogleLogin"],
    },
    user: "users",
    importMap: { baseDir: dirname, importMapFile: path.resolve(dirname, "app/(payload)/admin/importMap.ts") },
    meta: { titleSuffix: " — Luật Việt Đức" },
  },
  db: postgresAdapter({
    pool: { connectionString: process.env.DATABASE_URL || "" },
    push: false,
  }),
  collections: [Users, Articles, Categories, Tags, Knowledge, Media, Audit, QuickReplies].map(withAdminPresentation),
  globals: [SiteSettings],
  plugins: [runtimeStorage()],
  email: runtimeEmail,
  upload: { limits: { fileSize: 10 * 1024 * 1024 } },
  typescript: { outputFile: path.resolve(dirname, "payload-types.ts") },
  graphQL: { disable: true },
});
