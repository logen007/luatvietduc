import {type MigrateUpArgs,type MigrateDownArgs,sql} from '@payloadcms/db-postgres';
export async function up({db}:MigrateUpArgs){await db.execute(sql`
 ALTER TABLE users ADD COLUMN IF NOT EXISTS phone varchar(40);
 ALTER TABLE users ADD COLUMN IF NOT EXISTS location varchar(160);
`);}
export async function down(_args:MigrateDownArgs){throw new Error('Preserve customer contact information; roll back code without deleting profile data.');}
