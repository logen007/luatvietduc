import test from 'node:test';
import assert from 'node:assert/strict';
import configPromise from '../src/payload.config.ts';
import {adminCapabilities,adminNavigation,adminShortcuts,adminSettingsSections,adminLinks} from '../src/modules/admin/navigation-model.ts';
import {adminPages} from '../src/modules/admin/pages.ts';
import {articleParent} from '../src/modules/content/navigation.ts';
const config=await configPromise;
const users=config.collections.find(collection=>collection.slug==='users');
const articles=config.collections.find(collection=>collection.slug==='articles');
const linksFor=viewer=>adminNavigation(viewer).flatMap(item=>[item,...(item.children||[])]);

test('navigation hints match actual admin entry and article creation rules for supported roles',async()=>{
 for(const role of ['owner','support','member','editor','reviewer','knowledge','operations','unknown','']){
  for(const jurisdictions of [[],['VN'],['DE'],['VN','DE']]){
   const viewer={role,jurisdictions},req={user:role?{id:1,...viewer}:null,context:{}};
   const can=adminCapabilities(viewer),actualEntry=await users.access.admin({req});
   assert.equal(can.enter,actualEntry,role);
   if(can.enter)assert.equal(can.write,await articles.access.create({req}),role);
   else {assert.deepEqual(adminNavigation(viewer),[]);assert.deepEqual(adminShortcuts(viewer),[]);}
  }
 }
});

test('admin menus, shortcuts and settings resolve to registered views, collections or globals',()=>{
 const custom=new Set(Object.values(config.admin.components.views).flatMap(view=>view.path?['/admin'+view.path]:[]));
 function resolves(href){
  if(href==='/admin'||custom.has(href))return true;
  const collection=/^\/admin\/collections\/([^/]+)(?:\/create)?$/.exec(href);
  if(collection)return config.collections.some(item=>item.slug===collection[1]);
  const global=/^\/admin\/globals\/([^/]+)$/.exec(href);
  return Boolean(global&&config.globals.some(item=>item.slug===global[1]));
 }
 for(const viewer of [{role:'owner'},{role:'support',jurisdictions:['VN']},{role:'support',jurisdictions:[]}]){
  const visible=linksFor(viewer);
  for(const link of [...visible,...adminShortcuts(viewer)])assert.ok(resolves(link.href),link.href);
  for(const shortcut of adminShortcuts(viewer))assert.ok(visible.some(link=>link.href===shortcut.href),shortcut.href);
 }
 for(const section of adminSettingsSections)for(const link of section.items)assert.ok(resolves(link.href),link.href);
});

test('users stay above settings, settings stay last, and protected links do not appear for specialists',()=>{
 const owner=adminNavigation({role:'owner'}),specialist=linksFor({role:'support',jurisdictions:['VN']});
 assert.equal(owner.at(-1).href,adminLinks.settings.href);assert.equal(owner.at(-2).href,adminLinks.users.href);
 assert.ok(owner.findIndex(item=>item.href===adminLinks.articles.href)<owner.findIndex(item=>item.href===adminLinks.users.href));
 assert.equal(new Set(owner.map(item=>item.href)).size,owner.length);
 const protectedLinks=new Set([adminLinks.users.href,adminLinks.createUser.href,adminLinks.settings.href,...adminSettingsSections.flatMap(section=>section.items.map(link=>link.href))]);
 for(const link of specialist)assert.ok(!protectedLinks.has(link.href),link.href);
 const children=owner.at(-1).children.map(link=>link.href);
 assert.deepEqual(children,adminSettingsSections.flatMap(section=>section.items.map(link=>link.href)));
});

test('custom view breadcrumb labels agree with navigation and retain the settings parent',()=>{
 for(const key of ['settings','connections','backups','knowledge','inbox']){
  assert.equal(adminPages[key].title,adminLinks[key].label);
  assert.equal(adminPages[key].nav.at(-1).label,adminLinks[key].label);
 }
 for(const key of ['connections','backups'])assert.deepEqual(adminPages[key].nav[0],{label:adminLinks.settings.label,url:adminLinks.settings.href});
});

test('article navigation separates legal knowledge from news without forcing a country selection',()=>{
 assert.deepEqual(articleParent('news'),{href:'/#/tin-tuc',label:'Tin tức & đời sống'});
 for(const kind of ['article','question',null,undefined])assert.deepEqual(articleParent(kind),{href:'/#/tra-cuu',label:'Thư viện'});
});
