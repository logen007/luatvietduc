import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {drizzle} from 'drizzle-orm/node-postgres';
import type {MigrateUpArgs,MigrateDownArgs} from '@payloadcms/db-postgres';
import {pool} from '../src/modules/shared/db';
import {up,down} from '../src/migrations/20261109_010000_guest_chat_expiry';
// Exercise the actual migration over legacy-shaped fixtures in a transaction-
// local schema. Rollback removes the schema and all fixtures, not app records.
export async function testGuestExpiryMigration(){
 const url=new URL(process.env.DATABASE_URL||'');assert.ok(['localhost','127.0.0.1'].includes(url.hostname)&&url.pathname==='/lvd_test');
 const client=await pool.connect(),schema='lvd_expiry_'+randomUUID().replace(/-/g,''),ids=Array.from({length:7},()=>randomUUID());
 try{
  await client.query('BEGIN');await client.query('CREATE SCHEMA '+schema);await client.query('SET LOCAL search_path TO '+schema);
  await client.query(`CREATE TABLE payload_migrations(id serial,name text,created_at timestamptz);
   INSERT INTO payload_migrations(name,created_at) VALUES('20261106_210000_chat_qualification',now()-interval '10 days');
   CREATE TABLE lvd_conversations(id uuid PRIMARY KEY,user_id int,state text DEFAULT 'queued',ai_enabled boolean DEFAULT true,assigned_to int,created_at timestamptz DEFAULT now(),retain_history boolean DEFAULT true,qualification text DEFAULT 'needs_details',low_priority_expires_at timestamptz);
   CREATE TABLE lvd_chat_files(conversation_id uuid);CREATE TABLE lvd_messages(conversation_id uuid,role text,created_at timestamptz);CREATE TABLE lvd_chat_events(conversation_id uuid,action text);
   CREATE FUNCTION lvd_chat_expiry_guard() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN NEW.retain_history=OLD.retain_history OR NEW.retain_history OR NEW.qualification IN ('needs_details','ready');IF NEW.retain_history THEN NEW.low_priority_expires_at=NULL;END IF;RETURN NEW;END $$;
   CREATE TRIGGER lvd_chat_expiry_guard BEFORE UPDATE ON lvd_conversations FOR EACH ROW EXECUTE FUNCTION lvd_chat_expiry_guard();`);
  for(const id of ids)await client.query("INSERT INTO lvd_conversations(id,created_at) VALUES($1,now()-interval '3 hours')",[id]);
  await client.query("UPDATE lvd_conversations SET created_at=now()-interval '1 year' WHERE id=$1",[ids[1]]);
  await client.query('UPDATE lvd_conversations SET user_id=7 WHERE id=$1',[ids[2]]);
  await client.query('INSERT INTO lvd_chat_files VALUES($1)',[ids[3]]);
  await client.query("UPDATE lvd_conversations SET state='human',assigned_to=7,ai_enabled=false WHERE id=$1",[ids[4]]);
  await client.query("INSERT INTO lvd_messages VALUES($1,'staff',now())",[ids[5]]);
  await client.query("INSERT INTO lvd_chat_events VALUES($1,'handoff')",[ids[6]]);
  await up({db:drizzle(client)} as unknown as MigrateUpArgs);
  const rows=(await client.query('SELECT * FROM lvd_conversations')).rows;assert.equal(rows.length,7,'Migration deletes no history');
  const temporary=rows.find(row=>row.id===ids[0]);assert.equal(temporary.guest_expiry_enabled,true);
  const remaining=new Date(temporary.low_priority_expires_at).getTime()-Date.now();assert.ok(remaining>7190000&&remaining<=7201000,'Old eligible guests receive a full grace period, not an immediately expired deadline');
  for(const id of ids.slice(1)){const row=rows.find(row=>row.id===id);assert.equal(row.guest_expiry_enabled,false);assert.equal(row.low_priority_expires_at,null);}
  const fresh=randomUUID();await client.query("INSERT INTO lvd_conversations(id,retain_history,qualification) VALUES($1,false,'unassessed')",[fresh]);const created=(await client.query('SELECT * FROM lvd_conversations WHERE id=$1',[fresh])).rows[0];assert.equal(created.guest_expiry_enabled,true);assert.ok(created.low_priority_expires_at);
  await assert.rejects(()=>down({} as MigrateDownArgs),/Preserve/);
  console.log('Guest expiry migration passed: actual legacy backfill, full grace, account/archive/file/human protection, old-writer insert compatibility and non-destructive rollback.');
 }finally{await client.query('ROLLBACK');client.release();}
}
