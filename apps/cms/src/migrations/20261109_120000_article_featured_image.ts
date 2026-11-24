import {sql,type MigrateUpArgs,type MigrateDownArgs} from '@payloadcms/db-postgres';
export async function up({db}:MigrateUpArgs){await db.execute(sql`
 ALTER TABLE articles ADD COLUMN IF NOT EXISTS featured_image_id integer REFERENCES media(id) ON DELETE SET NULL;
 ALTER TABLE _articles_v ADD COLUMN IF NOT EXISTS version_featured_image_id integer REFERENCES media(id) ON DELETE SET NULL;
 CREATE INDEX IF NOT EXISTS articles_featured_image_idx ON articles(featured_image_id);
 CREATE INDEX IF NOT EXISTS _articles_v_featured_image_idx ON _articles_v(version_featured_image_id);
`);}
export async function down(_args:MigrateDownArgs){throw new Error('Preserve article cover selections; roll back code without dropping additive media relations.');}
