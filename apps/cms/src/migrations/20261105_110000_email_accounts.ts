import {type MigrateUpArgs,type MigrateDownArgs,sql} from '@payloadcms/db-postgres';
export async function up({db}:MigrateUpArgs){await db.execute(sql`
 -- Existing Google/admin accounts retain access. Payload explicitly sets new
 -- public password registrations to false until their email is verified.
 ALTER TABLE users ADD COLUMN IF NOT EXISTS _verified boolean DEFAULT true;
 ALTER TABLE users ADD COLUMN IF NOT EXISTS _verificationtoken varchar;
 UPDATE users SET _verified=true WHERE _verified IS NULL;
 `);}
export async function down({db}:MigrateDownArgs){await db.execute(sql`
 -- Code rollback can leave these additive columns in place. Do not silently
 -- reactivate unverified accounts when explicitly reverting the database.
 DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM users WHERE _verified=false) THEN
 RAISE EXCEPTION 'Unverified accounts exist; retain verification columns for rollback';
 END IF;
 END $$;
 ALTER TABLE users DROP COLUMN IF EXISTS _verificationtoken;
 ALTER TABLE users DROP COLUMN IF EXISTS _verified;
 `);}
