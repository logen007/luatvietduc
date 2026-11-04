// Invoked only by the root-owned release engine. No HTTP endpoint or user input.
import fs from 'node:fs';
import path from 'node:path';
const files=['design-system.css','live.css','editorial-ui.css','live-bridge.js','editorial-ui.js','legal-runtime.js','social-icons.json','frontend.html','release.json'];
export function switchPresentation(root,stage,sha){
 if(!/^[a-f0-9]{40}$/.test(sha))throw new Error('Invalid commit');
 const store=path.join(root,'presentation-releases'),current=path.join(store,'current');
 if(!fs.lstatSync(path.join(root,'public')).isSymbolicLink())throw new Error('Presentation bootstrap required');
 const previous=fs.readlinkSync(current);
 if(!/^(base|[a-f0-9]{40})$/.test(previous))throw new Error('Unexpected current pointer');
 const target=path.join(store,sha);
 if(fs.existsSync(target))fs.rmSync(target,{recursive:true});
 function linkTree(source,dest){fs.mkdirSync(dest);for(const e of fs.readdirSync(source,{withFileTypes:true})){const a=path.join(source,e.name),b=path.join(dest,e.name);if(e.isDirectory())linkTree(a,b);else if(e.isFile())fs.linkSync(a,b);else throw new Error('Unexpected public symlink');}}
 linkTree(path.join(store,previous),target);
 for(const name of files){const input=path.join(stage,name);if(!fs.lstatSync(input).isFile())throw new Error('Missing presentation file');const output=path.join(target,name);fs.unlinkSync(output);fs.copyFileSync(input,output);fs.chmodSync(output,0o644);}
 const release=JSON.parse(fs.readFileSync(path.join(target,'release.json')));
 if(release.commit!==sha||!/^\d{2}\.\d{2}\.\d{2}$/.test(release.version))throw new Error('Wrong presentation manifest');
 fs.symlinkSync(sha,current+'.next');fs.renameSync(current+'.next',current);
 return previous;
}
export function restorePresentation(root,previous){
 if(!/^(base|[a-f0-9]{40})$/.test(previous))throw new Error('Invalid rollback pointer');
 const current=path.join(root,'presentation-releases/current');
 fs.symlinkSync(previous,current+'.rollback');fs.renameSync(current+'.rollback',current);
}
if(process.argv[1]===new URL(import.meta.url).pathname){
 const [mode,arg,sha]=process.argv.slice(2);
 if(mode==='activate')console.log(switchPresentation('/app',arg,sha));
 else if(mode==='rollback')restorePresentation('/app',arg);
 else if(mode==='cleanup'){
  const store='/app/presentation-releases',current=fs.readlinkSync(store+'/current');
  for(const name of fs.readdirSync(store))if(/^[a-f0-9]{40}$/.test(name)&&name!==current)fs.rmSync(store+'/'+name,{recursive:true});
 }else throw new Error('Unknown operation');
}
