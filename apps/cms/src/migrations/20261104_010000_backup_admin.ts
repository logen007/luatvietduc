import {type MigrateUpArgs,type MigrateDownArgs,sql} from '@payloadcms/db-postgres';
export async function up({db}:MigrateUpArgs){await db.execute(sql`
 ALTER TABLE lvd_integrations DROP CONSTRAINT lvd_integrations_provider_check;
 ALTER TABLE lvd_integrations ADD CONSTRAINT lvd_integrations_provider_check CHECK(provider IN ('google','ai','r2','email','drive'));
 CREATE TABLE lvd_backup_jobs(id uuid PRIMARY KEY,kind text NOT NULL CHECK(kind IN ('backup','restore-test')),state text NOT NULL DEFAULT 'queued' CHECK(state IN ('queued','running','complete','failed')),snapshot_id uuid,secret_payload text,requested_by integer REFERENCES users(id) ON DELETE SET NULL,message text,created_at timestamptz NOT NULL DEFAULT now(),started_at timestamptz,finished_at timestamptz);
 CREATE UNIQUE INDEX lvd_backup_one_active ON lvd_backup_jobs((true)) WHERE state IN ('queued','running');
 CREATE TABLE lvd_backup_snapshots(id uuid PRIMARY KEY,remote_path text NOT NULL,monthly_path text,daily_trashed boolean NOT NULL DEFAULT false,sha256 text NOT NULL,bytes bigint NOT NULL,commit_sha text NOT NULL,media_included boolean NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),verified_at timestamptz NOT NULL,restore_tested_at timestamptz,trashed_at timestamptz);
 CREATE TABLE lvd_backup_runtime(id integer PRIMARY KEY CHECK(id=1),heartbeat timestamptz,media_locked_until timestamptz);
 INSERT INTO lvd_backup_runtime(id) VALUES(1);
`)}
export async function down({db}:MigrateDownArgs){await db.execute(sql`DROP TABLE lvd_backup_jobs;DROP TABLE lvd_backup_snapshots;DROP TABLE lvd_backup_runtime;`)}
