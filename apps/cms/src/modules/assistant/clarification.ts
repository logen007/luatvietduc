// Fixed intake questions collect context, never legal facts or identifying documents.
export const detailKinds=['goal','situation','timeline','parties'] as const;
export type DetailKind=typeof detailKinds[number];
export const MAX_CLARIFICATIONS=8;
export type Clarification={key:string;text:string};
type Pair=readonly [string,string];
type Slot={key:string;text:Pair;known?:RegExp|((value:string)=>boolean)};
const normalized=(value:string)=>value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').replace(/Đ/g,'D').toLowerCase().trim().replace(/[.!?…]+$/g,'').replace(/\s+/g,' ');
const german=(question:string)=>/\b(ich|mochte|brauche|frage|hallo|bitte|zum|zur|uber|wissen|deutschland|investition|aufenthalt|arbeitsvertrag)\b/.test(normalized(question));
const texts:Record<DetailKind,Pair>={
 goal:['Bạn muốn tìm hiểu vấn đề gì và cần làm rõ điều gì?','Zu welchem Thema haben Sie eine Frage und was möchten Sie klären?'],
 situation:['Bạn mô tả ngắn tình huống và điều bạn muốn giải quyết nhé.','Beschreiben Sie bitte kurz die Situation und was Sie klären möchten.'],
 timeline:['Việc này đang ở giai đoạn dự định, chuẩn bị hay đã thực hiện? Có thời hạn nào cần lưu ý không?','Ist das noch geplant, in Vorbereitung oder bereits geschehen? Gibt es eine Frist zu beachten?'],
 parties:['Những bên liên quan có vai trò gì? Không cần nêu tên hay thông tin định danh.','Welche Rollen haben die Beteiligten? Namen oder persönliche Angaben sind nicht erforderlich.'],
};
const placeText=(value:string)=>normalized(value.normalize('NFC').replace(/(?<!\p{L})mỹ(?!\p{L}| thuật| phẩm)/giu,'USA').replace(/(?<!\p{L})úc(?!\p{L})/giu,'Australien'));
const countryPattern=/\b(viet nam|vietnam|duc|deutschland|germany|berlin|hamburg|munchen|ha noi|sai gon|ho chi minh|ca hai nuoc|beide(?:n)? lander|canada|usa|australia|australien|(?:o|tai|nuoc|sang|in|nach) (?:anh|my|uc|phap)|frankreich|england|nhat ban|japan|han quoc|korea|schweiz|osterreich)\b/;
const countryReset=/\b(khong (?:phai|o|tai|con)|chua (?:biet|ro|quyet dinh)|khong ro|nuoc khac|quoc gia khac|dia phuong khac|dinh chinh|sua lai|nicht|anderes land|anderen land|noch unklar)\b/;
function countryState(value:string){
 let known=false,corrected=false;
 for(const line of value.split('\n')){
  let text=placeText(line);
  if(countryReset.test(text)&&(countryPattern.test(text)||/\b(quoc gia|nuoc|dia phuong|land|ort)\b/.test(text))){known=false;corrected=true;text=text.replace(/\b(?:khong (?:phai|o|tai|con)|nicht(?: mehr)?(?: in)?|not(?: in)?)\b.*?(?=\b(?:ma|nhung|sondern|but|instead|thay vao do)\b|[,;.!?]|$)/g,' ');}
  if(countryPattern.test(text))known=true;
 }
 return {known,corrected};
}
const country:Slot={key:'country',text:['Việc này liên quan đến quốc gia hoặc địa phương nào?','Um welches Land oder welchen Ort geht es?'],known:value=>countryState(value).known};
const timeline:Slot={key:'timeline',text:texts.timeline,known:/\b(du dinh|du kien|dang tim hieu|chua bat dau|chua (?:thuc hien|ky|nop|trien khai)|(?:vua|moi) (?:thuc hien|ky|nop|mua|ban)|chuan bi|da (?:thuc hien|ky|nop|mua|ban|ket hon|trien khai)|dang (?:trien khai|thuc hien|kinh doanh)|thang|nam 20\d\d|ngay|thoi han|geplant|planung|vorbereitung|bereits|noch nicht (?:begonnen|gestartet|unterschrieben|eingereicht)|frist|monat|jahr)\b/};
const goalKnown=/\b(dieu kien|thu tuc|giay to|giay phep|chi phi|rui ro|quyen|nghia vu|muc tieu|muon biet|can biet|quy trinh|voraussetzung\w*|verfahren|genehmigung|kosten|risik\w*|rechte|pflichten|ziel|mochte wissen)\b/;
type Topic={id:string;match:RegExp;bare:RegExp;slots:Slot[]};
const topics:Topic[]=[
 {id:'investment',match:/\b(dau tu|gop von|investier\w*|investition\w*)\b/,bare:/^(?:dau tu|gop von|investieren|investition\w*)$/,slots:[
  {...country,text:['Bạn dự định đầu tư ở quốc gia và địa phương nào?','In welchem Land und Ort möchten Sie investieren?']},
  {key:'investment.form',text:['Bạn đang cân nhắc thành lập doanh nghiệp, góp vốn, mua phần vốn hay hình thức đầu tư khác?','Planen Sie eine Unternehmensgründung, eine Beteiligung, einen Anteilskauf oder eine andere Investitionsform?'],known:/\b(thanh lap|mo cong ty|doanh nghiep|gop von|mua (?:phan von|co phan)|bat dong san|co phieu|quy dau tu|gmbh|grundung|unternehmen|beteiligung|anteil|immobilien|aktien|fonds)\b/},
  timeline,{key:'investment.goal',text:['Bạn muốn làm rõ điều kiện, thủ tục, chi phí hay mục tiêu nào khác của kế hoạch đầu tư?','Möchten Sie Voraussetzungen, Verfahren, Kosten oder ein anderes Ziel Ihrer Investitionsplanung klären?'],known:goalKnown},
 ]},
 {id:'residence',match:/\b(visa|cu tru|dinh cu|quoc tich|aufenthalt\w*|einburger\w*)\b/,bare:/^(?:visa|cu tru|dinh cu|quoc tich|aufenthalt\w*|einburger\w*)$/,slots:[country,
  {key:'residence.purpose',text:['Mục đích dự định là học tập, làm việc, đoàn tụ hay việc khác?','Geht es um Studium, Arbeit, Familiennachzug oder einen anderen Aufenthaltszweck?'],known:/\b(hoc|lam viec|doan tu|du lich|studium|arbeit|familiennachzug|reise)\b/},timeline,
  {key:'residence.goal',text:['Bạn muốn làm rõ điều kiện, thủ tục hay vướng mắc nào về cư trú hoặc quốc tịch?','Welche Voraussetzungen, Verfahren oder Fragen zu Aufenthalt oder Staatsangehörigkeit möchten Sie klären?'],known:goalKnown}]},
 {id:'inheritance',match:/\b(thua ke|di chuc|erbrecht|erbschaft|testament)\b/,bare:/^(?:thua ke|di chuc|erbrecht|erbschaft|testament)$/,slots:[country,
  {key:'inheritance.situation',text:['Bạn đang tìm hiểu việc lập di chúc hay việc phân chia di sản đã phát sinh?','Geht es um die Erstellung eines Testaments oder um einen bereits eingetretenen Erbfall?'],known:/\b(lap di chuc|phan chia|di san|da mat|erstellung|erbfall|verstorben)\b/},
  {key:'parties',text:texts.parties,known:/\b(cha|me|con|vo|chong|anh chi em|eltern|kind\w*|ehepartner|geschwister)\b/},timeline]},
 {id:'family',match:/\b(ket hon|ly hon|hon nhan|heirat|scheidung|ehe)\b/,bare:/^(?:ket hon|ly hon|hon nhan|heirat|scheidung|ehe)$/,slots:[country,
  {key:'family.situation',text:['Bạn đang tìm hiểu việc đăng ký, chấm dứt hôn nhân hay vấn đề liên quan đến con hoặc tài sản?','Geht es um Eheschließung, Scheidung oder Fragen zu Kindern oder Vermögen?'],known:/\b(dang ky|cham dut|con|tai san|eheschlie|kind\w*|vermogen)\b/},timeline,{key:'parties',text:texts.parties,known:value=>partyFacts(value)}]},
 {id:'work',match:/\b(lao dong|viec lam|hop dong lao dong|sa thai|arbeits\w*|kundigung)\b/,bare:/^(?:lao dong|viec lam|hop dong lao dong|sa thai|arbeits\w*|kundigung)$/,slots:[country,
  {key:'work.relationship',text:['Bạn hỏi với vai trò người lao động hay người sử dụng lao động? Hợp đồng đã được ký chưa?','Fragen Sie als Arbeitnehmer oder Arbeitgeber? Wurde der Vertrag bereits unterschrieben?'],known:/\b(nguoi lao dong|nguoi su dung lao dong|nhan vien|chu doanh nghiep|arbeitnehmer|arbeitgeber|mitarbeiter)\b/},timeline,
  {key:'work.goal',text:['Bạn muốn làm rõ việc ký hợp đồng, tiền lương, chấm dứt công việc hay vấn đề nào khác?','Geht es um Vertragsabschluss, Vergütung, Beendigung der Arbeit oder eine andere Frage?'],known:goalKnown}]},
 {id:'property',match:/\b(the chap|nha dat|bat dong san|mua nha|thue nha|immobilien|miet\w*|hypothek)\b/,bare:/^(?:the chap(?: tai san)?|nha dat|bat dong san|mua nha|thue nha|immobilien|miet\w*|hypothek)$/,slots:[country,
  {key:'property.transaction',text:['Bạn đang tìm hiểu việc mua bán, thuê, thế chấp hay giao dịch nào khác?','Geht es um Kauf, Verkauf, Miete, Besicherung oder ein anderes Geschäft?'],known:/\b(mua|ban|thue|the chap|kauf|verkauf|miete|hypothek)\b/},timeline,
  {key:'property.goal',text:['Bạn muốn làm rõ điều kiện, giấy tờ, thủ tục hay vướng mắc nào của giao dịch?','Welche Voraussetzungen, Unterlagen, Verfahren oder Schwierigkeiten des Geschäfts möchten Sie klären?'],known:goalKnown}]},
 {id:'tax',match:/\b(thue|steuer\w*)\b/,bare:/^(?:thue|steuer\w*)$/,slots:[country,
  {key:'tax.activity',text:['Vấn đề thuế liên quan đến thu nhập, hoạt động kinh doanh, tài sản hay giao dịch nào?','Geht es um Einkommen, eine Geschäftstätigkeit, Vermögen oder ein bestimmtes Geschäft?'],known:/\b(thu nhap|kinh doanh|tai san|tien luong|einkommen|geschaft|vermogen|gehalt)\b/},timeline,
  {key:'tax.goal',text:['Bạn muốn làm rõ nghĩa vụ, cách kê khai, thời hạn hay vấn đề nào khác?','Geht es um Pflichten, die Erklärung, Fristen oder eine andere Frage?'],known:goalKnown}]},
 {id:'contract',match:/\b(hop dong|vertrag\w*)\b/,bare:/^(?:hop dong|vertrag\w*)$/,slots:[country,
  {key:'contract.kind',text:['Đây là hợp đồng về việc gì và các bên có vai trò nào? Không cần nêu tên.','Worum geht es in dem Vertrag und welche Rollen haben die Parteien? Namen sind nicht erforderlich.'],known:/\b(mua ban|dich vu|vay|thue|kauf|dienstleistung|darlehen|miet)\b/},timeline,
  {key:'contract.goal',text:['Bạn muốn làm rõ việc giao kết, thực hiện, chấm dứt hay vướng mắc nào khác?','Geht es um Abschluss, Erfüllung, Beendigung oder eine andere Vertragsfrage?'],known:goalKnown}]},
];
const vague=/^(?:xin chao|chao(?: ban)?|hello|hi|hallo|guten tag|toi (?:muon|can)(?: hoi| tu van| ho tro| giup do)?(?: ve phap luat)?|toi dang can(?: hoi| tu van| ho tro)?|tu van(?: phap luat)?|can giup do|ich (?:mochte|will|brauche)(?: fragen| hilfe| beratung| etwas fragen)?|hilfe(?: bitte)?)$/;
const stripPrefix=(value:string)=>value.replace(/^(?:toi (?:muon|can|dang can)(?: hoi| tim hieu| tu van)?(?: ve)?|cho (?:toi|minh) hoi(?: ve)?|ich habe eine frage (?:zu|zum|zur)|ve|zum|zur|uber)\s+/,'');
const topicIntent=/\b((?:toi|minh|em|anh|chi) (?:muon|can|hoi)|ich (?:mochte|will|habe eine frage)|bay gio|chuyen sang|doi chu de|cau hoi khac|jetzt|anderes thema)\b/;
const sameCountry=/\b(cung (?:o|tai|quoc gia|nuoc)|van (?:o|tai)|cung noi|same (?:country|place)|selben land|weiterhin dort|auch dort)\b/;
function findTopic(value:string){
 // Preserve the tax/rent distinction before removing Vietnamese accents.
 let text=normalized(value.normalize('NFC').replace(/(?<!\p{L})thuế(?!\p{L})/giu,'Steuer').replace(/(?<!\p{L})thuê(?!\p{L})/giu,'Miete'));
 if(/\b(khong phai|nicht)\b/.test(text))text=text.replace(/\b(?:khong phai|nicht)\b.*?(?=\b(?:ma|sondern|stattdessen)\b|[,;.!?]|$)/g,' ').split(/\b(?:ma|sondern|stattdessen)\b/).at(-1)||text;
 return topics.map(topic=>({topic,index:topic.match.exec(text)?.index??Infinity})).sort((a,b)=>a.index-b.index).find(match=>match.index<Infinity)?.topic;
}
function intakeState(question:string){
 const lines=question.split('\n').map(line=>line.trim()).filter(Boolean),visits:Record<string,number>={};
 let topic:Topic|undefined,start=0,segment=0,priorCountry='';
 for(let i=0;i<lines.length;i++){
  const found=findTopic(lines[i]),line=normalized(lines[i]);if(!found)continue;
  const newIntent=topicIntent.test(line)||/^(?:ve|zum|zur|uber)\b/.test(line);
  if(!topic||found.id!==topic.id&&newIntent){
   const previous=lines.slice(start,i).join('\n');priorCountry=sameCountry.test(normalized(previous))&&countryState(priorCountry).known?priorCountry+'\n'+previous:previous;
   topic=found;start=i;segment++;visits[topic.id]=(visits[topic.id]||0)+1;
  }
 }
 const text=lines.slice(start).join('\n'),samePlace=sameCountry.test(normalized(text));
 return {topic,text,scope:topic?topic.id+(visits[topic.id]>1?'-'+visits[topic.id]:''):'',segment,countryText:samePlace&&countryState(priorCountry).known?priorCountry+'\n'+text:text};
}
export function currentIntakeContext(question:string){const state=intakeState(question);return {text:state.text,topic:state.topic?.id||null,scope:state.scope,countryKnown:countryState(state.countryText).known};}
export function clarificationText(kind:DetailKind,question:string){return texts[kind][german(question)?1:0];}
export function nextClarification(question:string,asked:readonly string[]=[],detail?:DetailKind|'country'):Clarification|null{
 if(asked.length>=MAX_CLARIFICATIONS)return null;
 const state=intakeState(question),topic=state.topic,text=normalized(state.text),lastRaw=state.text.split('\n').at(-1)||question,last=normalized(lastRaw);
 const opening=vague.test(last)||Boolean(topic&&(topic.bare.test(stripPrefix(last))||asked.length||topicIntent.test(text)&&!goalKnown.test(text)||!goalKnown.test(text)&&!/[?？]/.test(lastRaw)&&last.split(' ').length<=10));
 if(!opening&&!detail)return null;
 const place=countryState(state.countryText);
 const choice=(slot:Slot):Clarification|null=>{
  let key=state.scope?state.scope+'.'+slot.key.split('.').at(-1):slot.key;
  const already=asked.includes(key)||state.segment<=1&&!slot.key.includes('.')&&asked.includes(slot.key);
  if(slot.key==='country'&&place.corrected&&!place.known&&already)key+='-correction';
  else if(already)return null;
  if(asked.includes(key))return null;
  const known=slot.key==='country'?place.known:typeof slot.known==='function'?slot.known(state.text):slot.known?.test(text);
  return known?null:{key,text:slot.text[german(state.text)?1:0]};
 };
 for(const slot of topic?.slots||[]){const selected=choice(slot);if(selected)return selected;}
 if(topic&&!detail)return null;
 if(detail==='country'){const selected=choice(country);if(selected)return selected;}
 const order=detail&&detail!=='country'?[detail,...detailKinds.filter(kind=>kind!==detail)]:detailKinds;
 for(const kind of order){const selected=choice({key:kind,text:texts[kind],...(kind==='timeline'?{known:timeline.known}:kind==='goal'?{known:goalKnown}:{})});if(selected)return selected;}
 return null;
}
export function initialClarification(question:string){return nextClarification(question)?.text||null;}
export type ClarificationMessage={role:string;body:unknown;metadata?:{kind?:string;clarificationKey?:string;aiConsent?:{version?:string}}};
// Rows arrive newest first. Only consented customer turns can become provider
// context; local fixed questions may still use legacy turns without uploading them.
export function clarificationHistory(previous:ClarificationMessage[],consentVersion:string){
 const trail:ClarificationMessage[]=[];let count=0;const keys:string[]=[];
 for(const row of previous){
  if(row.role==='assistant'){if(row.metadata?.kind!=='clarify')break;count++;const key=row.metadata.clarificationKey||detailKinds.find(kind=>texts[kind].includes(String(row.body)));if(key&&!keys.includes(key))keys.push(key);}
  else if(row.role!=='user')break;
  trail.push(row);
 }
 const users=count?trail.filter(row=>row.role==='user').reverse():[];
 const answers:Record<string,string>={};let pendingKey:string|undefined;
 for(const row of [...trail].reverse()){if(row.role==='assistant')pendingKey=row.metadata?.clarificationKey;else if(row.role==='user'&&pendingKey){answers[pendingKey]=String(row.body);pendingKey=undefined;}}
 return {count,keys,answers,pendingKey,localContext:users.map(row=>String(row.body)).join('\n'),context:users.filter(row=>row.metadata?.aiConsent?.version===consentVersion).map(row=>String(row.body)).join('\n')};
}

