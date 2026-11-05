import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mediaFilters,mediaWhere,mediaName,mediaReadOnly,mediaURL,mediaEditable} from '../src/modules/storage/media-view.ts';
import {bundledFiles} from '../src/modules/storage/bundled.ts';
test('media filters replace only their own criteria and keep unrelated access filters',()=>{
 const base={visibility:{equals:'private'},mimeType:{equals:'application/pdf'}};
 const where=mediaWhere(base,'svg','2026-12');assert.deepEqual(where.visibility,base.visibility);assert.equal(where.mimeType.equals,'image/svg+xml');assert.equal(where.createdAt.greater_than_equal,'2026-12-01T00:00:00.000Z');assert.equal(where.createdAt.less_than,'2027-01-01T00:00:00.000Z');assert.deepEqual(mediaFilters(where),{kind:'svg',month:'2026-12'});
 assert.deepEqual(mediaWhere(where,'',''),{visibility:{equals:'private'}});assert.equal(base.mimeType.equals,'application/pdf');
});
test('media cards use actual bundled filenames and protect interface assets',()=>{
 const bundled=bundledFiles[0];assert.equal(mediaName(bundled),bundled.name);assert.equal(mediaReadOnly(bundled),true);assert.equal(mediaReadOnly({filename:'customer.svg'}),false);assert.equal(mediaName({filename:'customer.svg',alt:'Description'}),'customer.svg');
});
test('media previews reject executable and credential-bearing URLs',()=>{
 for(const url of ['javascript:alert(1)','data:image/svg+xml,unsafe','//attacker.invalid/a.svg','https://user:secret@example.invalid/a.svg'])assert.equal(mediaURL(url),'');
 assert.equal(mediaURL('/assets/logo.svg'),'/assets/logo.svg');
});

test('media editing allows admin and only the specialist who uploaded the file',()=>{
 assert.equal(mediaEditable({uploadedBy:2},{id:1,role:'owner'}),true);
 assert.equal(mediaEditable({uploadedBy:{id:2}},{id:2,role:'support'}),true);
 for(const user of [{id:3,role:'support'},{id:2,role:'member'},null])assert.equal(Boolean(mediaEditable({uploadedBy:2},user)),false);
});
