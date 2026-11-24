import {type MigrateUpArgs,type MigrateDownArgs,sql} from '@payloadcms/db-postgres';
export async function up({db}:MigrateUpArgs){await db.execute(sql`
 ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_id integer;
 DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='users_avatar_id_media_id_fk') THEN
 ALTER TABLE users ADD CONSTRAINT users_avatar_id_media_id_fk FOREIGN KEY (avatar_id) REFERENCES media(id) ON DELETE SET NULL;
 END IF; END $$;
 CREATE INDEX IF NOT EXISTS users_avatar_idx ON users (avatar_id);
`);}
export async function down(_args:MigrateDownArgs){throw new Error('Preserve saved avatars; roll back code without deleting profile data.');}
