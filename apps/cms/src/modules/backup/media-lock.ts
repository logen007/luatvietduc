import {sql} from '@payloadcms/db-postgres';
import type {PayloadRequest} from 'payload';
export async function mediaWriteGuard({req}:{req:PayloadRequest}){
 if(!req.transactionID)throw new Error('Media transaction required');
 const id=await req.transactionID;
 const db=(req.payload.db as unknown as {sessions:Record<string,{db:{execute:(q:unknown)=>Promise<{rows:Record<string,unknown>[]}>}}>}).sessions[String(id)]?.db;
 if(!db)throw new Error('Media transaction unavailable');
 await db.execute(sql`SELECT pg_advisory_xact_lock_shared(73041104)`);
 const result=await db.execute(sql`SELECT media_locked_until>now() AS locked FROM lvd_backup_runtime WHERE id=1`);
 if(result.rows[0]?.locked)throw new Error('Đang sao lưu tệp. Vui lòng thử lại sau ít phút.');
}
