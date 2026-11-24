import {sql,type MigrateUpArgs,type MigrateDownArgs} from '@payloadcms/db-postgres';
export async function up({db}:MigrateUpArgs){await db.execute(sql`
 ALTER TABLE _articles_v ADD COLUMN autosave boolean;
 CREATE INDEX _articles_v_autosave_idx ON _articles_v(autosave);
`);}
// Keep saved drafts on code rollback; the additive column is compatible with old readers.
export async function down(_args:MigrateDownArgs){throw new Error('Preserve article drafts; roll back application code without dropping autosave metadata.');}
