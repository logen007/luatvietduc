import {type MigrateUpArgs,type MigrateDownArgs,sql} from '@payloadcms/db-postgres';
import posts from '../modules/legacy/posts.json';
export async function up({db}:MigrateUpArgs){
 for(const post of posts){
 const inserted=await db.execute(sql`INSERT INTO articles(title,slug,body,kind,jurisdiction,language,source_url,review_state,ai_allowed,_status,created_at,updated_at) VALUES(${post.title},${post.slug},${post.body},${post.kind}::enum_articles_kind,${post.jurisdiction}::enum_articles_jurisdiction,'vi',${post.sourceUrl||null},'draft',false,'draft',now(),now()) ON CONFLICT(slug) DO NOTHING RETURNING id`);
 const id=inserted.rows[0]?.id;if(!id)continue;
 if(post.category)await db.execute(sql`INSERT INTO articles_rels("order",parent_id,path,categories_id) SELECT 1,${Number(id)},'categories',id FROM categories WHERE slug=${post.category}`);
 for(const tag of post.tag?[post.tag]:['vietnam','germany'])await db.execute(sql`INSERT INTO articles_rels("order",parent_id,path,tags_id) SELECT 1,${Number(id)},'tags',id FROM tags WHERE slug=${tag}`);
 const version=await db.execute(sql`INSERT INTO _articles_v(parent_id,version_title,version_slug,version_body,version_kind,version_jurisdiction,version_language,version_source_url,version_review_state,version_ai_allowed,version__status,version_created_at,version_updated_at,latest) SELECT id,title,slug,body,kind::text::enum__articles_v_version_kind,jurisdiction::text::enum__articles_v_version_jurisdiction,language::text::enum__articles_v_version_language,source_url,'draft',false,'draft',created_at,updated_at,true FROM articles WHERE id=${Number(id)} RETURNING id`);
 const vid=Number(version.rows[0]?.id);await db.execute(sql`INSERT INTO _articles_v_rels("order",parent_id,path,categories_id,tags_id) SELECT "order",${vid},'version.'||path,categories_id,tags_id FROM articles_rels WHERE parent_id=${Number(id)}`);
 }
}
export async function down(_args:MigrateDownArgs){throw new Error('Preserve imported drafts and any subsequent author edits; forward recovery only.');}