// Intake is a completeness gate, not a quota of questions. Asking a slot does
// not mean that the customer supplied it; vague replies must stay in intake.
const emptyReply=/^(?:hay(?: qua)?|cam on(?: ban)?|danke|gut|giup toi(?: voi)?|thu(?: xem)?|test(?:ing)?|abc|asdf\w*|ok(?:ay)?|uh|u|um|vang|da|khong|co|sao|sao vay|gi|khong biet|chua biet|khong ro|chua ro|khong hieu|nichts|ja|nein|weiss nicht|keine ahnung)$/;
const partyRoles=/\b(anh chi em|ong ba|cha|me|con|vo|chong|nguoi mua|nguoi ban|ngan hang|doanh nghiep|ca nhan|chu so huu|nguoi lao dong|nguoi su dung lao dong|geschwister|grosseltern|eltern|kind\w*|ehepartner|kaufer|verkaufer|bank|unternehmen|arbeitnehmer|arbeitgeber)\b/;
const partyFacts=(value:string)=>partyRoles.test(normalized(value))&&!/\b(khong biet|chua biet|khong ro|chua ro|weiss nicht|unklar)\b/.test(normalized(value));
const fillerWords=new Set('toi minh em anh chi ban muon can dang hoi nho giup tu van ho tro mot chut ti it ve nay kia do ay no the vay nhu la xin chao voi nhe a ah uh vang da ich mochte will brauche etwas fragen bitte hilfe ja gut'.split(' '));
const usableReply=(text:string)=>{const value=normalized(text);return Boolean(value)&&!value.split(' ').every(word=>fillerWords.has(word))&&!vague.test(value)&&!emptyReply.test(value)&&/[\p{L}\p{N}]/u.test(value);};
export function intakeClarification(question:string,asked:readonly string[]=[],answers:Record<string,string>={}):Clarification|null{
 const state=intakeState(question),text=normalized(state.text),last=state.text.split('\n').at(-1)||question;
 const prompt=(key:string,pair:Pair):Clarification=>({key,text:pair[german(state.text)?1:0]});
 if(state.topic){
  for(const slot of state.topic.slots){
   const key=state.scope+'.'+slot.key.split('.').at(-1),response=answers[key]||answers[slot.key]||'';
   const known=slot.key==='country'?countryState(state.countryText).known:typeof slot.known==='function'?slot.known(state.text):slot.known?.test(text);
   const answered=!slot.known&&partyFacts(response);
   if(!known&&!answered)return prompt(key,slot.text);
  }
  return null;
 }
 if(!usableReply(last))return prompt('goal',asked.includes('goal')?['Bạn đang cần hỗ trợ chuyện gì? Bạn mô tả cụ thể điều đang vướng nhé.','Wobei benötigen Sie Hilfe? Beschreiben Sie bitte konkret, was Sie klären möchten.']:texts.goal);
 if(text.split(' ').length<3||!/[?？]/.test(state.text)&&!goalKnown.test(text)&&! /\b(hoi|giai thich|tu van|question|frage|klaren|erklaren)\b/.test(text))return prompt('goal',texts.goal);
 return nextClarification(question,asked);
}
