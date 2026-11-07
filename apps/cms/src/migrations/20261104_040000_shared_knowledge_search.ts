import {type MigrateUpArgs,type MigrateDownArgs,sql} from '@payloadcms/db-postgres';
export async function up({db}:MigrateUpArgs){await db.execute(sql`
 ALTER TYPE enum_knowledge_jurisdiction ADD VALUE IF NOT EXISTS 'BOTH';
 ALTER TYPE enum__knowledge_v_version_jurisdiction ADD VALUE IF NOT EXISTS 'BOTH';
 ALTER TABLE lvd_conversations DROP CONSTRAINT lvd_conversations_jurisdiction_check;
 ALTER TABLE lvd_conversations ADD CONSTRAINT lvd_conversations_jurisdiction_check CHECK(jurisdiction IN ('VN','DE','BOTH'));
`);await db.execute(sql`
 CREATE FUNCTION public.lvd_question_key(value text) RETURNS text LANGUAGE sql IMMUTABLE STRICT PARALLEL SAFE AS $key$
 SELECT btrim(regexp_replace(regexp_replace(btrim(lower(translate(regexp_replace(normalize(value,NFD),'[̀-ͯ]','','g'),'đĐ','dD'))),'[?!]+$',''),'[[:space:]]+',' ','g'))
 $key$;
`);await db.execute(sql`
 CREATE FUNCTION public.lvd_knowledge_keys(title text,aliases text) RETURNS text[] LANGUAGE sql IMMUTABLE PARALLEL SAFE AS $keys$
 SELECT ARRAY(SELECT DISTINCT public.lvd_question_key(value) FROM unnest(ARRAY[title]||string_to_array(coalesce(aliases,''),E'\n')) AS entries(value) WHERE public.lvd_question_key(value)<>'')
 $keys$;
`);await db.execute(sql`
 CREATE INDEX lvd_knowledge_question_lookup ON knowledge USING gin(public.lvd_knowledge_keys(title,question_aliases)) WHERE approved AND _status='published';
 CREATE INDEX lvd_knowledge_recent ON knowledge(updated_at DESC,id DESC) WHERE approved AND _status='published';
`)}
export async function down(_args:MigrateDownArgs){throw new Error('Preserve shared knowledge and conversations; use reviewed forward recovery.');}
