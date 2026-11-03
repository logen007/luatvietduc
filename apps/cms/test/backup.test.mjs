import {test} from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {seal,unseal} from '../src/modules/integrations/crypto.ts';
import {mergeValues} from '../src/modules/integrations/validation.ts';
test('backup archive and retention boundaries use synthetic local fixtures',()=>{
 execFileSync('python3',['-m','unittest','discover','-s','ops/backup','-p','test_runner.py','-v'],{cwd:fileURLToPath(new URL('../../../',import.meta.url)),timeout:15000});
});
test('one-time restore identity cannot be decrypted for another job',()=>{
 const key='synthetic-unit-only-backup-encryption-secret',envelope=seal('backup-job:one',{identity:'synthetic-not-a-real-age-key'},key);
 assert.equal(unseal('backup-job:one',envelope,key).identity,'synthetic-not-a-real-age-key');
 assert.throws(()=>unseal('backup-job:two',envelope,key));
});
test('Drive settings discard previous authorization when credentials change',()=>{
 const values=mergeValues('drive',{clientSecret:'synthetic-secret',refreshToken:'synthetic-token',folderId:'old-folder'}, {clientId:'example.apps.googleusercontent.com',clientSecret:'',ageRecipient:'age1'+'a'.repeat(58)});
 assert.equal(values.clientSecret,'synthetic-secret');assert.equal(values.refreshToken,undefined);assert.equal(values.folderId,undefined);
 assert.throws(()=>mergeValues('drive',{}, {...values,ageRecipient:'AGE-SECRET-KEY-1-private'}));
});
