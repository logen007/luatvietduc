import test from 'node:test';
import assert from 'node:assert/strict';
import {isAccountSuccess} from '../src/modules/identity/account-response.ts';

const receipts={register:{ok:true,state:'verification-email'},resend:{ok:true,state:'verification-email'},forgot:{ok:true,state:'reset-email'},verify:{ok:true,state:'verified'},reset:{ok:true,state:'password-reset'},login:{ok:true,redirectTo:'/tai-khoan'}};
test('each account action accepts only its own confirmed success receipt',()=>{
 for(const [action,receipt] of Object.entries(receipts)){
  assert.equal(isAccountSuccess(action,receipt),true,action);
  for(const other of Object.values(receipts))if(JSON.stringify(other)!==JSON.stringify(receipt))assert.equal(isAccountSuccess(action,other),false,action+' cannot accept another action state');
 }
 assert.equal(isAccountSuccess('unknown',{ok:true,state:'verified'}),false);assert.equal(isAccountSuccess('toString',{ok:true}),false);
});

test('malformed successful HTTP bodies cannot advance recovery or log the visitor in',()=>{
 for(const action of Object.keys(receipts))for(const value of [undefined,null,false,true,0,'ok',[],{},[receipts[action]],{ok:false},{ok:'true',state:receipts[action].state},{ok:true},{ok:true,state:[]},{ok:true,redirectTo:null},{ok:true,redirectTo:''}])assert.equal(isAccountSuccess(action,value),false,action+' '+JSON.stringify(value));
});
