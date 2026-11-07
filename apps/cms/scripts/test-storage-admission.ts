import assert from 'node:assert/strict';
import {pool} from '../src/modules/shared/db';
import {IntegrationError} from '../src/modules/integrations/validation';
import {saveConnection} from '../src/modules/integrations/store';
import {seal,unseal} from '../src/modules/integrations/crypto';
import {bundledNames} from '../src/modules/storage/bundled';
import {hasStoredFiles,mediaInventorySQL} from '../src/modules/storage/inventory';
export async function testStorageAdmission(){
 const url=new URL(process.env.DATABASE_URL||'');assert.ok(['127.0.0.1','localhost'].includes(url.hostname)&&url.pathname==='/lvd_test','Synthetic isolated database only');
 const connect=pool.connect,db=await pool.connect(),holder=await pool.connect();
 const old={endpoint:'https://'+'a'.repeat(32)+'.r2.cloudflarestorage.com',bucket:'synthetic-old',accessKeyId:'synthetic-access',secretAccessKey:'synthetic-secret'};
 const next={...old,bucket:'synthetic-new'};
 try{
  // Session-local tables shadow only this connection; production-shaped SQL is
  // exercised without deleting or modifying any shared test fixtures.
  await db.query('CREATE TEMP TABLE media(filename text,prefix text,_objectkey text,_object_key text,mime_type text,original_file jsonb)');
  await db.query('CREATE TEMP TABLE lvd_chat_files(object_key text,mime_type text,ready boolean)');
  await db.query('CREATE TEMP TABLE lvd_integrations(provider text PRIMARY KEY,encrypted_values text,enabled boolean,version integer,check_state text,checked_at timestamptz,updated_by integer,updated_at timestamptz)');
  await db.query('CREATE TEMP TABLE lvd_integration_events(provider text,action text,actor_id integer,version integer)');
  (pool as any).connect=async()=>({query:db.query.bind(db),release(){}});
  const reset=async()=>{await db.query('TRUNCATE pg_temp.media,pg_temp.lvd_chat_files,pg_temp.lvd_integrations,pg_temp.lvd_integration_events');await db.query("INSERT INTO lvd_integrations(provider,encrypted_values,enabled,version,check_state) VALUES('r2',$1,true,1,'passed')",[seal('r2',old)]);};
  await reset();await db.query('INSERT INTO media(filename) VALUES($1)',[bundledNames[0]]);
  assert.equal(await hasStoredFiles(db),false);assert.equal((await db.query('SELECT 1 FROM media LIMIT 1')).rowCount,1,'Prior guard wrongly treated a packaged file as bucket data');
  await saveConnection('r2',next,1,1);assert.equal(unseal('r2',(await db.query("SELECT encrypted_values FROM lvd_integrations WHERE provider='r2'")).rows[0].encrypted_values).bucket,next.bucket);
  await reset();const uploaded='lvd-bundled-user-upload.pdf';assert.ok(!bundledNames.includes(uploaded));await db.query("INSERT INTO media(filename,mime_type) VALUES($1,'application/pdf')",[uploaded]);
  assert.equal(await hasStoredFiles(db),true);assert.ok((await db.query(mediaInventorySQL)).rows.some(row=>row.filename===uploaded),'A prefix resembling a packaged filename cannot omit an uploaded object from backup');
  await assert.rejects(saveConnection('r2',next,1,1),error=>error instanceof IntegrationError&&error.status===409);
  for(const ready of [false,true]){await reset();await db.query("INSERT INTO lvd_chat_files(object_key,mime_type,ready) VALUES('private-chat/synthetic/file','text/plain',$1)",[ready]);assert.equal(await hasStoredFiles(db),true);await assert.rejects(saveConnection('r2',next,1,1),error=>error instanceof IntegrationError&&error.status===409);}
  await saveConnection('r2',{...old,secretAccessKey:'synthetic-replacement-key'},1,1);assert.equal((await db.query("SELECT version FROM lvd_integrations WHERE provider='r2'")).rows[0].version,2,'Key rotation in the same bucket remains available');
  await reset();await holder.query('BEGIN');await holder.query('SELECT pg_advisory_xact_lock_shared(73041104)');
  const started=Date.now();await assert.rejects(saveConnection('r2',next,1,1),error=>error instanceof IntegrationError&&error.status===409&&/thao tác tệp/.test(error.message));assert.ok(Date.now()-started<1500,'Relocation must reject active file work instead of exhausting the shared pool');await holder.query('ROLLBACK');
  assert.equal((await db.query("SELECT version FROM lvd_integrations WHERE provider='r2'")).rows[0].version,1,'Rejected relocation leaves configuration unchanged');
  console.log('Storage admission checks passed: packaged-only setup, exact filename inventory, mutable/chat/pending-file relocation denial, same-bucket key rotation and active-upload try-lock; no external storage calls');
 }finally{
  (pool as any).connect=connect;await holder.query('ROLLBACK');await db.query('ROLLBACK');
  await db.query('DROP TABLE IF EXISTS pg_temp.lvd_integration_events,pg_temp.lvd_integrations,pg_temp.lvd_chat_files,pg_temp.media');holder.release();db.release();
 }
}
