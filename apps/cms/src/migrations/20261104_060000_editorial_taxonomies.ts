import {type MigrateUpArgs,type MigrateDownArgs,sql} from '@payloadcms/db-postgres';
import seeds from '../modules/taxonomy/seeds.json';
export async function up({db}:MigrateUpArgs){
 await db.execute(sql`ALTER TYPE enum_articles_jurisdiction ADD VALUE IF NOT EXISTS 'BOTH'; ALTER TYPE enum__articles_v_version_jurisdiction ADD VALUE IF NOT EXISTS 'BOTH';`);
 await db.execute(sql`
 CREATE TABLE categories(id serial PRIMARY KEY,name varchar NOT NULL,label varchar,slug varchar NOT NULL,parent_id integer,description varchar,updated_at timestamptz NOT NULL DEFAULT now(),created_at timestamptz NOT NULL DEFAULT now());
 CREATE UNIQUE INDEX categories_slug_idx ON categories(slug);
 CREATE INDEX categories_parent_idx ON categories(parent_id);
 ALTER TABLE categories ADD CONSTRAINT categories_parent_fk FOREIGN KEY(parent_id) REFERENCES categories(id) ON DELETE SET NULL;
 CREATE TABLE tags(id serial PRIMARY KEY,name varchar NOT NULL,slug varchar NOT NULL,description varchar,updated_at timestamptz NOT NULL DEFAULT now(),created_at timestamptz NOT NULL DEFAULT now());
 CREATE UNIQUE INDEX tags_slug_idx ON tags(slug);
 CREATE TABLE articles_rels(id serial PRIMARY KEY,"order" integer,parent_id integer NOT NULL REFERENCES articles(id) ON DELETE CASCADE,path varchar NOT NULL,categories_id integer REFERENCES categories(id) ON DELETE CASCADE,tags_id integer REFERENCES tags(id) ON DELETE CASCADE);
 CREATE INDEX articles_rels_order_idx ON articles_rels("order"); CREATE INDEX articles_rels_parent_idx ON articles_rels(parent_id); CREATE INDEX articles_rels_path_idx ON articles_rels(path); CREATE INDEX articles_rels_categories_idx ON articles_rels(categories_id); CREATE INDEX articles_rels_tags_idx ON articles_rels(tags_id);
 CREATE TABLE _articles_v_rels(id serial PRIMARY KEY,"order" integer,parent_id integer NOT NULL REFERENCES _articles_v(id) ON DELETE CASCADE,path varchar NOT NULL,categories_id integer REFERENCES categories(id) ON DELETE CASCADE,tags_id integer REFERENCES tags(id) ON DELETE CASCADE);
 CREATE INDEX _articles_v_rels_order_idx ON _articles_v_rels("order"); CREATE INDEX _articles_v_rels_parent_idx ON _articles_v_rels(parent_id); CREATE INDEX _articles_v_rels_path_idx ON _articles_v_rels(path); CREATE INDEX _articles_v_rels_categories_idx ON _articles_v_rels(categories_id); CREATE INDEX _articles_v_rels_tags_idx ON _articles_v_rels(tags_id);
 ALTER TABLE payload_locked_documents_rels ADD COLUMN categories_id integer REFERENCES categories(id) ON DELETE CASCADE;
 ALTER TABLE payload_locked_documents_rels ADD COLUMN tags_id integer REFERENCES tags(id) ON DELETE CASCADE;
 CREATE INDEX payload_locked_documents_rels_categories_idx ON payload_locked_documents_rels(categories_id); CREATE INDEX payload_locked_documents_rels_tags_idx ON payload_locked_documents_rels(tags_id);
 ALTER TABLE knowledge ADD COLUMN article_origin_id integer REFERENCES articles(id) ON DELETE CASCADE;
 ALTER TABLE _knowledge_v ADD COLUMN version_article_origin_id integer REFERENCES articles(id) ON DELETE SET NULL;
 CREATE UNIQUE INDEX knowledge_article_origin_idx ON knowledge(article_origin_id);
 CREATE FUNCTION lvd_category_tree_lock() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN PERFORM pg_advisory_xact_lock(20491105);RETURN NULL;END $$;
 CREATE TRIGGER lvd_category_lock BEFORE INSERT OR UPDATE OR DELETE ON categories FOR EACH STATEMENT EXECUTE FUNCTION lvd_category_tree_lock();
 CREATE FUNCTION lvd_category_tree_guard() RETURNS trigger LANGUAGE plpgsql AS $$
 BEGIN
 PERFORM pg_advisory_xact_lock(20491105);
 IF TG_OP='DELETE' THEN UPDATE categories SET parent_id=OLD.parent_id WHERE parent_id=OLD.id;RETURN OLD;END IF;
 IF NEW.parent_id IS NOT NULL AND EXISTS(WITH RECURSIVE ancestors AS(SELECT id,parent_id,ARRAY[id] AS visited FROM categories WHERE id=NEW.parent_id UNION ALL SELECT c.id,c.parent_id,a.visited||c.id FROM categories c JOIN ancestors a ON c.id=a.parent_id WHERE NOT c.id=ANY(a.visited)) SELECT 1 FROM ancestors WHERE id=NEW.id) THEN RAISE EXCEPTION 'Danh mục cha không được là chính nó hoặc danh mục con.'; END IF;
 IF NEW.parent_id=NEW.id THEN RAISE EXCEPTION 'Không thể chọn chính danh mục này làm cha.';END IF;
 NEW.label=CASE WHEN NEW.parent_id IS NULL THEN NEW.name ELSE (SELECT label FROM categories WHERE id=NEW.parent_id)||' > '||NEW.name END;
 RETURN NEW;
 END $$;
 CREATE TRIGGER lvd_category_tree BEFORE INSERT OR UPDATE OR DELETE ON categories FOR EACH ROW EXECUTE FUNCTION lvd_category_tree_guard();
 CREATE FUNCTION lvd_category_descendants() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.label IS DISTINCT FROM OLD.label THEN UPDATE categories SET name=name WHERE parent_id=NEW.id;END IF;RETURN NEW;END $$;
 CREATE TRIGGER lvd_category_labels AFTER UPDATE ON categories FOR EACH ROW EXECUTE FUNCTION lvd_category_descendants();
 CREATE FUNCTION lvd_article_knowledge_sync() RETURNS trigger LANGUAGE plpgsql AS $$
 BEGIN
 IF NEW.ai_allowed AND NEW._status='published' AND NEW.review_state='approved' THEN
 INSERT INTO knowledge(article_origin_id,title,body,jurisdiction,source_url,effective_from,review_due_at,approved,reviewed_by_id,reviewed_at,_status,created_at,updated_at)
 VALUES(NEW.id,NEW.title,NEW.body,NEW.jurisdiction::text::enum_knowledge_jurisdiction,'https://luatvietduc.com/bai-viet/'||NEW.slug,COALESCE(NEW.effective_from,NEW.created_at),COALESCE(NEW.review_due_at,NEW.updated_at+interval '90 days'),true,NEW.reviewed_by_id,NEW.reviewed_at,'published',NEW.created_at,NEW.updated_at)
 ON CONFLICT(article_origin_id) DO UPDATE SET title=EXCLUDED.title,body=EXCLUDED.body,jurisdiction=EXCLUDED.jurisdiction,source_url=EXCLUDED.source_url,effective_from=EXCLUDED.effective_from,review_due_at=EXCLUDED.review_due_at,approved=true,reviewed_by_id=EXCLUDED.reviewed_by_id,reviewed_at=EXCLUDED.reviewed_at,_status='published',updated_at=EXCLUDED.updated_at;
 ELSE UPDATE knowledge SET approved=false,_status='draft',updated_at=NEW.updated_at WHERE article_origin_id=NEW.id; END IF;
 RETURN NEW;
 END $$;
 CREATE TRIGGER lvd_article_knowledge AFTER INSERT OR UPDATE ON articles FOR EACH ROW EXECUTE FUNCTION lvd_article_knowledge_sync();
 `);
 for(const item of seeds.legal)await db.execute(sql`INSERT INTO categories(name,slug) VALUES(${item.name},${item.slug}) ON CONFLICT(slug) DO NOTHING`);
 await db.execute(sql`INSERT INTO categories(name,slug) VALUES('Tin tức','tin-tuc') ON CONFLICT(slug) DO NOTHING`);
 for(const item of seeds.news)await db.execute(sql`INSERT INTO categories(name,slug,parent_id) SELECT ${item.name},${item.slug},id FROM categories WHERE slug='tin-tuc' ON CONFLICT(slug) DO NOTHING`);
 for(const item of seeds.tags)await db.execute(sql`INSERT INTO tags(name,slug) VALUES(${item.name},${item.slug}) ON CONFLICT(slug) DO NOTHING`);
 // Reconcile existing checked published posts; no article is newly approved or opted in.
 await db.execute(sql`UPDATE articles SET ai_allowed=ai_allowed WHERE ai_allowed AND _status='published' AND review_state='approved'`);
}
export async function down(_args:MigrateDownArgs){throw new Error('Reviewed forward recovery only; preserve editorial taxonomy and AI eligibility.');}
