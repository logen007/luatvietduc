import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,rmSync,symlinkSync,unlinkSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {homeBenefitPhotos} from '../src/modules/shared/public-media.mjs';

test('photo URLs change only when their bytes change, including an atomic snapshot switch',()=>{
 const root=mkdtempSync(path.join(tmpdir(),'lvd-photos-'));
 try{
  for(const snapshot of ['old','new']){
   mkdirSync(path.join(root,snapshot,'media/benefits'),{recursive:true});
   for(const name of ['clarity','specialist','records'])writeFileSync(path.join(root,snapshot,'media/benefits',name+'.webp'),name+(snapshot==='new'&&name==='specialist'?'-new':''));
  }
  const current=path.join(root,'public');symlinkSync(path.join(root,'old'),current);
  const before=homeBenefitPhotos(current);assert.deepEqual(homeBenefitPhotos(current),before);
  unlinkSync(current);symlinkSync(path.join(root,'new'),current);
  const after=homeBenefitPhotos(current);
  assert.equal(after[0],before[0]);assert.notEqual(after[1],before[1]);assert.equal(after[2],before[2]);
  for(const url of after)assert.match(url,/^\/media\/benefits\/(clarity|specialist|records)\.webp\?v=[a-f0-9]{12}$/);
 }finally{rmSync(root,{recursive:true,force:true});}
});
