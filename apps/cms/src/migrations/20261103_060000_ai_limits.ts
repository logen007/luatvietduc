import {MigrateUpArgs,MigrateDownArgs,sql} from '@payloadcms/db-postgres'
export async function up({db}:MigrateUpArgs){await db.execute(sql`CREATE TABLE lvd_ai_usage(day date PRIMARY KEY,count integer NOT NULL);`)}
export async function down({db}:MigrateDownArgs){await db.execute(sql`DROP TABLE lvd_ai_usage;`)}
