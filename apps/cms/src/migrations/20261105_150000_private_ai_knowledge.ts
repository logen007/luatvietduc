import {type MigrateUpArgs,type MigrateDownArgs,sql} from '@payloadcms/db-postgres';
export async function up({db}:MigrateUpArgs){await db.execute(sql`
 CREATE TYPE enum_knowledge_entry_type AS ENUM('knowledge','rule');
 CREATE TYPE enum__knowledge_v_version_entry_type AS ENUM('knowledge','rule');
 ALTER TABLE knowledge ADD COLUMN entry_type enum_knowledge_entry_type NOT NULL DEFAULT 'knowledge';
 ALTER TABLE knowledge ADD COLUMN rule_enabled boolean DEFAULT false;
 ALTER TABLE _knowledge_v ADD COLUMN version_rule_enabled boolean DEFAULT false;
 ALTER TABLE knowledge ADD CONSTRAINT lvd_private_rule_state CHECK(entry_type<>'rule' OR (approved IS FALSE AND _status IS NOT NULL AND _status='draft'));
 ALTER TABLE _knowledge_v ADD COLUMN version_entry_type enum__knowledge_v_version_entry_type DEFAULT 'knowledge';
 -- Old application versions cannot resolve private content through their former source endpoint.
 UPDATE knowledge SET source_url=replace(source_url,'/service/knowledge-source/','/admin/knowledge#'),updated_at=clock_timestamp() WHERE article_origin_id IS NULL AND source_url LIKE '%/service/knowledge-source/%';
 UPDATE _knowledge_v SET version_source_url=replace(version_source_url,'/service/knowledge-source/','/admin/knowledge#') WHERE version_article_origin_id IS NULL AND version_source_url LIKE '%/service/knowledge-source/%';
 CREATE INDEX lvd_active_answer_rules ON knowledge(entry_type,jurisdiction,id) WHERE entry_type='rule' AND rule_enabled=true;
 `);}
export async function down(_args:MigrateDownArgs){throw new Error('Keep private knowledge types, source privacy and rule flags during rollback. Use reviewed forward recovery.');}
