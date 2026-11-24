import {type MigrateUpArgs,type MigrateDownArgs,sql} from '@payloadcms/db-postgres';
export async function up({db}:MigrateUpArgs){
 await db.execute(sql`
  CREATE TABLE quick_replies(id serial PRIMARY KEY,title varchar NOT NULL,body varchar NOT NULL,enabled boolean DEFAULT true,updated_at timestamptz NOT NULL DEFAULT now(),created_at timestamptz NOT NULL DEFAULT now());
  CREATE INDEX quick_replies_updated_at_idx ON quick_replies(updated_at);
  CREATE INDEX quick_replies_created_at_idx ON quick_replies(created_at);
  CREATE INDEX quick_replies_title_idx ON quick_replies(title);
  ALTER TABLE payload_locked_documents_rels ADD COLUMN quick_replies_id integer REFERENCES quick_replies(id) ON DELETE CASCADE;
  CREATE INDEX payload_locked_documents_rels_quick_replies_idx ON payload_locked_documents_rels(quick_replies_id);
  INSERT INTO quick_replies(title,body) VALUES
   ('Hỏi thêm thông tin','Anh/chị vui lòng cho biết thêm thông tin để chuyên viên hỗ trợ chính xác hơn.'),
   ('Yêu cầu tài liệu','Anh/chị có thể gửi tài liệu liên quan ngay trong cuộc trò chuyện này.'),
   ('Đang xem xét','Chuyên viên đang xem xét nội dung anh/chị cung cấp và sẽ phản hồi tại đây.');
 `);
}
export async function down({db}:MigrateDownArgs){
 await db.execute(sql`ALTER TABLE payload_locked_documents_rels DROP COLUMN quick_replies_id; DROP TABLE quick_replies;`);
}
