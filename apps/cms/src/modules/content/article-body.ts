// Server-use only: the editor keeps HTML in the existing string field; unmarked
// records remain literal legacy text, including text which happens to look like HTML.
import sanitizeHtml from 'sanitize-html';
import {compile} from 'html-to-text';

const marker='<div data-lvd-richtext="1">';
const richStart=/^\s*<div\s+data-lvd-richtext=(?:"1"|'1')\s*>/i;
const text=(body:unknown)=>typeof body==='string'?body:'';

export function isRichBody(body:unknown):body is string{
 return typeof body==='string'&&richStart.test(body);
}

function safeURL(value:unknown){
 if(typeof value!=='string')return '';
 const url=value.trim();
 // Browsers normalize backslashes/control characters in URLs. Reject those
 // before parsing so an apparent site-relative path cannot become another host.
 if(!url||/[\\\u0000-\u0020\u007f]/.test(url))return '';
 if(url.startsWith('/')&&!url.startsWith('//'))return url;
 if(!/^https?:\/\//i.test(url))return '';
 try{
  const parsed=new URL(url);
  return ['https:','http:'].includes(parsed.protocol)&&!parsed.username&&!parsed.password?url:'';
 }catch{return '';}
}

function boundedInteger(value:unknown,max:number){
 if(typeof value!=='string'||!/^\d{1,6}$/.test(value))return '';
 const number=Number(value);
 return number>=1&&number<=max?String(number):'';
}

const options:sanitizeHtml.IOptions={
 allowedTags:['pre','code','h2','h3','h4','p','br','strong','b','em','i','u','s','blockquote','ul','ol','li','hr','a','img','table','tbody','thead','tr','th','td','span'],
 allowedAttributes:{
  h2:['style'],h3:['style'],h4:['style'],p:['style'],span:['style'],
  a:['href','title','target','rel'],
  img:['src','alt','title','width','height','loading','decoding'],
  ol:['start'],th:['colspan','rowspan','style'],td:['colspan','rowspan','style'],
 },
 allowedStyles:{'*':{'text-align':[/^(?:left|center|right|justify)$/],'color':[/^#(?:[a-f\d]{3}|[a-f\d]{6})$/i]}},
 allowedSchemes:['http','https'],allowProtocolRelative:false,
 allowedSchemesAppliedToAttributes:['href','src'],
 disallowedTagsMode:'discard',
 nonTextTags:['script','style','textarea','option','iframe','object','embed','svg','math','template','noscript'],
 nestingLimit:40,
 transformTags:{
  a:(_tag,attributes)=>{
   const attribs:Record<string,string>={},href=safeURL(attributes.href);
   if(attributes.title)attribs.title=attributes.title;
   if(href){
    attribs.href=href;
    if(attributes.target==='_blank'){attribs.target='_blank';attribs.rel='noopener noreferrer';}
   }
   return {tagName:'a',attribs};
  },
  img:(_tag,attributes)=>{
   const attribs:Record<string,string>={},src=safeURL(attributes.src);
   if(src)attribs.src=src;
   for(const name of ['alt','title'])if(attributes[name])attribs[name]=attributes[name];
   for(const name of ['width','height']){const value=boundedInteger(attributes[name],4096);if(value)attribs[name]=value;}
   attribs.loading='lazy';attribs.decoding='async';
   return {tagName:'img',attribs};
  },
  '*':(tagName,attributes)=>{
   const attribs={...attributes};
   if(tagName==='td'||tagName==='th')for(const name of ['colspan','rowspan']){
    const value=boundedInteger(attribs[name],50);delete attribs[name];if(value)attribs[name]=value;
   }
   if(tagName==='ol'){const value=boundedInteger(attribs.start,100000);delete attribs.start;if(value)attribs.start=value;}
   return {tagName,attribs};
  },
 },
 exclusiveFilter:frame=>frame.tag==='img'&&!frame.attribs.src,
};

const cleanHTML=(body:string)=>sanitizeHtml(body.trim(),options).trim();
const escapeHTML=(body:string)=>body.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');
function legacyHTML(body:string){
 if(!body)return '';
 return body.replace(/\r\n?/g,'\n').split(/\n[\t ]*\n/).map(paragraph=>'<p>'+escapeHTML(paragraph).replaceAll('\n','<br />')+'</p>').join('');
}

/** Safe inner HTML for Tiptap, without the storage-only wrapper. */
export function editorHTML(body:unknown){
 return isRichBody(body)?cleanHTML(body):legacyHTML(text(body));
}

/** Keep old records unchanged; newly marked content has one canonical wrapper. */
export function sanitizeArticleBody(body:unknown){
 return isRichBody(body)?marker+cleanHTML(body)+'</div>':text(body);
}

const plainText=compile({
 wordwrap:false,
 selectors:[
  {selector:'a',format:'inline'},
  {selector:'img',format:'skip'},
  {selector:'h2',options:{uppercase:false}},
  {selector:'h3',options:{uppercase:false}},
  {selector:'h4',options:{uppercase:false}},
  {selector:'table',format:'dataTable',options:{uppercaseHeaderCells:false,colSpacing:2,rowSpacing:0}},
 ],
});

/** Stable paragraph text shared by RAG, exact quotes, summaries and metadata. */
export function articleText(body:unknown){
 return isRichBody(body)?plainText(cleanHTML(body)).replace(/\r\n?/g,'\n').trim():text(body);
}

/** Safe HTML for the public renderer; unmarked markup is displayed literally. */
export function articleHTML(body:unknown){
 return isRichBody(body)?sanitizeArticleBody(body):legacyHTML(text(body));
}
