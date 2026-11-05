import {test} from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {seal,unseal} from '../src/modules/integrations/crypto.ts';
import {mergeValues} from '../src/modules/integrations/validation.ts';
import {driveOAuthErrors,driveOAuthMessage,folderFailure,tokenFailure} from '../src/modules/backup/oauth-result.ts';
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
test('Drive connection reports actionable failures without reflecting provider data or claiming authorization',()=>{
 assert.equal(tokenFailure('invalid_client'),'client');assert.equal(tokenFailure('invalid_grant'),'grant');assert.equal(tokenFailure('access_denied'),'denied');assert.equal(tokenFailure('invalid_scope'),'scope');
 assert.equal(folderFailure({error:{details:[{reason:'SERVICE_DISABLED'}]}},403),'api');assert.equal(folderFailure({error:{errors:[{reason:'accessNotConfigured'}]}},403),'api');
 assert.equal(folderFailure({error:{errors:[{reason:'storageQuotaExceeded'}]}},403),'quota');assert.equal(folderFailure(null,429),'quota');assert.equal(folderFailure(null,403),'permission');assert.equal(folderFailure({error:{errors:'malformed'}},503),'folder');
 assert.equal(driveOAuthMessage('failed','api'),driveOAuthErrors.api);assert.equal(driveOAuthMessage('failed','__proto__'),driveOAuthErrors.unknown);
 assert.equal(driveOAuthMessage('connected','api'),null,'A return URL cannot prove that Drive authorization exists');
 const privateResponse='synthetic-access-token-and-client-secret';assert.equal(tokenFailure(privateResponse),'google');assert.ok(!driveOAuthMessage('failed',privateResponse).includes(privateResponse));
});
