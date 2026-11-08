import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

function fixture(){
 let root='/release/one',reads=0,onRead=()=>{};
 const files=new Map(),names=['admin-theme.css','customer-chat.css','specialist-inbox.css','design-system.css','live.css','editorial-ui.css','live-bridge.js','editorial-ui.js','legal-runtime.js'];
 for(const directory of ['/release/one','/release/two'])for(const name of names)files.set(path.join(directory,name),{body:directory+name,stamp:1});
 const source=readFileSync(new URL('../src/modules/shared/presentation-version.mjs',import.meta.url),'utf8').replace(/^import .*;\n/gm,'').replace('export function getPresentationVersion','function getPresentationVersion');
 const context={createHash,path,realpathSync:()=>root,statSync:file=>{const entry=files.get(file);if(!entry)throw Error('Missing bundle');return {dev:1,ino:1,size:entry.body.length,mtimeMs:entry.stamp,ctimeMs:entry.stamp};},readFileSync:file=>{reads++;onRead();return files.get(file).body;}};
 vm.runInNewContext(source+'\nglobalThis.version = getPresentationVersion;',context,{timeout:1000});
 const digest=directory=>{const hash=createHash('sha256');for(const name of names)hash.update(name).update(files.get(path.join(directory,name)).body);return hash.digest('hex').slice(0,12);};
 return {version:context.version,digest,files,get reads(){return reads;},switchTo(value){root=value;},onRead(fn){onRead=fn;}};
}
test('unchanged pages reuse one digest without rereading presentation bytes',()=>{
 const f=fixture(),first=f.version('/public');assert.equal(first,f.digest('/release/one'));assert.equal(f.reads,9);
 for(let i=0;i<100;i++)assert.equal(f.version('/public'),first);
 assert.equal(f.reads,9);
});
test('same-size local edits invalidate the digest and missing bundles never reuse an old value',()=>{
 const f=fixture(),first=f.version('/public'),entry=f.files.get('/release/one/live.css');entry.body=entry.body.replace('live','LIVE');entry.stamp++;
 assert.notEqual(f.version('/public'),first);assert.equal(f.reads,18);
 f.files.delete('/release/one/live.css');assert.throws(()=>f.version('/public'),/Missing bundle/);
});
test('an atomic release switch cannot mix two snapshots in one digest',()=>{
 const f=fixture(),old=f.digest('/release/one');f.onRead(()=>f.switchTo('/release/two'));
 assert.equal(f.version('/public'),old);assert.equal(f.version('/public'),f.digest('/release/two'));assert.equal(f.reads,18);
});


test('editing inbox styles leaves the public/font/chat/script versions unchanged',()=>{
 const f=fixture(),assets=['live.css','editorial-ui.css','editorial-ui.js','customer-chat.css'];
 const before=assets.map(name=>f.version('/public',[name])),inbox=f.version('/public',['specialist-inbox.css']);
 const entry=f.files.get('/release/one/specialist-inbox.css');entry.body+=' revised';entry.stamp++;
 assert.notEqual(f.version('/public',['specialist-inbox.css']),inbox);
 assert.deepEqual(assets.map(name=>f.version('/public',[name])),before);
 // Metadata reads do not force unchanged bytes through the hash again.
 assert.equal(f.reads,6);
});
test('scoped assets follow local edits, missing files and snapshot switches',()=>{
 const f=fixture(),before=f.version('/public',['live.css']),entry=f.files.get('/release/one/live.css');entry.body=entry.body.replace('live','LIVE');entry.stamp++;
 assert.notEqual(f.version('/public',['live.css']),before);
 f.switchTo('/release/two');const next=f.version('/public',['live.css']);assert.notEqual(next,before);
 f.files.delete('/release/two/live.css');assert.throws(()=>f.version('/public',['live.css']),/Missing bundle/);
 for(const invalid of [[],['../secret'],['/private/data'],['not-registered.css']])assert.throws(()=>f.version('/public',invalid),/Unknown presentation asset/);
});
