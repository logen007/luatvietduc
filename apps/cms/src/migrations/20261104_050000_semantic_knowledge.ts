import {type MigrateUpArgs,type MigrateDownArgs,sql} from '@payloadcms/db-postgres';
export async function up({db}:MigrateUpArgs){
 await db.execute(sql`
 CREATE TABLE lvd_rag_jobs(source_id integer PRIMARY KEY,generation bigint NOT NULL DEFAULT 1,status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','processing','ready','waiting')),lease uuid,lease_until timestamptz,available_at timestamptz NOT NULL DEFAULT now(),attempts integer NOT NULL DEFAULT 0,indexed_revision text,error_code text,updated_at timestamptz NOT NULL DEFAULT now());
 CREATE INDEX lvd_rag_jobs_pending ON lvd_rag_jobs(available_at,source_id) WHERE status IN ('pending','waiting','processing');
 CREATE TABLE lvd_rag_chunks(id uuid PRIMARY KEY,source_id integer NOT NULL REFERENCES knowledge(id) ON DELETE CASCADE,revision text NOT NULL,ordinal integer NOT NULL,body text NOT NULL,UNIQUE(source_id,revision,ordinal));
 CREATE INDEX lvd_rag_chunks_source ON lvd_rag_chunks(source_id);
 CREATE TABLE lvd_rag_usage(day date PRIMARY KEY,count integer NOT NULL DEFAULT 0);
 CREATE TABLE lvd_rag_worker(id boolean PRIMARY KEY DEFAULT true CHECK(id),heartbeat_at timestamptz NOT NULL DEFAULT now(),state text NOT NULL);
 CREATE FUNCTION lvd_enqueue_knowledge() RETURNS trigger LANGUAGE plpgsql AS $$
 BEGIN
 INSERT INTO lvd_rag_jobs(source_id) VALUES(COALESCE(NEW.id,OLD.id)) ON CONFLICT(source_id) DO UPDATE SET generation=lvd_rag_jobs.generation+1,status='pending',available_at=now(),attempts=0,error_code=NULL,updated_at=now();
 RETURN COALESCE(NEW,OLD);
 END $$;
 CREATE TRIGGER lvd_knowledge_index_job AFTER INSERT OR UPDATE OR DELETE ON knowledge FOR EACH ROW EXECUTE FUNCTION lvd_enqueue_knowledge();
 INSERT INTO lvd_rag_jobs(source_id) SELECT id FROM knowledge;
 CREATE INDEX lvd_chat_knowledge_gaps ON lvd_chat_events(created_at DESC) WHERE action='ai.handoff';
 `);
}
export async function down(_args:MigrateDownArgs){throw new Error('Reviewed forward recovery only; retain knowledge jobs and consent records.');}
