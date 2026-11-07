import test from 'node:test';
import assert from 'node:assert/strict';
import {isPageLink,prefetchPage} from '../src/modules/shared/navigation.ts';

test('only UI pages participate in client navigation, including filtered and hash destinations',()=>{
 for(const href of ['/','/hoi-dap?question=nh%C3%A0','/tai-khoan?mode=signin','/tin-tuc?nhom=gia-dinh','/gioi-thieu#doi-ngu','/bai-viet/test','/admin/collections/articles?depth=1'])assert.equal(isPageLink(href),true,href);
 for(const href of ['#main','https://example.invalid/','mailto:test@example.invalid','//example.invalid','/\\example.invalid','/auth/google','/service/backups/google/start','/api/media/1','/assets/test.svg','/favicon.ico','/service/article-import','/x/../auth/google','/%61uth/google','/service%2Fbackups','/%2fexample.invalid','/%zz'])assert.equal(isPageLink(href),false,href);
});
test('warm common public pages while keeping private pages and arbitrary searches out of automatic prefetch',()=>{
 for(const href of ['/','/hoi-dap','/tin-tuc','/phap-luat/viet-nam'])assert.equal(prefetchPage(href),true,href);
 for(const href of ['/admin','/admin/inbox','/tai-khoan?mode=reset'])assert.equal(prefetchPage(href),false,href);
 for(const href of ['/bai-viet/one','/tin-tuc?q=private','/hoi-dap?conversation=synthetic'])assert.equal(prefetchPage(href),null,href);
});
