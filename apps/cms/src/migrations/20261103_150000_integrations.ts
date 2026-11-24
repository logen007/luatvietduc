import { type MigrateUpArgs, type MigrateDownArgs, sql } from '@payloadcms/db-postgres';
export async function up({ db }: MigrateUpArgs) {
  await db.execute(sql`
    CREATE TABLE lvd_integrations (
      provider text PRIMARY KEY CHECK(provider IN ('google','ai','r2','email')),
      encrypted_values text NOT NULL,
      enabled boolean NOT NULL DEFAULT false,
      version integer NOT NULL DEFAULT 1,
      check_state text NOT NULL DEFAULT 'untested' CHECK(check_state IN ('untested','passed','failed','configured')),
      checked_at timestamptz,
      updated_by integer REFERENCES users(id) ON DELETE SET NULL,
      updated_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE TABLE lvd_integration_events (
      id bigserial PRIMARY KEY, provider text NOT NULL, action text NOT NULL,
      actor_id integer REFERENCES users(id) ON DELETE SET NULL,
      version integer NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
    );
    ALTER TABLE media ADD COLUMN IF NOT EXISTS prefix varchar;
    ALTER TABLE media ADD COLUMN IF NOT EXISTS _object_key varchar;
  `);
}
// Never run this rollback on production: it removes saved connection secrets.
export async function down({ db }: MigrateDownArgs) {
  await db.execute(sql`DROP TABLE lvd_integration_events; DROP TABLE lvd_integrations;`);
}
