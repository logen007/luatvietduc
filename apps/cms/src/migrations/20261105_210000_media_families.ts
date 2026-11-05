import {type MigrateUpArgs,type MigrateDownArgs,sql} from '@payloadcms/db-postgres';
import families from '../modules/storage/bundled-families.json';
export async function up({db}:MigrateUpArgs){
 await db.execute(sql`ALTER TABLE media ADD COLUMN legacy_parent_id integer REFERENCES media(id) ON DELETE RESTRICT,ADD COLUMN original_file jsonb;
 CREATE INDEX media_legacy_parent_idx ON media(legacy_parent_id);`);
 await db.execute(sql`ALTER TABLE media ADD COLUMN sizes_thumbnail_url varchar;`);
 await db.execute(sql`ALTER TABLE media ADD COLUMN sizes_thumbnail_width numeric;`);
 await db.execute(sql`ALTER TABLE media ADD COLUMN sizes_thumbnail_height numeric;`);
 await db.execute(sql`ALTER TABLE media ADD COLUMN sizes_thumbnail_mime_type varchar;`);
 await db.execute(sql`ALTER TABLE media ADD COLUMN sizes_thumbnail_filesize numeric;`);
 await db.execute(sql`ALTER TABLE media ADD COLUMN sizes_thumbnail_filename varchar;`);
 await db.execute(sql`ALTER TABLE media ADD COLUMN sizes_medium_url varchar;`);
 await db.execute(sql`ALTER TABLE media ADD COLUMN sizes_medium_width numeric;`);
 await db.execute(sql`ALTER TABLE media ADD COLUMN sizes_medium_height numeric;`);
 await db.execute(sql`ALTER TABLE media ADD COLUMN sizes_medium_mime_type varchar;`);
 await db.execute(sql`ALTER TABLE media ADD COLUMN sizes_medium_filesize numeric;`);
 await db.execute(sql`ALTER TABLE media ADD COLUMN sizes_medium_filename varchar;`);
 await db.execute(sql`ALTER TABLE media ADD COLUMN sizes_large_url varchar;`);
 await db.execute(sql`ALTER TABLE media ADD COLUMN sizes_large_width numeric;`);
 await db.execute(sql`ALTER TABLE media ADD COLUMN sizes_large_height numeric;`);
 await db.execute(sql`ALTER TABLE media ADD COLUMN sizes_large_mime_type varchar;`);
 await db.execute(sql`ALTER TABLE media ADD COLUMN sizes_large_filesize numeric;`);
 await db.execute(sql`ALTER TABLE media ADD COLUMN sizes_large_filename varchar;`);
 for(const size of ['thumbnail','medium','large'])await db.execute(sql.raw('CREATE INDEX media_sizes_'+size+'_filename_idx ON media(sizes_'+size+'_filename)'));
 // Known aliases stay readable by ID and retain their URLs and metadata.
 // Enumeration hides them; no filename globbing or physical file removal.
 for(const family of families){
  const primary=(await db.execute(sql`SELECT id FROM media WHERE filename=${family.primary.filename}`)).rows[0];if(!primary)continue;
  await db.execute(sql`UPDATE media SET width=${family.primary.width},height=${family.primary.height} WHERE id=${primary.id}`);
  for(const size of Object.values(family.sizes))if(size)await db.execute(sql`UPDATE media SET legacy_parent_id=${primary.id} WHERE filename=${size.filename} AND id<>${primary.id}`);
 }
}
export async function down({db}:MigrateDownArgs){
 const changed=await db.execute(sql`SELECT 1 FROM media WHERE original_file IS NOT NULL OR sizes_thumbnail_filename IS NOT NULL OR sizes_medium_filename IS NOT NULL OR sizes_large_filename IS NOT NULL LIMIT 1`);
 if(changed.rows.length)throw new Error('Media sizes/originals exist; use compatible code rollback or forward recovery to preserve ownership.');
 await db.execute(sql`ALTER TABLE media DROP COLUMN legacy_parent_id,DROP COLUMN original_file`);
 await db.execute(sql`ALTER TABLE media DROP COLUMN sizes_thumbnail_url,DROP COLUMN sizes_thumbnail_width,DROP COLUMN sizes_thumbnail_height,DROP COLUMN sizes_thumbnail_mime_type,DROP COLUMN sizes_thumbnail_filesize,DROP COLUMN sizes_thumbnail_filename`);
 await db.execute(sql`ALTER TABLE media DROP COLUMN sizes_medium_url,DROP COLUMN sizes_medium_width,DROP COLUMN sizes_medium_height,DROP COLUMN sizes_medium_mime_type,DROP COLUMN sizes_medium_filesize,DROP COLUMN sizes_medium_filename`);
 await db.execute(sql`ALTER TABLE media DROP COLUMN sizes_large_url,DROP COLUMN sizes_large_width,DROP COLUMN sizes_large_height,DROP COLUMN sizes_large_mime_type,DROP COLUMN sizes_large_filesize,DROP COLUMN sizes_large_filename`);
}
