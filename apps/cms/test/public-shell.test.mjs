import {test} from 'node:test';
import assert from 'node:assert/strict';
import {publicShell,copyright} from '../src/modules/shared/public-shell.mjs';
test('one shell contract applies configured identity, copyright and navigation to both renderers',()=>{
 const navigation={primary:[{key:'library',href:'/#/tra-cuu',label:'Thư viện'}],footer:[{title:'Thông tin',links:[]}]};
 const settings={siteName:'Synthetic portal',tagline:'Synthetic tagline',logo:'/assets/logo.svg',accentColor:'#123456',footerText:'Synthetic footer',navigation:[{label:'Duplicate',url:'/#/tra-cuu'},{label:'Contact',url:'/#/lien-he'}],apiKey:'never public'};
 const shell=publicShell(settings,navigation);
 assert.equal(shell.name,settings.siteName);assert.equal(shell.tagline,settings.tagline);assert.equal(shell.logo,settings.logo);assert.equal(shell.accent,settings.accentColor);
 assert.deepEqual(shell.primary.map(link=>link.href),['/#/tra-cuu','/#/lien-he']);
 assert.equal(copyright(shell,'01.17.00'),'© Synthetic portal. · v01.17.00 Synthetic footer');
 assert.ok(!JSON.stringify(shell).includes('never public'));
});
test('shell rejects unsafe links and preserves intentionally empty copy',()=>{
 const shell=publicShell({tagline:'',logo:'javascript:alert(1)',accentColor:'url(https://example.invalid)',navigation:[{label:'Bad',url:'//example.invalid'},{label:'Bad',url:'https://name:secret@example.invalid'},{label:'Bad',url:'/admin'},{label:'Removed page',url:'/bai-viet'}]});
 assert.equal(shell.tagline,'');assert.equal(shell.logo,null);assert.equal(shell.accent,null);assert.deepEqual(shell.primary,[]);
});
test('valid hash links saved in admin work on every page and deduplicate against root-qualified links',()=>{
 const shell=publicShell({navigation:[{label:'News again',url:'#/tin-tuc'},{label:'Contact',url:'  #/lien-he  '},{label:'Contact again',url:'/#/lien-he'}]}, {primary:[{key:'news',label:'Tin tức',href:'/#/tin-tuc'}],footer:[]});
 assert.deepEqual(shell.primary.map(link=>link.href),['/#/tin-tuc','/#/lien-he']);
 assert.equal(shell.primary[0].label,'Tin tức');
});
