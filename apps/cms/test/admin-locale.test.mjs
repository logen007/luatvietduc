import {test} from 'node:test';
import assert from 'node:assert/strict';
import {getRequestLanguage} from 'payload';
import {initI18n} from '@payloadcms/translations';
import {adminI18n} from '../src/modules/admin/i18n.ts';

test('native admin controls stay Vietnamese with an old English cookie or browser preference',async()=>{
 for(const [cookie,header] of [['en','en-US,en;q=0.9'],[{value:'de'},'de-DE,de;q=0.9'],[undefined,'en'],['vi','en-US']]){
  const language=getRequestLanguage({config:{i18n:adminI18n},cookies:new Map([['payload-lng',cookie]]),headers:new Headers({'Accept-Language':header})});
  assert.equal(language,'vi');
  const {t}=await initI18n({config:adminI18n,context:'client',language});
  assert.equal(t('general:createNew'),'Thêm mới');
  assert.equal(t('general:searchBy',{label:'Thao tác'}),'Tìm theo Thao tác');
  assert.equal(t('authentication:logOut'),'Đăng xuất');
  assert.equal(t('version:publishChanges'),'Xuất bản');
 }
});
