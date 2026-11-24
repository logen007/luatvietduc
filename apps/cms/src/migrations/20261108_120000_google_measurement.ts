import {sql,type MigrateUpArgs,type MigrateDownArgs} from '@payloadcms/db-postgres';
export async function up({db}:MigrateUpArgs){await db.execute(sql`
 ALTER TABLE lvd_integrations DROP CONSTRAINT lvd_integrations_provider_check;
 ALTER TABLE lvd_integrations ADD CONSTRAINT lvd_integrations_provider_check CHECK(provider IN ('google','ai','translation','r2','email','drive','gtm','analytics','searchConsole'));
`);}
export async function down({db}:MigrateDownArgs){await db.execute(sql`
 DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM lvd_integrations WHERE provider IN ('gtm','analytics','searchConsole')) THEN
 RAISE EXCEPTION 'Retain Google measurement settings during application rollback';
 END IF;
 END $$;
 ALTER TABLE lvd_integrations DROP CONSTRAINT lvd_integrations_provider_check;
 ALTER TABLE lvd_integrations ADD CONSTRAINT lvd_integrations_provider_check CHECK(provider IN ('google','ai','translation','r2','email','drive'));
`);}
