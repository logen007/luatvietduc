import {clarificationLanguage,currentIntakeContext,isVagueIntakeReply} from '../assistant/clarification';
import {conversationDisplayTitle} from './display';
import {sourceScopes} from '../assistant/scope';

// Name a recognizable topic without waiting for legal intake or copying personal details.
export function proposedConversationTitle(value:unknown):string|undefined{
 if(typeof value!=='string')return;
 const title=value.trim().replace(/ +/g,' ');
 if(!conversationDisplayTitle('',title,'')||title.length<4||title.length>80||title.split(' ').length>12||!/^\p{L}[\p{L}\p{M} \-–—,:()&]*$/u.test(title))return;
 return title;
}
export function conversationTitle(context:string,enabled=true,proposed?:unknown):string|null{
 if(!enabled)return null;
 const generated=proposedConversationTitle(proposed);if(generated)return generated;
 const active=currentIntakeContext(context),de=clarificationLanguage(active.text)==='de';
 const labels:Record<string,readonly [string,string]>={
  investment:['Đầu tư','Investition'],residence:['Cư trú và quốc tịch','Aufenthalt und Staatsangehörigkeit'],
  inheritance:['Thừa kế','Erbschaft'],family:['Hôn nhân và gia đình','Ehe und Familie'],
  work:['Lao động','Arbeitsrecht'],exam:['Kết quả thi','Prüfungsergebnis'],
  property:['Nhà đất','Immobilien'],tax:['Thuế','Steuern'],contract:['Hợp đồng','Vertrag'],
 };
 const label=active.topic?labels[active.topic]:null;if(!label)return null;
 const text=active.text.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').toLowerCase();
 const tasks:readonly (readonly [RegExp,readonly [string,string]])[]=active.topic==='property'?[
  [/\b(the chap|hypothek)\b/,['Thế chấp nhà đất','Immobilienbesicherung']],
  [/\b(tang cho|schenk\w*)\b/,['Tặng cho nhà đất','Immobilienschenkung']],
  [/\b(sang ten|chuyen nhuong|eigentums\w*)\b/,['Sang tên nhà đất','Eigentumsübertragung']],
  [/\b(mua|kauf\w*)\b/,['Mua nhà đất','Immobilienkauf']],
  [/\b(thue|miet\w*)\b/,['Thuê nhà','Wohnungsmiete']],
 ]:active.topic==='family'?[[/\b(ly hon|cham dut|scheidung)\b/,['Ly hôn','Scheidung']]]:[];
 const matched=tasks.map(([pattern,label])=>({label,index:[...text.matchAll(new RegExp(pattern.source,'g'))].at(-1)?.index??-1})).sort((a,b)=>b.index-a.index).find(item=>item.index>=0);
 const title=(matched?.label||label)[de?1:0],scopes=sourceScopes('BOTH',active.text);
 const place=scopes.length===2?(scopes.includes('VN')?(de?' in Vietnam':' tại Việt Nam'):(de?' in Deutschland':' tại Đức')):'';
 return title+place;
}

// Old unnamed histories get a short excerpt immediately, without a read causing
// a model request or a database write. The next reply can refine the AI title.
export function recoveredConversationTitle(title:string|null,context:string|null,custom=false){
 if(conversationDisplayTitle('',title,'',custom))return title;
 if(!context)return title;
 const topic=conversationTitle(context);if(topic)return topic;
 for(const line of context.split('\n')){
  if(isVagueIntakeReply(line)||/[\d@<>]|https?:|www\./i.test(line)||/\b(?:email|phone|address|name)\b/i.test(line)||/(?:tôi tên|tên tôi|địa chỉ|số điện thoại|mein name|ich heiße|ich heisse)/i.test(line))continue;
  const text=line.trim().replace(/^(?:(?:tôi|mình|em)\s+(?:muốn|cần)(?:\s+(?:hỏi|tìm hiểu|biết|tư vấn))?(?:\s+về)?|(?:cho tôi hỏi|về)|ich (?:möchte|brauche)(?: (?:wissen|fragen))?(?: (?:über|zum|zur))?)\s+/i,'').replace(/[.?!…]+$/,'').trim();
  if(isVagueIntakeReply(text)||text.length<4)continue;
  const excerpt=text.length>60?text.slice(0,60).replace(/\s+\S*$/,''):text;
  return excerpt.charAt(0).toLocaleUpperCase()+excerpt.slice(1);
 }
 return title;
}
// Bounded historical fallback, used only for unnamed rows after owner/staff ACL.
export const unnamedTitleContextSQL=(alias:string)=>`CASE WHEN ${alias}.title IS NULL OR ${alias}.title IN ('','Cuộc trò chuyện mới','Cuộc hội thoại mới') THEN (SELECT string_agg(left(body,300),E'\\n' ORDER BY id) FROM (SELECT id,body FROM lvd_messages WHERE conversation_id=${alias}.id AND role='user' AND NOT internal AND COALESCE(metadata->>'kind','')<>'deleted' ORDER BY id LIMIT 12) title_messages) ELSE NULL END`;
