import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import * as React from 'react';
import * as jsxRuntime from 'react/jsx-runtime';
import {renderToStaticMarkup} from 'react-dom/server';
import {translate} from '../src/modules/shared/locale/index.tsx';
import {isAccountSuccess} from '../src/modules/identity/account-response.ts';

function accountMarkup(language='vi'){
 const source=fs.readFileSync(new URL('../src/modules/identity/AccountForm.tsx',import.meta.url),'utf8');
 const compiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;
 const exports={};
 vm.runInNewContext(compiled,{exports,URLSearchParams,require:name=>({react:React,'react/jsx-runtime':jsxRuntime,'../shared/locale':{useLocale:()=>({language,t:text=>translate(text,language)})},'../shared/session-client':{invalidatePublicSession:()=>assert.fail('Rendering must not change the session')},'./account-response':{isAccountSuccess}}[name]||assert.fail(name))});
 return renderToStaticMarkup(React.createElement(exports.AccountForm,{google:true,conversation:''}));
}

test('credential submission remains POST before hydration so passwords cannot enter a GET URL',()=>{
 const html=accountMarkup(),form=html.match(/<form\b([^>]*)>/)?.[1];assert.ok(form);
 assert.match(form,/\bmethod="post"/i,'A plain HTML credential form must not default to GET');
 assert.match(html,/<input\b[^>]*name="email"/);assert.match(html,/<input\b[^>]*name="password"/);
 assert.ok(!html.includes('password='),'Credentials are not copied into links or query strings');
});

test('the actual registration form renders translated labels and non-privileged fields in VI and DE',()=>{
 for(const language of ['vi','de']){
  const html=accountMarkup(language);
  for(const label of ['Tạo tài khoản','Địa chỉ email','Mật khẩu','Tiếp tục bằng Google','Bạn đã có tài khoản?'])assert.ok(html.includes(translate(label,language)),label+' '+language);
  assert.match(html,/href="\/tai-khoan\?mode=signin"/);assert.ok(!/name="(?:role|jurisdictions|_verified)"/.test(html));
  assert.match(html,/autocomplete="new-password"/i);assert.match(html,/minLength="12"/i);assert.match(html,/maxLength="128"/i);
 }
});
