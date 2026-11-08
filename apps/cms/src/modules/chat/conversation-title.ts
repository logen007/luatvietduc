import {clarificationLanguage,currentIntakeContext} from '../assistant/clarification';
import {sourceScopes} from '../assistant/scope';

// Name a recognizable topic without waiting for legal intake or copying personal details.
export function conversationTitle(context:string,enabled=true):string|null{
 if(!enabled)return null;
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
