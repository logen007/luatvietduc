import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

function fixture(){
 const states=[],cleanups=[],timeouts=[],requests=[];let index=0;
 const react={useState:initial=>{const slot=index++;states[slot]=typeof initial==='function'?initial():initial;return [states[slot],value=>{states[slot]=value;}];},useRef:current=>({current}),useEffect:effect=>{const cleanup=effect();if(cleanup)cleanups.push(cleanup);}};
 const jsx=(type,props)=>({type,props}),exports={};
 const source=fs.readFileSync(new URL('../src/modules/identity/ProfileForm.tsx',import.meta.url),'utf8');
 const compiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;
 vm.runInNewContext(compiled,{exports,Error,AbortController,AbortSignal:{any:signals=>AbortSignal.any(signals),timeout:ms=>{const controller=new AbortController();timeouts.push({ms,controller});return controller.signal;}},FormData,URL:{createObjectURL:()=>'/synthetic-avatar',revokeObjectURL:()=>{}},fetch:(url,options)=>{requests.push({url,...options});return new Promise((resolve,reject)=>options.signal.addEventListener('abort',()=>reject(options.signal.reason),{once:true}));},require:name=>({'react':react,'react/jsx-runtime':{jsx,jsxs:jsx},'@payloadcms/ui':{useAuth:()=>({fetchFullUser:async()=>{}})},'./roles':{roleLabel:()=> 'Admin'},'../shared/unsaved-changes':{useUnsavedChanges:()=>{}}}[name]||assert.fail(name))},{timeout:1000});
 const tree=exports.ProfileForm({initial:{id:1,name:'Synthetic',email:'synthetic@example.invalid',role:'owner',updatedAt:'2026-11-08T00:00:00Z',avatarURL:'',canUpload:true,canResetPassword:true}});
 function find(node,predicate){if(!node||typeof node!=='object')return null;if(predicate(node))return node;for(const child of [node.props?.children].flat(Infinity)){const found=find(child,predicate);if(found)return found;}return null;}
 return {states,timeouts,requests,find:predicate=>find(tree,predicate),unmount:()=>cleanups.forEach(cleanup=>cleanup())};
}
async function flush(){for(let i=0;i<10;i++)await Promise.resolve();}
test('a stalled profile save releases its actions and warns about an unconfirmed result without retrying',async()=>{
 const f=fixture();f.find(node=>node.type==='form').props.onSubmit({preventDefault(){}});
 assert.equal(f.states[2],'name');assert.equal(f.timeouts[0].ms,20000);
 f.timeouts[0].controller.abort(new DOMException('Synthetic deadline','TimeoutError'));await flush();
 assert.equal(f.states[2],'');assert.match(f.states[3],/Chưa xác nhận hồ sơ đã lưu/);assert.equal(f.requests.length,1);
});
test('avatar uploads have a bounded longer deadline and unmount cancellation stays silent',async()=>{
 const f=fixture();f.find(node=>node.type==='input'&&node.props.type==='file').props.onChange({currentTarget:{files:[new File(['synthetic'],'avatar.webp',{type:'image/webp'})],value:'avatar.webp'}});
 assert.equal(f.timeouts[0].ms,60000);assert.equal(f.requests.length,1);
 f.unmount();await flush();assert.equal(f.states[3],'');assert.equal(f.requests[0].signal.aborted,true);
});
