import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
  CREATE TABLE lvd_google_identities(subject text PRIMARY KEY,user_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE);
  CREATE TABLE lvd_sessions(token_hash text PRIMARY KEY,user_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,expires_at timestamptz NOT NULL);
  CREATE INDEX lvd_sessions_expiry ON lvd_sessions(expires_at);
  CREATE TABLE lvd_conversations(id uuid PRIMARY KEY,user_id integer REFERENCES users(id) ON DELETE CASCADE,guest_hash text,jurisdiction text NOT NULL CHECK(jurisdiction IN ('VN','DE')),specialty text NOT NULL DEFAULT 'general',title text NOT NULL,state text NOT NULL DEFAULT 'queued' CHECK(state IN ('queued','human','closed')),assigned_to integer REFERENCES users(id) ON DELETE SET NULL,version integer NOT NULL DEFAULT 1,created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now(),CHECK(user_id IS NOT NULL OR guest_hash IS NOT NULL));
  CREATE INDEX lvd_chat_user ON lvd_conversations(user_id,updated_at DESC);
  CREATE INDEX lvd_chat_guest ON lvd_conversations(guest_hash,updated_at DESC);
  CREATE INDEX lvd_chat_queue ON lvd_conversations(jurisdiction,state,created_at);
  CREATE TABLE lvd_messages(id bigserial PRIMARY KEY,conversation_id uuid NOT NULL REFERENCES lvd_conversations(id) ON DELETE CASCADE,role text NOT NULL CHECK(role IN ('user','staff')),body text NOT NULL,internal boolean NOT NULL DEFAULT false,actor_key text NOT NULL,client_key text NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),UNIQUE(conversation_id,client_key));
  CREATE TABLE lvd_chat_events(id bigserial PRIMARY KEY,conversation_id uuid NOT NULL REFERENCES lvd_conversations(id) ON DELETE CASCADE,action text NOT NULL,actor_id integer REFERENCES users(id) ON DELETE SET NULL,version integer NOT NULL,created_at timestamptz NOT NULL DEFAULT now());
  CREATE TABLE lvd_rate_limits(key text NOT NULL,window_start timestamptz NOT NULL,count integer NOT NULL,PRIMARY KEY(key,window_start));

   CREATE TYPE "public"."enum_articles_kind" AS ENUM('article', 'news', 'question');
  CREATE TYPE "public"."enum__articles_v_version_kind" AS ENUM('article', 'news', 'question');
  CREATE TYPE "public"."enum_knowledge_jurisdiction" AS ENUM('VN', 'DE');
  CREATE TYPE "public"."enum_knowledge_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__knowledge_v_version_jurisdiction" AS ENUM('VN', 'DE');
  CREATE TYPE "public"."enum__knowledge_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum_media_visibility" AS ENUM('private', 'public');
  CREATE TYPE "public"."enum_site_settings_time_zone" AS ENUM('Europe/Berlin', 'Asia/Ho_Chi_Minh');
  CREATE TYPE "public"."enum_site_settings_ai_mode" AS ENUM('off', 'internal-only');
  CREATE TABLE "knowledge" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"body" varchar,
  	"jurisdiction" "enum_knowledge_jurisdiction",
  	"source_url" varchar,
  	"effective_from" timestamp(3) with time zone,
  	"expires_at" timestamp(3) with time zone,
  	"review_due_at" timestamp(3) with time zone,
  	"approved" boolean DEFAULT false,
  	"reviewed_by_id" integer,
  	"reviewed_at" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "enum_knowledge_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "_knowledge_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_title" varchar,
  	"version_body" varchar,
  	"version_jurisdiction" "enum__knowledge_v_version_jurisdiction",
  	"version_source_url" varchar,
  	"version_effective_from" timestamp(3) with time zone,
  	"version_expires_at" timestamp(3) with time zone,
  	"version_review_due_at" timestamp(3) with time zone,
  	"version_approved" boolean DEFAULT false,
  	"version_reviewed_by_id" integer,
  	"version_reviewed_at" timestamp(3) with time zone,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "enum__knowledge_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"latest" boolean
  );
  
  CREATE TABLE "media" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"alt" varchar NOT NULL,
  	"visibility" "enum_media_visibility" DEFAULT 'private',
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"url" varchar,
  	"thumbnail_u_r_l" varchar,
  	"filename" varchar,
  	"mime_type" varchar,
  	"filesize" numeric,
  	"width" numeric,
  	"height" numeric,
  	"focal_x" numeric,
  	"focal_y" numeric
  );
  
  CREATE TABLE "audit_events" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"action" varchar NOT NULL,
  	"record_id" varchar NOT NULL,
  	"actor_id" integer,
  	"details" jsonb,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "site_settings_navigation" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar NOT NULL,
  	"url" varchar NOT NULL
  );
  
  ALTER TABLE "articles" ADD COLUMN "kind" "enum_articles_kind" DEFAULT 'article';
  ALTER TABLE "articles" ADD COLUMN "legal_field" varchar;
  ALTER TABLE "articles" ADD COLUMN "effective_from" timestamp(3) with time zone;
  ALTER TABLE "articles" ADD COLUMN "review_due_at" timestamp(3) with time zone;
  ALTER TABLE "articles" ADD COLUMN "reviewed_by_id" integer;
  ALTER TABLE "articles" ADD COLUMN "reviewed_at" timestamp(3) with time zone;
  ALTER TABLE "_articles_v" ADD COLUMN "version_kind" "enum__articles_v_version_kind" DEFAULT 'article';
  ALTER TABLE "_articles_v" ADD COLUMN "version_legal_field" varchar;
  ALTER TABLE "_articles_v" ADD COLUMN "version_effective_from" timestamp(3) with time zone;
  ALTER TABLE "_articles_v" ADD COLUMN "version_review_due_at" timestamp(3) with time zone;
  ALTER TABLE "_articles_v" ADD COLUMN "version_reviewed_by_id" integer;
  ALTER TABLE "_articles_v" ADD COLUMN "version_reviewed_at" timestamp(3) with time zone;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "knowledge_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "media_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "audit_events_id" integer;
  ALTER TABLE "site_settings" ADD COLUMN "tagline" varchar DEFAULT 'Thông tin pháp luật Việt Nam – Đức.';
  ALTER TABLE "site_settings" ADD COLUMN "logo_id" integer;
  ALTER TABLE "site_settings" ADD COLUMN "footer_text" varchar DEFAULT 'Thông tin tham khảo; không thay thế việc xem xét hồ sơ cụ thể.';
  ALTER TABLE "site_settings" ADD COLUMN "support_notice" varchar DEFAULT 'Yêu cầu được lưu vào hàng chờ. Chuyên viên phản hồi trong cuộc trò chuyện khi tiếp nhận.';
  ALTER TABLE "site_settings" ADD COLUMN "office_hours" varchar;
  ALTER TABLE "site_settings" ADD COLUMN "time_zone" "enum_site_settings_time_zone" DEFAULT 'Europe/Berlin';
  ALTER TABLE "site_settings" ADD COLUMN "chat_enabled" boolean DEFAULT true;
  ALTER TABLE "site_settings" ADD COLUMN "retention_days" numeric DEFAULT 365;
  ALTER TABLE "site_settings" ADD COLUMN "max_message_length" numeric DEFAULT 2000;
  ALTER TABLE "site_settings" ADD COLUMN "ai_mode" "enum_site_settings_ai_mode" DEFAULT 'internal-only';
  ALTER TABLE "site_settings" ADD COLUMN "ai_daily_requests" numeric DEFAULT 20;
  ALTER TABLE "site_settings" ADD COLUMN "ai_max_output_tokens" numeric DEFAULT 700;
  ALTER TABLE "site_settings" ADD COLUMN "accent_color" varchar DEFAULT '#176FFF';
  ALTER TABLE "site_settings" ADD COLUMN "privacy_text" varchar;
  ALTER TABLE "knowledge" ADD CONSTRAINT "knowledge_reviewed_by_id_users_id_fk" FOREIGN KEY ("reviewed_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_knowledge_v" ADD CONSTRAINT "_knowledge_v_parent_id_knowledge_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."knowledge"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_knowledge_v" ADD CONSTRAINT "_knowledge_v_version_reviewed_by_id_users_id_fk" FOREIGN KEY ("version_reviewed_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "site_settings_navigation" ADD CONSTRAINT "site_settings_navigation_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."site_settings"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "knowledge_reviewed_by_idx" ON "knowledge" USING btree ("reviewed_by_id");
  CREATE INDEX "knowledge_updated_at_idx" ON "knowledge" USING btree ("updated_at");
  CREATE INDEX "knowledge_created_at_idx" ON "knowledge" USING btree ("created_at");
  CREATE INDEX "knowledge__status_idx" ON "knowledge" USING btree ("_status");
  CREATE INDEX "_knowledge_v_parent_idx" ON "_knowledge_v" USING btree ("parent_id");
  CREATE INDEX "_knowledge_v_version_version_reviewed_by_idx" ON "_knowledge_v" USING btree ("version_reviewed_by_id");
  CREATE INDEX "_knowledge_v_version_version_updated_at_idx" ON "_knowledge_v" USING btree ("version_updated_at");
  CREATE INDEX "_knowledge_v_version_version_created_at_idx" ON "_knowledge_v" USING btree ("version_created_at");
  CREATE INDEX "_knowledge_v_version_version__status_idx" ON "_knowledge_v" USING btree ("version__status");
  CREATE INDEX "_knowledge_v_created_at_idx" ON "_knowledge_v" USING btree ("created_at");
  CREATE INDEX "_knowledge_v_updated_at_idx" ON "_knowledge_v" USING btree ("updated_at");
  CREATE INDEX "_knowledge_v_latest_idx" ON "_knowledge_v" USING btree ("latest");
  CREATE INDEX "media_updated_at_idx" ON "media" USING btree ("updated_at");
  CREATE INDEX "media_created_at_idx" ON "media" USING btree ("created_at");
  CREATE UNIQUE INDEX "media_filename_idx" ON "media" USING btree ("filename");
  CREATE INDEX "audit_events_actor_idx" ON "audit_events" USING btree ("actor_id");
  CREATE INDEX "audit_events_updated_at_idx" ON "audit_events" USING btree ("updated_at");
  CREATE INDEX "audit_events_created_at_idx" ON "audit_events" USING btree ("created_at");
  CREATE INDEX "site_settings_navigation_order_idx" ON "site_settings_navigation" USING btree ("_order");
  CREATE INDEX "site_settings_navigation_parent_id_idx" ON "site_settings_navigation" USING btree ("_parent_id");
  ALTER TABLE "articles" ADD CONSTRAINT "articles_reviewed_by_id_users_id_fk" FOREIGN KEY ("reviewed_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_articles_v" ADD CONSTRAINT "_articles_v_version_reviewed_by_id_users_id_fk" FOREIGN KEY ("version_reviewed_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_knowledge_fk" FOREIGN KEY ("knowledge_id") REFERENCES "public"."knowledge"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_media_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_audit_events_fk" FOREIGN KEY ("audit_events_id") REFERENCES "public"."audit_events"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "site_settings" ADD CONSTRAINT "site_settings_logo_id_media_id_fk" FOREIGN KEY ("logo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "articles_reviewed_by_idx" ON "articles" USING btree ("reviewed_by_id");
  CREATE INDEX "_articles_v_version_version_reviewed_by_idx" ON "_articles_v" USING btree ("version_reviewed_by_id");
  CREATE INDEX "payload_locked_documents_rels_knowledge_id_idx" ON "payload_locked_documents_rels" USING btree ("knowledge_id");
  CREATE INDEX "payload_locked_documents_rels_media_id_idx" ON "payload_locked_documents_rels" USING btree ("media_id");
  CREATE INDEX "payload_locked_documents_rels_audit_events_id_idx" ON "payload_locked_documents_rels" USING btree ("audit_events_id");
  CREATE INDEX "site_settings_logo_idx" ON "site_settings" USING btree ("logo_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
 DROP TABLE lvd_chat_events,lvd_messages,lvd_conversations,lvd_sessions,lvd_google_identities,lvd_rate_limits;

   ALTER TABLE "knowledge" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_knowledge_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "media" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "audit_events" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "site_settings_navigation" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "knowledge" CASCADE;
  DROP TABLE "_knowledge_v" CASCADE;
  DROP TABLE "media" CASCADE;
  DROP TABLE "audit_events" CASCADE;
  DROP TABLE "site_settings_navigation" CASCADE;
  ALTER TABLE "articles" DROP CONSTRAINT "articles_reviewed_by_id_users_id_fk";
  
  ALTER TABLE "_articles_v" DROP CONSTRAINT "_articles_v_version_reviewed_by_id_users_id_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_knowledge_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_media_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_audit_events_fk";
  
  ALTER TABLE "site_settings" DROP CONSTRAINT "site_settings_logo_id_media_id_fk";
  
  DROP INDEX "articles_reviewed_by_idx";
  DROP INDEX "_articles_v_version_version_reviewed_by_idx";
  DROP INDEX "payload_locked_documents_rels_knowledge_id_idx";
  DROP INDEX "payload_locked_documents_rels_media_id_idx";
  DROP INDEX "payload_locked_documents_rels_audit_events_id_idx";
  DROP INDEX "site_settings_logo_idx";
  ALTER TABLE "articles" DROP COLUMN "kind";
  ALTER TABLE "articles" DROP COLUMN "legal_field";
  ALTER TABLE "articles" DROP COLUMN "effective_from";
  ALTER TABLE "articles" DROP COLUMN "review_due_at";
  ALTER TABLE "articles" DROP COLUMN "reviewed_by_id";
  ALTER TABLE "articles" DROP COLUMN "reviewed_at";
  ALTER TABLE "_articles_v" DROP COLUMN "version_kind";
  ALTER TABLE "_articles_v" DROP COLUMN "version_legal_field";
  ALTER TABLE "_articles_v" DROP COLUMN "version_effective_from";
  ALTER TABLE "_articles_v" DROP COLUMN "version_review_due_at";
  ALTER TABLE "_articles_v" DROP COLUMN "version_reviewed_by_id";
  ALTER TABLE "_articles_v" DROP COLUMN "version_reviewed_at";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "knowledge_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "media_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "audit_events_id";
  ALTER TABLE "site_settings" DROP COLUMN "tagline";
  ALTER TABLE "site_settings" DROP COLUMN "logo_id";
  ALTER TABLE "site_settings" DROP COLUMN "footer_text";
  ALTER TABLE "site_settings" DROP COLUMN "support_notice";
  ALTER TABLE "site_settings" DROP COLUMN "office_hours";
  ALTER TABLE "site_settings" DROP COLUMN "time_zone";
  ALTER TABLE "site_settings" DROP COLUMN "chat_enabled";
  ALTER TABLE "site_settings" DROP COLUMN "retention_days";
  ALTER TABLE "site_settings" DROP COLUMN "max_message_length";
  ALTER TABLE "site_settings" DROP COLUMN "ai_mode";
  ALTER TABLE "site_settings" DROP COLUMN "ai_daily_requests";
  ALTER TABLE "site_settings" DROP COLUMN "ai_max_output_tokens";
  ALTER TABLE "site_settings" DROP COLUMN "accent_color";
  ALTER TABLE "site_settings" DROP COLUMN "privacy_text";
  DROP TYPE "public"."enum_articles_kind";
  DROP TYPE "public"."enum__articles_v_version_kind";
  DROP TYPE "public"."enum_knowledge_jurisdiction";
  DROP TYPE "public"."enum_knowledge_status";
  DROP TYPE "public"."enum__knowledge_v_version_jurisdiction";
  DROP TYPE "public"."enum__knowledge_v_version_status";
  DROP TYPE "public"."enum_media_visibility";
  DROP TYPE "public"."enum_site_settings_time_zone";
  DROP TYPE "public"."enum_site_settings_ai_mode";`)
}
