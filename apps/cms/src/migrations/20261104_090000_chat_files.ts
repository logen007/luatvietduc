import {type MigrateUpArgs,type MigrateDownArgs,sql} from '@payloadcms/db-postgres';
export async function up({db}:MigrateUpArgs){await db.execute(sql`
 CREATE TABLE lvd_chat_files(id uuid PRIMARY KEY,conversation_id uuid NOT NULL REFERENCES lvd_conversations(id) ON DELETE CASCADE,message_id bigint REFERENCES lvd_messages(id) ON DELETE CASCADE,actor_key text NOT NULL,object_key text NOT NULL UNIQUE,name varchar(180) NOT NULL,mime_type varchar(100) NOT NULL,size integer NOT NULL CHECK(size>0 AND size<=10485760),ready boolean NOT NULL DEFAULT false,internal boolean NOT NULL DEFAULT false,created_at timestamptz NOT NULL DEFAULT now());
 CREATE INDEX lvd_chat_files_conversation_idx ON lvd_chat_files(conversation_id);
 CREATE INDEX lvd_chat_files_message_idx ON lvd_chat_files(message_id);
`);}
export async function down(_args:MigrateDownArgs){throw new Error('Forward recovery only; preserve private conversation files.');}
