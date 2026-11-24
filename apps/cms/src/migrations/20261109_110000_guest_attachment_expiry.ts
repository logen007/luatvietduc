import {sql,type MigrateUpArgs,type MigrateDownArgs} from '@payloadcms/db-postgres';
// Owner policy: customer attachments alone no longer cancel guest inactivity expiry.
export async function up({db}:MigrateUpArgs){await db.execute(sql`
 CREATE OR REPLACE FUNCTION lvd_chat_expiry_guard() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF TG_OP='INSERT' THEN
  NEW.guest_expiry_enabled=NEW.user_id IS NULL AND NEW.state='queued' AND NEW.ai_enabled AND NEW.assigned_to IS NULL AND NOT NEW.retain_history;
  IF NEW.guest_expiry_enabled THEN NEW.low_priority_expires_at=clock_timestamp()+interval '2 hours';
  ELSE NEW.low_priority_expires_at=NULL; END IF;
  RETURN NEW;
 END IF;
 NEW.retain_history=OLD.retain_history OR NEW.retain_history;
 IF NEW.user_id IS NOT NULL OR NEW.state<>'queued' OR NOT NEW.ai_enabled OR NEW.assigned_to IS NOT NULL
 OR EXISTS(SELECT 1 FROM lvd_messages WHERE conversation_id=NEW.id AND role='staff') THEN
  IF NEW.state<>'queued' OR NOT NEW.ai_enabled OR NEW.assigned_to IS NOT NULL THEN NEW.qualification='ready'; END IF;
  NEW.guest_expiry_enabled=false;NEW.retain_history=true;NEW.low_priority_expires_at=NULL;
 ELSIF OLD.guest_expiry_enabled OR NEW.guest_expiry_enabled THEN
  -- Intake qualification and its legacy retention flag cannot cancel expiry.
  NEW.guest_expiry_enabled=true;
  NEW.low_priority_expires_at=COALESCE(NEW.low_priority_expires_at,OLD.low_priority_expires_at,clock_timestamp()+interval '2 hours');
 ELSE
  -- A protected archive/customer handoff cannot become disposable again.
  NEW.guest_expiry_enabled=false;NEW.low_priority_expires_at=NULL;
 END IF;
 RETURN NEW; END $$;

 CREATE OR REPLACE FUNCTION lvd_chat_expiry_file() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 UPDATE lvd_conversations SET qualification='needs_details',low_priority_expires_at=CASE WHEN guest_expiry_enabled THEN clock_timestamp()+interval '2 hours' ELSE low_priority_expires_at END WHERE id=NEW.conversation_id;
 RETURN NEW; END $$;
 -- Re-admit only recent AI-only guests protected by the old attachment rule.
 -- Archives, account history and explicit human handoffs remain protected.
 UPDATE lvd_conversations c SET guest_expiry_enabled=true,low_priority_expires_at=clock_timestamp()+interval '2 hours'
 WHERE NOT c.guest_expiry_enabled AND c.user_id IS NULL AND c.state='queued' AND c.ai_enabled AND c.assigned_to IS NULL
 AND c.created_at>=COALESCE((SELECT created_at FROM payload_migrations WHERE name='20261106_210000_chat_qualification' ORDER BY id LIMIT 1),clock_timestamp())
 AND EXISTS(SELECT 1 FROM lvd_chat_files f WHERE f.conversation_id=c.id)
 AND NOT EXISTS(SELECT 1 FROM lvd_messages m WHERE m.conversation_id=c.id AND m.role='staff')
 AND NOT EXISTS(SELECT 1 FROM lvd_chat_events e WHERE e.conversation_id=c.id AND e.action IN ('claim','handoff','close','reopen','release'));
`);}
// Rollback code can safely keep these additive guards: its sweep skips attachments.
export async function down(_args:MigrateDownArgs){throw new Error('Preserve guest expiry history; roll back code without removing retention guards.');}
