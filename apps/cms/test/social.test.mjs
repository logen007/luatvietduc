import {test} from 'node:test';
import assert from 'node:assert/strict';
import {configuredSocialLinks,socialIcon} from '../src/modules/shared/social.ts';
import {fieldReducer} from '../node_modules/@payloadcms/ui/dist/forms/Form/fieldReducer.js';
import {reduceFieldsToValues} from 'payload/shared';
test('empty and invalid social links never produce footer icons',()=>{
 assert.deepEqual(configuredSocialLinks(),[]);
 assert.deepEqual(configuredSocialLinks([{label:'Facebook',url:''},{label:'YouTube',url:'javascript:alert(1)'},{label:'TikTok',url:'http://tiktok.com/x'},{label:'Zalo',url:'https://user:password@zalo.me/x'}]),[]);
 const links=configuredSocialLinks([{label:'Facebook',url:' https://www.facebook.com/example '},{label:'YouTube',url:''}]);assert.equal(links.length,1);assert.equal(links[0].icon.name,'Facebook');assert.equal(links[0].url,'https://www.facebook.com/example');
});
test('saved labels and known hosts resolve icons without inventing unconfigured platforms',()=>{
 assert.equal(socialIcon({label:'Trang của tôi',url:'https://www.youtube.com/@example'})?.name,'YouTube');
 assert.equal(socialIcon({label:'Khác',url:'https://facebook.com.example.invalid'})?.name,undefined);
 assert.equal(configuredSocialLinks([{label:'Khác',url:'https://example.invalid'}])[0].label,'Khác');
});
test('native array form adds a configured platform and removes it without changing other settings',()=>{
 let state={siteName:{value:'Existing website'},socialLinks:{value:0,rows:[],disableFormData:true}};
 state=fieldReducer(state,{type:'ADD_ROW',path:'socialLinks',subFieldState:{label:{value:'Facebook',valid:true},url:{value:'https://facebook.com/example',valid:true}}});
 state=fieldReducer(state,{type:'ADD_ROW',path:'socialLinks',subFieldState:{label:{value:'YouTube',valid:true},url:{value:'https://youtube.com/@example',valid:true}}});
 assert.deepEqual(reduceFieldsToValues(state,true).socialLinks.map(r=>r.label),['Facebook','YouTube']);
 state=fieldReducer(state,{type:'REMOVE_ROW',path:'socialLinks',rowIndex:0});
 assert.deepEqual(reduceFieldsToValues(state,true).socialLinks.map(r=>r.label),['YouTube']);assert.equal(reduceFieldsToValues(state,true).siteName,'Existing website');
 state=fieldReducer(state,{type:'REMOVE_ROW',path:'socialLinks',rowIndex:0});assert.equal(reduceFieldsToValues(state,true).socialLinks,0,'Payload native array clear marker');
});
