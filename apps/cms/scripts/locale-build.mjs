// Extend only the deployed legacy copy with the same dictionary used by React.
export function augmentBilingual(source,dictionary){
 const marker="  let lang='vi';",phrase="const translated=lang==='de'&&D[trim]?base.replace(trim,D[trim]):base;";
 if(!source.includes(marker)||!source.includes(phrase))throw new Error('Locale integration marker changed');
 return source.replace(marker,`  Object.assign(D,${JSON.stringify(dictionary)});\n${marker}`)
  .replace('const original=new WeakMap();','const original=new WeakMap(), originalAttributes=new WeakMap();')
  .replace(phrase,String.raw`const mapped=D[trim]||trim.replace(/^(\d+) bài viết$/, '$1 Beiträge').replace(/^Trang (\d+) \/ (\d+)$/, 'Seite $1 / $2').replace(/^chủ đề(?= ·|$)/,'Themen');const translated=lang==='de'?base.replace(trim,mapped):base;`)
  .replace("let str=el.dataset.placeholderVi;","let str=el.dataset.placeholderVi;if(lang==='de')str=D[str]||str;")
  .replace("document.querySelectorAll('input[placeholder],textarea[placeholder]').forEach(el=>{",`document.querySelectorAll('[aria-label],[title]').forEach(el=>{
        if(el.closest('[data-no-translation]'))return;
        let originals=originalAttributes.get(el);if(!originals){originals={};originalAttributes.set(el,originals);}
        for(const attr of ['aria-label','title']){if(!el.hasAttribute(attr))continue;originals[attr]??=el.getAttribute(attr);const value=lang==='de'?(D[originals[attr]]||originals[attr]):originals[attr];if(el.getAttribute(attr)!==value)el.setAttribute(attr,value);}
      });
      document.querySelectorAll('input[placeholder],textarea[placeholder]').forEach(el=>{`);
}

export async function writeInterfaceLocale(publicDirectory){
 const {readFile,writeFile}=await import('node:fs/promises');const path=await import('node:path');
 const dictionary=JSON.parse(await readFile(new URL('../src/modules/shared/locale/de.json',import.meta.url),'utf8'));
 const file=path.join(publicDirectory,'assets/bilingual.js');
 await writeFile(file,augmentBilingual(await readFile(file,'utf8'),dictionary));
}
