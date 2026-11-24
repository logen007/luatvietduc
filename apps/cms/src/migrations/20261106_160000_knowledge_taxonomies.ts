import {type MigrateUpArgs,type MigrateDownArgs,sql} from '@payloadcms/db-postgres';

export async function up({db}:MigrateUpArgs){await db.execute(sql`
 CREATE TABLE IF NOT EXISTS knowledge_rels(id serial PRIMARY KEY,"order" integer,parent_id integer NOT NULL REFERENCES knowledge(id) ON DELETE CASCADE,path varchar NOT NULL,categories_id integer REFERENCES categories(id) ON DELETE CASCADE,tags_id integer REFERENCES tags(id) ON DELETE CASCADE);
 CREATE INDEX IF NOT EXISTS knowledge_rels_order_idx ON knowledge_rels("order");
 CREATE INDEX IF NOT EXISTS knowledge_rels_parent_idx ON knowledge_rels(parent_id);
 CREATE INDEX IF NOT EXISTS knowledge_rels_path_idx ON knowledge_rels(path);
 CREATE INDEX IF NOT EXISTS knowledge_rels_categories_idx ON knowledge_rels(categories_id);
 CREATE INDEX IF NOT EXISTS knowledge_rels_tags_idx ON knowledge_rels(tags_id);
 CREATE TABLE IF NOT EXISTS _knowledge_v_rels(id serial PRIMARY KEY,"order" integer,parent_id integer NOT NULL REFERENCES _knowledge_v(id) ON DELETE CASCADE,path varchar NOT NULL,categories_id integer REFERENCES categories(id) ON DELETE CASCADE,tags_id integer REFERENCES tags(id) ON DELETE CASCADE);
 CREATE INDEX IF NOT EXISTS _knowledge_v_rels_order_idx ON _knowledge_v_rels("order");
 CREATE INDEX IF NOT EXISTS _knowledge_v_rels_parent_idx ON _knowledge_v_rels(parent_id);
 CREATE INDEX IF NOT EXISTS _knowledge_v_rels_path_idx ON _knowledge_v_rels(path);
 CREATE INDEX IF NOT EXISTS _knowledge_v_rels_categories_idx ON _knowledge_v_rels(categories_id);
 CREATE INDEX IF NOT EXISTS _knowledge_v_rels_tags_idx ON _knowledge_v_rels(tags_id);
 -- Explicit rich bodies now use plain evidence consistently in private sources.
 -- Keep every record/body/ID; only refresh old index jobs which may contain markup.
 UPDATE lvd_rag_jobs j SET generation=j.generation+1,status='pending',available_at=now(),lease=NULL,lease_until=NULL,error_code=NULL,updated_at=now()
 FROM knowledge k WHERE k.id=j.source_id AND k.article_origin_id IS NULL AND k.body LIKE '%data-lvd-richtext=%';
 `);}

export async function down(_args:MigrateDownArgs){throw new Error('Preserve knowledge taxonomy links and version history. Roll back application code without dropping the additive tables.');}
