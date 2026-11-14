import {type MigrateUpArgs,type MigrateDownArgs,sql} from '@payloadcms/db-postgres';
export async function up({db}:MigrateUpArgs){await db.execute(sql`
 -- Preserve the previous role for guarded rollback; passwords, IDs and sessions stay intact.
 CREATE TABLE IF NOT EXISTS lvd_role_transition(user_id integer PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,previous_role text NOT NULL,previous_updated_at timestamptz NOT NULL);
 INSERT INTO lvd_role_transition(user_id,previous_role,previous_updated_at)
 SELECT id,role::text,updated_at FROM users WHERE role::text IN ('operations','editor','reviewer','publisher','knowledge') ON CONFLICT DO NOTHING;
 UPDATE users SET role='support' WHERE role::text IN ('operations','editor','reviewer','publisher','knowledge');
 -- Existing enum values remain only for safe rollback and mixed-version reads.
 ALTER TABLE users ADD CONSTRAINT lvd_users_three_roles CHECK(role::text IN ('owner','support','member')) NOT VALID;
 ALTER TABLE users VALIDATE CONSTRAINT lvd_users_three_roles;
 `);}
export async function down({db}:MigrateDownArgs){await db.execute(sql`
 ALTER TABLE users DROP CONSTRAINT IF EXISTS lvd_users_three_roles;
 -- Never undo an administrator's subsequent account change.
 UPDATE users u SET role=t.previous_role::enum_users_role FROM lvd_role_transition t WHERE u.id=t.user_id AND u.role='support' AND u.updated_at=t.previous_updated_at;
 DROP TABLE lvd_role_transition;
 `);}
