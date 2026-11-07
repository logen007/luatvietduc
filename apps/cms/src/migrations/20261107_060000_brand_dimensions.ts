import {type MigrateUpArgs,type MigrateDownArgs,sql} from '@payloadcms/db-postgres';
export async function up({db}:MigrateUpArgs){await db.execute(sql`
 ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS header_logo_height numeric DEFAULT 32;
 ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS footer_logo_height numeric DEFAULT 44;
`);}
export async function down(_args:MigrateDownArgs){throw new Error('Preserve saved brand dimensions; roll back application code without dropping these additive columns.');}
