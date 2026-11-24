import {sql,type MigrateUpArgs,type MigrateDownArgs} from '@payloadcms/db-postgres';
export async function up({db}:MigrateUpArgs){await db.execute(sql`
 ALTER TABLE lvd_conversations ADD COLUMN qualification text NOT NULL DEFAULT 'unassessed' CHECK(qualification IN ('unassessed','low','needs_details','ready'));
 ALTER TABLE lvd_conversations ADD COLUMN low_priority_expires_at timestamptz;
 ALTER TABLE lvd_conversations ADD COLUMN retain_history boolean NOT NULL DEFAULT false;
 -- Historical conversations are never made disposable by this migration.
 UPDATE lvd_conversations SET retain_history=true;
 CREATE INDEX lvd_chat_low_expiry ON lvd_conversations(low_priority_expires_at,id) WHERE qualification='low' AND state='queued' AND ai_enabled;
 CREATE FUNCTION lvd_chat_expiry_guard() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 NEW.retain_history=OLD.retain_history OR NEW.retain_history OR NEW.qualification IN ('needs_details','ready');
 IF NEW.state<>'queued' OR NOT NEW.ai_enabled OR NEW.assigned_to IS NOT NULL THEN
 NEW.qualification='ready'; NEW.retain_history=true; NEW.low_priority_expires_at=NULL;
 ELSIF NEW.qualification='low' AND (NEW.retain_history OR EXISTS(SELECT 1 FROM lvd_chat_files WHERE conversation_id=NEW.id)) THEN
 NEW.qualification='needs_details'; NEW.retain_history=true; NEW.low_priority_expires_at=NULL;
 ELSIF NEW.qualification<>'low' THEN NEW.low_priority_expires_at=NULL;
 END IF; RETURN NEW; END $$;
 CREATE TRIGGER lvd_chat_expiry_guard BEFORE UPDATE ON lvd_conversations FOR EACH ROW EXECUTE FUNCTION lvd_chat_expiry_guard();
 CREATE FUNCTION lvd_chat_expiry_message() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 UPDATE lvd_conversations SET qualification=CASE WHEN NEW.role='staff' THEN 'ready' ELSE qualification END,
 low_priority_expires_at=CASE WHEN NEW.role='staff' THEN NULL WHEN qualification='low' THEN NEW.created_at+interval '2 hours' ELSE low_priority_expires_at END WHERE id=NEW.conversation_id;
 RETURN NEW; END $$;
 CREATE TRIGGER lvd_chat_expiry_message AFTER INSERT ON lvd_messages FOR EACH ROW EXECUTE FUNCTION lvd_chat_expiry_message();
 CREATE FUNCTION lvd_chat_expiry_file() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 UPDATE lvd_conversations SET qualification='needs_details',retain_history=true,low_priority_expires_at=NULL WHERE id=NEW.conversation_id;
 RETURN NEW; END $$;
 CREATE TRIGGER lvd_chat_expiry_file AFTER INSERT ON lvd_chat_files FOR EACH ROW EXECUTE FUNCTION lvd_chat_expiry_file();
 `);}
export async function down({db}:MigrateDownArgs){await db.execute(sql`
 DROP TRIGGER IF EXISTS lvd_chat_expiry_file ON lvd_chat_files;
 DROP TRIGGER IF EXISTS lvd_chat_expiry_message ON lvd_messages;
 DROP TRIGGER IF EXISTS lvd_chat_expiry_guard ON lvd_conversations;
 DROP FUNCTION IF EXISTS lvd_chat_expiry_file(); DROP FUNCTION IF EXISTS lvd_chat_expiry_message(); DROP FUNCTION IF EXISTS lvd_chat_expiry_guard();
 DROP INDEX IF EXISTS lvd_chat_low_expiry;
 ALTER TABLE lvd_conversations DROP COLUMN IF EXISTS qualification,DROP COLUMN IF EXISTS low_priority_expires_at,DROP COLUMN IF EXISTS retain_history;
 `);}
