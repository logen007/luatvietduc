import test from 'node:test';
import assert from 'node:assert/strict';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {InboxList} from '../src/modules/chat/staff/InboxList.tsx';
const inbox=rows=>({rows,counts:{all:rows.length},total:rows.length,totalPages:1,page:1,view:'low',query:'',loading:false,error:'',refresh(){},setView(){},setQuery(){},setPage(){}});
const row={id:'synthetic-guest',title:'Synthetic guest',state:'queued',qualification:'low',registered:false,updated_at:'2026-11-09T00:00:00Z',expires_at:new Date(Date.now()+100_000).toISOString()};
test('unsaved guests show a seconds deadline that can be styled red',()=>{
 const html=renderToStaticMarkup(createElement(InboxList,{inbox:inbox([row]),selected:'',onSelect(){}}));assert.match(html,/class="operator-expiry"/);assert.match(html,/\d+ giây/);assert.ok(!html.includes('operator-low-badge'));
});
test('account-owned history cannot show a deletion countdown even with an old deadline',()=>{
 const html=renderToStaticMarkup(createElement(InboxList,{inbox:inbox([{...row,registered:true}]),selected:'',onSelect(){}}));assert.ok(!html.includes('class="operator-expiry"'));assert.ok(html.includes('Đã lưu'));
});
