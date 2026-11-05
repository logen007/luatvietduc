import test from 'node:test';
import assert from 'node:assert/strict';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {Library} from '../src/modules/public-site/Library.tsx';

const props={groups:[],topics:[],total:0,page:1,path:'/thu-vien',articles:{docs:[],totalDocs:0,totalPages:1,page:1}};

test('the all-topics library view survives a filter or sort form submission',()=>{
 const html=renderToStaticMarkup(createElement(Library,{...props,query:'xem=tat-ca&trang=2'}));
 const form=html.match(/<form\b[^>]*class="catalog-toolbar"[^>]*>([\s\S]*?)<\/form>/)?.[1];
 assert.ok(form);
 assert.match(form,/^<label for="catalog-query">/,'the search label stays the first child for responsive grid styling');
 assert.match(form,/<input\b(?=[^>]*type="hidden")(?=[^>]*name="xem")(?=[^>]*value="tat-ca")[^>]*>/);
 assert.doesNotMatch(form,/name="trang"/,'changing filters starts from the first page');
});

test('the regular library view does not opt into the all-topics view',()=>{
 const html=renderToStaticMarkup(createElement(Library,{...props,query:''}));
 assert.doesNotMatch(html,/name="xem"/);
});
