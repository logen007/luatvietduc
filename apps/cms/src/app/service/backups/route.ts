import {NextResponse} from 'next/server';
import {randomUUID} from 'node:crypto';
import {pool} from '../../../modules/shared/db';
import {backupOwner,backupInput} from '../../../modules/backup/access';
import {IntegrationError} from '../../../modules/integrations/validation';
import {activeValues,readRow,safeConnection} from '../../../modules/integrations/store';
import {unseal,seal} from '../../../modules/integrations/crypto';
import {rateLimit} from '../../../modules/chat/service';
export const dynamic='force-dynamic';
const json=(v:unknown,status=200)=>NextResponse.json(v,{status,headers:{'Cache-Control':'no-store'}});
export async function GET(req:Request){try{
 await backupOwner(req);
 const config=await readRow('drive');const v=config?unseal('drive',config.encrypted_values):{};
 const runtime=(await pool.query('SELECT heartbeat,heartbeat>now()-interval \'3 minutes\' AS ready FROM lvd_backup_runtime WHERE id=1')).rows[0];
 return json({drive:await safeConnection('drive'),authorized:Boolean(v.refreshToken&&v.folderId),folderId:v.folderId||null,runtime,
 jobs:(await pool.query('SELECT id,kind,state,snapshot_id,message,created_at,finished_at FROM lvd_backup_jobs ORDER BY created_at DESC LIMIT 20')).rows,
 snapshots:(await pool.query('SELECT id,bytes,commit_sha,media_included,created_at,verified_at,restore_tested_at FROM lvd_backup_snapshots WHERE trashed_at IS NULL ORDER BY created_at DESC LIMIT 20')).rows});
 }catch(e){return json({error:e instanceof IntegrationError?e.message:'Chưa tải được trạng thái sao lưu.'},e instanceof IntegrationError?e.status:503);}}
export async function POST(req:Request){try{
 const user=await backupOwner(req),data=await backupInput(req);await rateLimit('backup:'+user.id,4);
 if(!['backup','restore-test'].includes(data.action))throw new IntegrationError(400,'Thao tác không hợp lệ.');
 if(!(await activeValues('drive')))throw new IntegrationError(409,'Hãy kết nối, kiểm tra và bật Google Drive trước.');
 if(!(await pool.query("SELECT 1 FROM lvd_backup_runtime WHERE id=1 AND heartbeat>now()-interval '3 minutes'")).rowCount)throw new IntegrationError(503,'Tiến trình sao lưu chưa sẵn sàng.');
 const id=randomUUID();let snapshot:string|null=null,secret:string|null=null;
 if(data.action==='restore-test'){
  if(typeof data.snapshotId!=='string'||!(/^[a-f0-9-]{36}$/.test(data.snapshotId))||!(await pool.query('SELECT 1 FROM lvd_backup_snapshots WHERE id=$1 AND trashed_at IS NULL',[data.snapshotId])).rowCount)throw new IntegrationError(400,'Bản sao không hợp lệ.');
  if(typeof data.identity!=='string'||!/^AGE-SECRET-KEY-1[0-9A-Z]{40,100}$/.test(data.identity.trim()))throw new IntegrationError(400,'Nhập khóa age khôi phục cho lượt kiểm tra này.');
  snapshot=data.snapshotId;secret=seal('backup-job:'+id,{identity:data.identity.trim()});
 }
 try{await pool.query('INSERT INTO lvd_backup_jobs(id,kind,snapshot_id,secret_payload,requested_by) VALUES($1,$2,$3,$4,$5)',[id,data.action,snapshot,secret,user.id]);}
 catch(e){if((e as {code?:string}).code==='23505')throw new IntegrationError(409,'Đã có một tác vụ đang chờ hoặc đang chạy.');throw e;}
 return json({id,message:'Đã tiếp nhận tác vụ. Theo dõi kết quả tại đây.'},202);
 }catch(e){return json({error:e instanceof IntegrationError?e.message:'Chưa tiếp nhận được tác vụ.'},e instanceof IntegrationError?e.status:503);}}
