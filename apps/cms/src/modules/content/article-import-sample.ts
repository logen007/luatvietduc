import {CSV_COLUMNS,MAX_CSV_BYTES,MAX_IMPORT_ROWS,encodeCSV} from './article-csv';

type SampleTerm={name:string;slug:string};
export function articleImportSample(terms:{categories:SampleTerm[];tags:SampleTerm[]}){
 const rows:unknown[][]=[];
 const base=(title:string,categories:string[],tags:string[],language='vi',kind='article')=>[title,'','Nội dung mẫu — thay bằng bài viết của bạn.',categories.join('|'),tags.join('|'),language,kind,'draft','false','','BOTH'];
 // Small libraries retain one example per category/tag. Larger libraries pack
 // actual terms into bounded groups so the downloaded file remains importable.
 const count=Math.max(terms.categories.length,terms.tags.length);
 const group=Math.min(50,Math.max(1,Math.ceil(count/(MAX_IMPORT_ROWS-3))));
 const preferred=['vietnam','germany'].filter(slug=>terms.tags.some(term=>term.slug===slug));
 for(let offset=0;offset<count&&rows.length<MAX_IMPORT_ROWS;offset+=group){
  const categories=terms.categories.slice(offset,offset+group),tags=terms.tags.slice(offset,offset+group);
  rows.push(base('Bài mẫu '+(rows.length+1)+': '+(categories[0]?.name||tags[0]?.name),categories.map(term=>term.slug),tags.length?tags.map(term=>term.slug):preferred,'vi',categories[0]?.slug.startsWith('tin-')?'news':'article'));
 }
 const examples=[base('Mẫu nhiều danh mục',terms.categories.slice(0,2).map(term=>term.slug),terms.tags.slice(0,50).map(term=>term.slug)),base('Beispiel auf Deutsch',[],preferred.filter(slug=>slug==='germany'),'de'),base('Mẫu câu hỏi và trả lời',[],preferred,'vi','question')];
 rows.push(...examples.slice(0,Math.max(0,MAX_IMPORT_ROWS-rows.length)));
 // Maximal valid slugs can exceed the upload budget even in 200 rows. Keep
 // whole representative rows; a demo must never exceed its own import limit.
 const encoder=new TextEncoder(),chunks=[encodeCSV([Array.from(CSV_COLUMNS)])];
 let bytes=encoder.encode(chunks[0]).length;
 for(const row of rows){const line=encodeCSV([row]).slice(1),length=encoder.encode(line).length;if(bytes+length>MAX_CSV_BYTES)break;chunks.push(line);bytes+=length;}
 return chunks.join('');
}
