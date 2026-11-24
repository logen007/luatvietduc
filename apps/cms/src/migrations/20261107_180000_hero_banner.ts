import {type MigrateUpArgs,type MigrateDownArgs,sql} from '@payloadcms/db-postgres';
export async function up({db}:MigrateUpArgs){await db.execute(sql`
 ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS hero_video_id integer REFERENCES media(id) ON DELETE SET NULL;
 ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS hero_mobile_video_id integer REFERENCES media(id) ON DELETE SET NULL;
 ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS hero_poster_id integer REFERENCES media(id) ON DELETE SET NULL;
 CREATE INDEX IF NOT EXISTS site_settings_hero_video_idx ON site_settings(hero_video_id);
 CREATE INDEX IF NOT EXISTS site_settings_hero_mobile_video_idx ON site_settings(hero_mobile_video_id);
 CREATE INDEX IF NOT EXISTS site_settings_hero_poster_idx ON site_settings(hero_poster_id);
`);}
export async function down(_args:MigrateDownArgs){throw new Error('Preserve saved banner media; roll back application code without dropping these additive columns.');}
