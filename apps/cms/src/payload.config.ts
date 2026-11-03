import {vi} from '@payloadcms/translations/languages/vi';
import {de} from '@payloadcms/translations/languages/de';
import {en} from '@payloadcms/translations/languages/en';
import { buildConfig } from "payload";
import { postgresAdapter } from "@payloadcms/db-postgres";
import { s3Storage } from "@payloadcms/storage-s3";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Users } from "./modules/identity/users";
import { Articles } from "./modules/content/articles";
import { Audit } from "./modules/content/audit";
import { SiteSettings } from "./modules/settings/config";
import { Knowledge } from "./modules/knowledge/collection";
import { Media, storageReady } from "./modules/storage/collection";
const dirname = path.dirname(fileURLToPath(import.meta.url));
export default buildConfig({
  i18n:{fallbackLanguage:'vi',supportedLanguages:{vi,de,en}},
  secret: process.env.PAYLOAD_SECRET || "",
  serverURL: process.env.APP_URL || "http://localhost:3000",
  admin: {
    components: {
      beforeDashboard: ["./modules/settings/AdminWelcome#AdminWelcome"],
      beforeLogin: ["./modules/settings/AdminWelcome#GoogleLogin"],
    },
    user: "users",
    importMap: { baseDir: dirname },
    meta: { titleSuffix: " — Luật Việt Đức" },
  },
  db: postgresAdapter({
    pool: { connectionString: process.env.DATABASE_URL || "" },
    push: false,
  }),
  collections: [Users, Articles, Knowledge, Media, Audit],
  globals: [SiteSettings],
  plugins: storageReady()
    ? [
        s3Storage({
          collections: { media: {} },
          bucket: process.env.R2_BUCKET!,
          config: {
            endpoint: process.env.R2_ENDPOINT!,
            region: "auto",
            credentials: {
              accessKeyId: process.env.R2_ACCESS_KEY_ID!,
              secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
            },
          },
        }),
      ]
    : [],
  upload: { limits: { fileSize: 10 * 1024 * 1024 } },
  typescript: { outputFile: path.resolve(dirname, "payload-types.ts") },
  graphQL: { disable: true },
});
