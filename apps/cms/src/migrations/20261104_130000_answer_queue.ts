import {type MigrateUpArgs,type MigrateDownArgs,sql} from '@payloadcms/db-postgres';
export async function up({db}:MigrateUpArgs){await db.execute(sql`
 CREATE TABLE lvd_answer_jobs(
  message_id bigint PRIMARY KEY REFERENCES lvd_messages(id) ON DELETE CASCADE,
  conversation_id uuid NOT NULL REFERENCES lvd_conversations(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','processing','done')),
  available_at timestamptz NOT NULL DEFAULT now(),
  lease uuid,lease_until timestamptz,attempts integer NOT NULL DEFAULT 0,
  error_code text,updated_at timestamptz NOT NULL DEFAULT now()
 );
 CREATE INDEX lvd_answer_jobs_pending_idx ON lvd_answer_jobs(available_at,message_id) WHERE status<>'done';
 -- Recover questions interrupted by a previous deployment; no transcript is copied.
 INSERT INTO lvd_answer_jobs(message_id,conversation_id)
 SELECT q.id,c.id FROM lvd_conversations c JOIN LATERAL(
  SELECT id FROM lvd_messages WHERE conversation_id=c.id AND role='user' ORDER BY id DESC LIMIT 1
 )q ON true WHERE c.state='queued' AND c.ai_enabled
 AND NOT EXISTS(SELECT 1 FROM lvd_messages a WHERE a.conversation_id=c.id AND a.client_key='assistant:'||q.id::text);
 `);}
export async function down({db}:MigrateDownArgs){await db.execute(sql`DROP TABLE lvd_answer_jobs;`);}
