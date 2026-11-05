// Private host runner interface. Never exposed as an HTTP route.
import {pool,transaction} from '../../src/modules/shared/db';
import {activeValues} from '../../src/modules/integrations/store';
import {unseal} from '../../src/modules/integrations/crypto';
import {readFile} from 'node:fs/promises';
import {mediaInventorySQL as inventorySQL} from '../../src/modules/storage/inventory';
let input='';for await(const chunk of process.stdin){input+=chunk;if(input.length>16000)throw new Error('Too much input');}
const d=JSON.parse(input||'{}');
async function main(){
 if(d.action==='claim')return transaction(async db=>{
  await db.query('UPDATE lvd_backup_runtime SET heartbeat=now() WHERE id=1');
  await db.query("UPDATE lvd_backup_jobs SET state='failed',secret_payload=NULL,message='Tác vụ hết thời gian; cần yêu cầu lại.',finished_at=now() WHERE state IN ('running','queued') AND created_at<now()-interval '45 minutes'");
  const drive=await activeValues('drive');if(!drive)return null;
  // Once per 24 hours after enable. Failed jobs remain visible; no unbounded retry loop.
  await db.query("INSERT INTO lvd_backup_jobs(id,kind) SELECT gen_random_uuid(),'backup' WHERE NOT EXISTS(SELECT 1 FROM lvd_backup_jobs WHERE kind='backup' AND created_at>now()-interval '24 hours') ON CONFLICT DO NOTHING");
  const job=(await db.query("SELECT * FROM lvd_backup_jobs WHERE state='queued' ORDER BY created_at LIMIT 1 FOR UPDATE SKIP LOCKED")).rows[0];if(!job)return null;
  let identity=null;if(job.secret_payload)identity=unseal('backup-job:'+job.id,job.secret_payload).identity;
  await db.query("UPDATE lvd_backup_jobs SET state='running',started_at=now(),secret_payload=NULL WHERE id=$1",[job.id]);
  const snapshot=job.snapshot_id?(await db.query('SELECT * FROM lvd_backup_snapshots WHERE id=$1 AND trashed_at IS NULL',[job.snapshot_id])).rows[0]:null;
  const release=JSON.parse(await readFile('public/release.json','utf8'));
  return {job:{id:job.id,kind:job.kind},drive,r2:await activeValues('r2'),identity,snapshot,release,
    history:(await db.query('SELECT * FROM lvd_backup_snapshots WHERE trashed_at IS NULL ORDER BY created_at DESC')).rows,
    inventory:(await db.query(inventorySQL)).rows};
 });
 if(d.action==='lock')return transaction(async db=>{await db.query('SELECT pg_advisory_xact_lock(73041104)');await db.query("UPDATE lvd_backup_runtime SET media_locked_until=now()+interval '3 minutes' WHERE id=1");return true;});
 if(d.action==='pulse'){await pool.query("UPDATE lvd_backup_runtime SET heartbeat=now(),media_locked_until=CASE WHEN media_locked_until IS NOT NULL THEN now()+interval '3 minutes' ELSE NULL END WHERE id=1");return true;}
 if(d.action==='inventory')return (await pool.query(inventorySQL)).rows;
 if(d.action==='unlock'){await pool.query('UPDATE lvd_backup_runtime SET media_locked_until=NULL WHERE id=1');return true;}
 if(d.action==='finish')return transaction(async db=>{
  if(d.snapshot){const s=d.snapshot;await db.query('INSERT INTO lvd_backup_snapshots(id,remote_path,monthly_path,sha256,bytes,commit_sha,media_included,verified_at) VALUES($1,$2,$3,$4,$5,$6,$7,now())',[d.id,s.path,s.monthly||null,s.sha256,s.bytes,s.commit,s.media]);}
  if(d.tested)await db.query('UPDATE lvd_backup_snapshots SET restore_tested_at=now() WHERE id=$1',[d.tested]);
  for(const id of d.dailyTrashed||[])await db.query('UPDATE lvd_backup_snapshots SET daily_trashed=true WHERE id=$1',[id]);
  for(const id of d.monthlyTrashed||[])await db.query('UPDATE lvd_backup_snapshots SET monthly_path=NULL WHERE id=$1',[id]);
  await db.query('UPDATE lvd_backup_snapshots SET trashed_at=now() WHERE daily_trashed AND monthly_path IS NULL AND trashed_at IS NULL');
  await db.query("UPDATE lvd_backup_jobs SET state=$2,message=$3,secret_payload=NULL,finished_at=now() WHERE id=$1 AND state='running'",[d.id,d.ok?'complete':'failed',String(d.message||'').slice(0,500)]);
  await db.query('UPDATE lvd_backup_runtime SET media_locked_until=NULL,heartbeat=now() WHERE id=1');return true;
 });
 throw new Error('Unknown runner action');
}
try{console.log(JSON.stringify(await main()));}finally{await pool.end();}
