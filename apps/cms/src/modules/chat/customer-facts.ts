import {normalizeBrowserContext,type BrowserContext} from './browser-context';
export type CustomerFact={field:'name'|'email'|'phone'|'location'|'caseLocation'|'request';value:string;messageId:string;quote:string};
type Row={id:string|number;role:string;body:string;internal?:boolean;metadata?:any};
export function customerConversationInfo(messages:Row[]){
 const facts=new Map<CustomerFact['field'],CustomerFact>();let browser:BrowserContext|undefined,previous:Row|undefined;
 const record=(field:CustomerFact['field'],value:string,row:Row)=>{value=value.trim().replace(/[.!?]+$/,'').trim();if(value)facts.set(field,{field,value:value.slice(0,240),messageId:String(row.id),quote:row.body.slice(0,240)});};
 for(const row of messages){
  if(row.internal||row.metadata?.kind==='deleted')continue;
  if(row.role!=='user'){previous=row;continue;}
  const context=normalizeBrowserContext(row.metadata?.browserContext,row.metadata?.browserContext?.country);if(context)browser=context;
  for(const line of row.body.split(/\n/).map(line=>line.trim())){
   let match;
   if((match=line.match(/^(?:(?:tôi|toi|mình|minh|em)\s+tên\s*(?:là)?|tên\s+của\s+(?:tôi|mình|em)\s+là|ich\s+hei(?:ß|ss)e|mein\s+name\s+ist)\s+([^,;.!?\d]{2,100})/iu)))record('name',match[1],row);
   if((match=line.match(/^(?:(?:email|e-mail)(?:\s+(?:của\s+(?:tôi|mình|em)|von\s+mir))?\s*(?:mới|neu)?\s*(?:là|ist|:)?\s*)?([^\s<>@,;]+@[^\s<>@,;]+\.[^\s<>@,;]+)$/iu)))record('email',match[1],row);
   if((match=line.match(/^(?:(?:số\s+điện\s+thoại|sđt|sdt|telefonnummer)(?:\s+(?:của\s+(?:tôi|mình|em)|von\s+mir))?\s*(?:mới|neu)?\s*(?:là|ist|:)?\s*)?(\+?\d[\d(). -]{5,38}\d)$/iu))&&(/^(?:số\s+điện\s+thoại|sđt|sdt|telefonnummer)/iu.test(line)||previous&&previous.role!=='user'&&/số\s+điện\s+thoại|sđt|telefon|liên\s+hệ/iu.test(previous.body))&&match[1].replace(/\D/g,'').length<=15)record('phone',match[1],row);
   if((match=line.match(/^(?:(?:tôi|toi|mình|minh|em)\s+(?:hiện\s+)?(?:đang\s+ở|sống\s+(?:ở|tại)|cư\s+trú\s+(?:ở|tại))|ich\s+(?:wohne|lebe)\s+in)\s+([^;.!?]{2,160})/iu)))record('location',match[1],row);
   if(/^(?:tôi|mình|em)\s+(?:không|ko)\s+(?:còn\s+)?dùng\s+(?:số|sđt)/iu.test(line))facts.delete('phone');
   if(/^(?:tôi|mình|em)\s+không\s+còn\s+(?:ở|sống)/iu.test(line))facts.delete('location');
  }
  if(previous&&previous.role!=='user'&&row.body.trim().length<=240){
   const key=String(previous.metadata?.clarificationKey||'');
   if(key.endsWith('.country')||/quốc gia|địa phương|welche[mn]?\s+land/iu.test(previous.body))record('caseLocation',row.body,row);
   if(key.endsWith('.goal'))record('request',row.body,row);
  }
  previous=row;
 }
 return {facts:[...facts.values()],browser};
}
