import {type MigrateUpArgs,type MigrateDownArgs,sql} from '@payloadcms/db-postgres';
export async function up({db}:MigrateUpArgs){await db.execute(sql`
 ALTER TABLE lvd_conversations ADD COLUMN ai_enabled boolean NOT NULL DEFAULT false;
 ALTER TABLE lvd_conversations ADD COLUMN ai_generation uuid;
 ALTER TABLE lvd_conversations ADD COLUMN ai_message_id bigint;
 ALTER TABLE lvd_conversations ADD COLUMN ai_started_at timestamptz;
 ALTER TABLE lvd_conversations ADD COLUMN privacy_notice_version text;
 ALTER TABLE lvd_messages DROP CONSTRAINT lvd_messages_role_check;
 ALTER TABLE lvd_messages ADD CONSTRAINT lvd_messages_role_check CHECK(role IN ('user','staff','assistant'));
 ALTER TABLE lvd_messages ADD COLUMN metadata jsonb;
 ALTER TABLE knowledge ADD COLUMN question_aliases varchar;
 ALTER TABLE _knowledge_v ADD COLUMN version_question_aliases varchar;
 ALTER TABLE site_settings ADD COLUMN customer_ai_enabled boolean NOT NULL DEFAULT true;
 CREATE INDEX lvd_ai_pending ON lvd_conversations(ai_started_at) WHERE ai_enabled;
`)}
// Preserve source attribution and conversations during application rollback.
export async function down(_args:MigrateDownArgs){throw new Error('Reviewed forward recovery only; do not remove live assistant messages.');}
