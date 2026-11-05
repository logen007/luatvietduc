import {test} from 'node:test';
import assert from 'node:assert/strict';
import {canEnterAdmin,canWriteContent,isAdmin} from '../src/modules/identity/permissions.ts';
import {isStaff} from '../src/modules/chat/service.ts';
import {adminCapabilities} from '../src/modules/admin/navigation-model.ts';
import {requireKnowledge} from '../src/modules/knowledge/articles.ts';
import {requireArticleEditor} from '../src/modules/content/translations.ts';
test('admin, inbox, knowledge and editor use the same supported role boundary',()=>{
 for(const role of ['owner','support','member','operations','editor','reviewer','knowledge','publisher','unknown',undefined]){
  const user=role?{id:1,role,jurisdictions:['VN']}:null,allowed=role==='owner'||role==='support';
  assert.equal(canEnterAdmin(user),allowed);assert.equal(isStaff(user),allowed);assert.equal(adminCapabilities(user).enter,allowed);
  if(allowed){assert.doesNotThrow(()=>requireKnowledge(user));assert.doesNotThrow(()=>requireArticleEditor(user));}
  else{assert.throws(()=>requireKnowledge(user));assert.throws(()=>requireArticleEditor(user));}
 }
 assert.equal(isAdmin({role:'support'}),false);assert.equal(canWriteContent({role:'support',jurisdictions:[]}),false);assert.equal(canWriteContent({role:'support',jurisdictions:['unknown']}),false);assert.equal(canWriteContent({role:'support',jurisdictions:['DE']}),true);
});
