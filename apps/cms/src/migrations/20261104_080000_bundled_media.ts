import {type MigrateUpArgs,type MigrateDownArgs,sql} from '@payloadcms/db-postgres';
import records from '../modules/storage/bundled-records.json';
export async function up({db}:MigrateUpArgs){
 await db.execute(sql`ALTER TABLE media ADD COLUMN IF NOT EXISTS _objectkey varchar; UPDATE media SET _objectkey=_object_key WHERE _objectkey IS NULL AND _object_key IS NOT NULL;`);
 for(const file of records)await db.execute(sql`INSERT INTO media(alt,visibility,url,thumbnail_u_r_l,filename,mime_type,filesize,created_at,updated_at) SELECT ${file.name},'public',${file.url},${file.type==='image'?file.url:null},${file.filename},${file.mimeType},${file.filesize},now(),now() WHERE NOT EXISTS(SELECT 1 FROM media WHERE filename=${file.filename})`);
}
export async function down(_args:MigrateDownArgs){throw new Error('Forward recovery only; preserve media references.');}
