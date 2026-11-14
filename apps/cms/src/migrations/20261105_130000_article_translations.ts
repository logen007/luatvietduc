import {type MigrateUpArgs,type MigrateDownArgs,sql} from '@payloadcms/db-postgres';
export async function up({db}:MigrateUpArgs){await db.execute(sql`
 ALTER TABLE articles ADD COLUMN IF NOT EXISTS translation_group varchar;
 ALTER TABLE _articles_v ADD COLUMN IF NOT EXISTS version_translation_group varchar;
 UPDATE articles SET translation_group='article-'||id::text WHERE translation_group IS NULL;
 UPDATE _articles_v SET version_translation_group='article-'||parent_id::text WHERE version_translation_group IS NULL;
 CREATE INDEX IF NOT EXISTS articles_translation_group_idx ON articles(translation_group);
 CREATE INDEX IF NOT EXISTS _articles_v_version_translation_group_idx ON _articles_v(version_translation_group);
 CREATE UNIQUE INDEX IF NOT EXISTS articles_translation_language_unique ON articles(translation_group,language);
 ALTER TABLE lvd_integrations DROP CONSTRAINT lvd_integrations_provider_check;
 ALTER TABLE lvd_integrations ADD CONSTRAINT lvd_integrations_provider_check CHECK(provider IN ('google','ai','translation','r2','email','drive'));
 `);}
export async function down({db}:MigrateDownArgs){await db.execute(sql`
 DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM articles GROUP BY translation_group HAVING count(*)>1) OR EXISTS(SELECT 1 FROM lvd_integrations WHERE provider='translation') THEN
 RAISE EXCEPTION 'Retain bilingual article links and translation credentials during code rollback';
 END IF;
 END $$;
 DROP INDEX IF EXISTS articles_translation_language_unique;
 ALTER TABLE articles DROP COLUMN IF EXISTS translation_group;
 ALTER TABLE _articles_v DROP COLUMN IF EXISTS version_translation_group;
 ALTER TABLE lvd_integrations DROP CONSTRAINT lvd_integrations_provider_check;
 ALTER TABLE lvd_integrations ADD CONSTRAINT lvd_integrations_provider_check CHECK(provider IN ('google','ai','r2','email','drive'));
 `);}
