import {test} from 'node:test';
import assert from 'node:assert/strict';
import configPromise from '../src/payload.config.ts';
const config=await configPromise;
const users=config.collections.find(c=>c.slug==='users');
const articles=config.collections.find(c=>c.slug==='articles');
const req=role=>({user:role?{id:1,role,jurisdictions:['VN']}:null,context:{}});
test('anonymous user creation denied',()=>assert.equal(users.access.create({req:req()}),false));
test('editor cannot create privileged users',()=>assert.equal(users.access.create({req:req('editor')}),false));
test('owner may provision users',()=>assert.equal(users.access.create({req:req('owner')}),true));
test('member only reads own user record',()=>assert.deepEqual(users.access.read({req:req('member')}),{id:{equals:1}}));
test('support cannot edit articles',()=>assert.equal(articles.access.update({req:req('support')}),false));
test('public article query requires publication and approval',()=>assert.deepEqual(articles.access.read({req:req()}),{and:[{_status:{equals:'published'}},{reviewState:{equals:'approved'}}]}));
const articleHook=articles.hooks.beforeChange[1];
test('editor cannot publish',()=>assert.throws(()=>articleHook({req:req('editor'),data:{jurisdiction:'VN',_status:'published'}}),/Publication restricted/));
test('owner cannot publish unreviewed content',()=>assert.throws(()=>articleHook({req:req('owner'),data:{_status:'published',reviewState:'draft'}}),/Review required/));
test('editing approved article invalidates approval and AI use',()=>assert.deepEqual(articleHook({req:req('editor'),data:{title:'Changed'},originalDoc:{jurisdiction:'VN',title:'Old',reviewState:'approved',_status:'published',aiAllowed:true}}),{title:'Changed',reviewState:'draft',_status:'draft',aiAllowed:false,reviewedBy:null,reviewedAt:null}));
test('first-register cannot bypass offline bootstrap hook',()=>assert.throws(()=>users.hooks.beforeChange[0]({req:req(),operation:'create',data:{role:'owner'}}),/Offline owner/));
test('private site settings cannot be read by editor',()=>assert.equal(config.globals.find(g=>g.slug==='site-settings').access.read({req:req('editor')}),false));

test('Payload merged publication state is invalidated before editor publication guard',()=>assert.equal(articleHook({req:req('editor'),data:{body:'New',_status:'published'},originalDoc:{jurisdiction:'VN',body:'Old',_status:'published',reviewState:'approved'}})._status,'draft'));

test('member sees public approved articles',()=>assert.deepEqual(articles.access.read({req:req('member')}),articles.access.read({req:req()})));
test('staff updates are constrained by country',()=>assert.deepEqual(articles.access.update({req:req('reviewer')}),{jurisdiction:{in:['VN']}}));
test('staff without a country cannot update',()=>assert.equal(articles.access.update({req:{user:{role:'editor'},context:{}}}),false));
test('editor cannot create across countries',()=>assert.equal(articles.access.create({req:req('editor'),data:{jurisdiction:'DE'}}),false));
test('editor cannot move article across countries',()=>assert.throws(()=>articleHook({req:req('editor'),data:{jurisdiction:'DE'},originalDoc:{jurisdiction:'VN'}}),/jurisdiction/));
const pending={jurisdiction:'VN',reviewState:'pending',_status:'draft',title:'Draft'};
test('reviewer approves pending in-scope article',()=>assert.equal(articleHook({req:req('reviewer'),data:{reviewState:'approved'},originalDoc:pending}).reviewState,'approved'));
test('reviewer cannot edit legal text',()=>assert.throws(()=>articleHook({req:req('reviewer'),data:{title:'Replaced'},originalDoc:pending}),/Content editing/));
test('reviewer cannot skip submission',()=>assert.throws(()=>articleHook({req:req('reviewer'),data:{reviewState:'approved'},originalDoc:{...pending,reviewState:'draft'}}),/Review transition/));
test('editor cannot approve own content',()=>assert.throws(()=>articleHook({req:req('editor'),data:{reviewState:'approved'},originalDoc:pending}),/Review transition/));
test('legacy publisher role cannot approve',()=>assert.throws(()=>articleHook({req:req('publisher'),data:{reviewState:'approved'},originalDoc:pending}),/jurisdiction access denied/));
test('reviewer publishes approved article',()=>assert.equal(articleHook({req:req('reviewer'),data:{_status:'published'},originalDoc:{...pending,reviewState:'approved'}})._status,'published'));
test('reviewer cannot publish pending article',()=>assert.throws(()=>articleHook({req:req('reviewer'),data:{_status:'published'},originalDoc:pending}),/Review required/));
test('withdrawal immediately unpublishes and disables AI',()=>assert.deepEqual(articleHook({req:req('reviewer'),data:{reviewState:'withdrawn'},originalDoc:{...pending,reviewState:'approved',_status:'published',aiAllowed:true}}),{reviewState:'withdrawn',_status:'draft',aiAllowed:false}));

test('reviewer approves and publishes submitted content in one operation',()=>assert.equal(articleHook({req:req('reviewer'),data:{reviewState:'approved',_status:'published'},originalDoc:pending})._status,'published'));
test('legacy publisher role has no draft write access',()=>assert.equal(articles.access.update({req:req('publisher')}),false));

const knowledge=config.collections.find(c=>c.slug==='knowledge');
const sourceHook=knowledge.hooks.beforeChange[1];
const approvedSource={id:1,title:'Public source',approved:true,_status:'published',jurisdiction:'VN',body:'Reviewed source',reviewedBy:1,reviewedAt:'2026-11-03T00:00:00Z'};
test('source withdrawal immediately removes publication',()=>{const d=sourceHook({req:req('reviewer'),data:{approved:false,_status:'published'},originalDoc:approvedSource});assert.equal(d._status,'draft');assert.equal(d.reviewedBy,null)});
test('editing source invalidates approval and review attribution',()=>{const d=sourceHook({req:req('knowledge'),data:{body:'New text'},originalDoc:approvedSource});assert.equal(d.approved,false);assert.equal(d._status,'draft');assert.equal(d.reviewedAt,null)});
test('knowledge author cannot approve own source',()=>assert.throws(()=>sourceHook({req:req('knowledge'),data:{approved:true},originalDoc:{...approvedSource,approved:false,_status:'draft'}}),/Reviewer required/));
test('reviewer cannot move source to another country',()=>assert.throws(()=>sourceHook({req:req('reviewer'),data:{jurisdiction:'DE'},originalDoc:approvedSource}),/Country scope/));
