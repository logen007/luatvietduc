import test from 'node:test';
import assert from 'node:assert/strict';
import {readBackupStatus,readBackupReceipt} from '../src/modules/backup/client-contract.ts';
const id='12345678-abcd-4567-89ab-123456789abc',created_at='2026-11-06T00:00:00Z';
const empty={authorized:false,drive:{enabled:false},jobs:[],snapshots:[]};
test('backup status rejects malformed collections before rendering while preserving legitimate inactive setup',()=>{
 for(const runtime of [undefined,null,{ready:null},{ready:false},{ready:true}])assert.deepEqual(readBackupStatus({...empty,runtime}),{...empty,runtime});
 for(const value of [null,{},[],{...empty,jobs:null},{...empty,snapshots:{}},{...empty,authorized:'yes'},{...empty,drive:null},{...empty,runtime:{ready:'yes'}},{...empty,jobs:[null]},{...empty,snapshots:[null]}])assert.throws(()=>readBackupStatus(value),/Chưa tải/);
});
test('backup job history validates the state and date consumed by the panel',()=>{
 for(const kind of ['backup','restore-test'])for(const state of ['queued','running','complete','failed'])assert.equal(readBackupStatus({...empty,jobs:[{id,kind,state,created_at,message:null}]}).jobs.length,1);
 for(const change of [{id:'wrong'},{kind:'other'},{state:'other'},{created_at:'invalid'},{message:{}}])assert.throws(()=>readBackupStatus({...empty,jobs:[{id,kind:'backup',state:'queued',created_at,...change}]}));
});
test('PostgreSQL snapshot byte strings remain supported without accepting invalid sizes or dates',()=>{
 for(const bytes of [0,1234,'1234'])assert.equal(readBackupStatus({...empty,snapshots:[{id,created_at,bytes,restore_tested_at:null}]}).snapshots[0].bytes,bytes);
 for(const change of [{bytes:''},{bytes:-1},{bytes:'-1'},{bytes:'NaN'},{bytes:'9007199254740992'},{bytes:{}},{created_at:'bad'},{restore_tested_at:'bad'}])assert.throws(()=>readBackupStatus({...empty,snapshots:[{id,created_at,bytes:'1234',...change}]}));
});
test('a backup action is acknowledged only by a job receipt and cannot echo unrelated fields',()=>{
 const value={id,message:'Synthetic job accepted',privateKey:'must not enter UI'};assert.deepEqual(readBackupReceipt(value),{id,message:value.message});
 for(const value of [null,{},[],{id},{id,message:''},{id:'wrong',message:'Accepted'},{id,message:{}}])assert.throws(()=>readBackupReceipt(value),/Chưa xác nhận/);
});
