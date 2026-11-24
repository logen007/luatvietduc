import {type MigrateUpArgs,type MigrateDownArgs,sql} from '@payloadcms/db-postgres';
export async function up({db}:MigrateUpArgs){
 await db.execute(sql`
  ALTER TABLE media ADD COLUMN title varchar, ADD COLUMN caption varchar, ADD COLUMN description varchar, ADD COLUMN uploaded_by_id integer REFERENCES users(id) ON DELETE SET NULL;
  ALTER TABLE media ALTER COLUMN alt DROP NOT NULL;
  UPDATE media SET title=COALESCE(NULLIF(alt,''),filename);
  CREATE INDEX media_uploaded_by_idx ON media(uploaded_by_id);
 `);
}
export async function down({db}:MigrateDownArgs){
 await db.execute(sql`ALTER TABLE media DROP COLUMN title,DROP COLUMN caption,DROP COLUMN description,DROP COLUMN uploaded_by_id;`);
}
