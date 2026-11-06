// Fixed intake questions collect context, never legal facts or identifying documents.
export const detailKinds=['goal','situation','timeline','parties'] as const;
export type DetailKind=typeof detailKinds[number];
export const MAX_CLARIFICATIONS=8;
export type Clarification={key:string;text:string;retracted?:boolean};
type Pair=readonly [string,string];
type FactCheck=((value:string)=>boolean)&{retracted?:(value:string)=>boolean};
type Slot={key:string;text:Pair;retry?:Pair;known?:RegExp|FactCheck};
const normalized=(value:string)=>value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').replace(/Đ/g,'D').toLowerCase().trim().replace(/[.!?…]+$/g,'').replace(/\s+/g,' ');
const hasGerman=(question:string)=>/\b(ich|mochte|brauche|frage|hallo|bitte|zum|zur|uber|wissen|deutschland|investition|aufenthalt|arbeitsvertrag|prufung\w*|fuhrerschein\w*|durchgefallen|versicherung\w*|scheidung|erbschaft|mietvertrag|kosten)\b/.test(normalized(question));
export function clarificationLanguage(question:string):'vi'|'de'{
 const marker='\nCâu hỏi tiếp: ',position=question.lastIndexOf(marker);
 const latest=position>=0?question.slice(position+marker.length):question.split('\n').at(-1)||question;
 if(/[đĐ\u031b\u0302\u0306]/.test(latest.normalize('NFD'))||/\b(toi|minh|ban muon|can hoi|giay to|ho so|thu tuc|chi phi|o duc|tai duc)\b/.test(normalized(latest)))return 'vi';
 return hasGerman(latest)||hasGerman(question)?'de':'vi';
}
const german=(question:string)=>clarificationLanguage(question)==='de';

const texts:Record<DetailKind,Pair>={
 goal:['Bạn đang cần tư vấn về việc gì và muốn giải quyết vấn đề nào?','Zu welchem Thema benötigen Sie Beratung und was möchten Sie klären?'],
 situation:['Việc gì đã xảy ra và điều nào đang khiến bạn vướng mắc?','Was ist passiert und wobei besteht die Schwierigkeit?'],
 timeline:['Việc này đang ở giai đoạn dự định, chuẩn bị hay đã thực hiện? Có thời hạn nào cần lưu ý không?','Ist das noch geplant, in Vorbereitung oder bereits geschehen? Gibt es eine Frist zu beachten?'],
 parties:['Những bên liên quan có vai trò gì? Không cần nêu tên hay thông tin định danh.','Welche Rollen haben die Beteiligten? Namen oder persönliche Angaben sind nicht erforderlich.'],
};
const placeText=(value:string)=>normalized(value.normalize('NFC').replace(/(?<!\p{L})mỹ(?!\p{L}| thuật| phẩm)/giu,'USA').replace(/(?<!\p{L})úc(?!\p{L})/giu,'Australien')).replace(/\b(?:anh|ong|chi|ban|chu|cau|bac|co) duc\b/g,'person');
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
const timelineStage=/\b(du dinh|du kien|dang tim hieu|chua bat dau|chua (?:thuc hien|ky|nop|trien khai)|(?:vua|moi) (?:thuc hien|ky|nop|mua|ban)|chuan bi|da (?:thuc hien|ky|nop|mua|ban|ket hon|trien khai)|dang (?:trien khai|thuc hien|kinh doanh)|geplant|planung|vorbereitung|bereits|noch nicht (?:begonnen|gestartet|unterschrieben|eingereicht))\b/;
const timelineDate=/\b((?:ngay|thang) \d{1,2}|nam 20\d\d|(?:hom|tuan|thang|nam) (?:qua|nay|truoc|sau|toi)|gestern|heute|morgen|(?:am|bis zum|frist bis) \d{1,2}|(?:nachste|letzte)(?:n|r)? (?:woche|monat|jahr))\b/;
function timelineKnown(value:string){
 let stage=false,date=false;
 for(const clause of value.split(/[\n;,]/)){
  const text=normalized(clause.normalize('NFC').replace(/vi[eệ]t nam/giu,'Vietnam'));
  const uncertain=/\b(chua ro|khong ro|chua biet|khong biet|chua xac dinh|weiss nicht|weiß nicht|unklar|unbekannt)\b/.test(text);
  const stageUnclear=uncertain&&/\b(thoi diem|giai doan|bat dau|thuc hien|ky|nop|zeitpunkt|beginn|begonnen|stadium|passiert|geschehen)\b/.test(text);
  const dateUnclear=uncertain&&/\b(thoi diem|thoi han|ngay|thang|nam|zeitpunkt|frist|termin)\b/.test(text);
  if(stageUnclear)stage=false;else if(timelineStage.test(text))stage=true;
  if(dateUnclear)date=false;else if(timelineDate.test(text))date=true;
 }
 return stage||date;
}
const timeline:Slot={key:'timeline',text:texts.timeline,known:timelineKnown};
const goalKnown=/\b(dieu kien|thu tuc|giay to|giay phep|chi phi|rui ro|quyen|nghia vu|muc tieu|muon biet|can biet|quy trinh|voraussetzung\w*|verfahren|genehmigung|kosten|risik\w*|rechte|pflichten|ziel|mochte wissen)\b/;
// A fact is not complete forever: an explicit later uncertainty reopens only
// that fact. Uncertainty about costs/procedure must not erase a known choice.
function orderedFact(pattern:RegExp,subject:string){
 const uncertain='(?:chua ro|khong ro|chua biet|khong biet|chua xac dinh|chua quyet dinh|weiss nicht|weiß nicht|unklar|unbekannt|noch nicht entschieden)';
 const bridge='(?:[, ]+(?:la|ve|nen|chon|se|duoc|ist|sind|noch|welche|welcher|welches|die|der|das|es)){0,4}';
 const withdrawal=new RegExp('\\b'+uncertain+bridge+' (?:'+subject+')\\b|(?:^|[,.:!?]\\s*|\\b(?:aber|sondern|nhung|con) )(?:(?:die|der|das) )?(?:'+subject+')'+bridge+' '+uncertain+'\\b');
 const evaluate=(value:string)=>{
  let known=false,retracted=false;
  for(const clause of value.split(/[\n;]/)){
   const text=normalized(clause);
   if(withdrawal.test(text)){known=false;retracted=true;}
   else if(pattern.test(text)){known=true;retracted=false;}
  }
  return {known,retracted};
 };
 return Object.assign((value:string)=>evaluate(value).known,{retracted:(value:string)=>evaluate(value).retracted});
}
type Topic={id:string;match:RegExp;bare:RegExp;slots:Slot[]};
const topics:Topic[]=[
 {id:'investment',match:/\b(dau tu|gop von|investier\w*|investition\w*)\b/,bare:/^(?:dau tu|gop von|investieren|investition\w*)$/,slots:[
  {...country,text:['Bạn dự định đầu tư ở quốc gia và địa phương nào?','In welchem Land und Ort möchten Sie investieren?']},
  {key:'investment.form',text:['Bạn đang cân nhắc thành lập doanh nghiệp, góp vốn, mua phần vốn hay hình thức đầu tư khác?','Planen Sie eine Unternehmensgründung, eine Beteiligung, einen Anteilskauf oder eine andere Investitionsform?'],known:orderedFact(/\b(thanh lap|mo cong ty|doanh nghiep|gop von|mua (?:phan von|co phan)|bat dong san|co phieu|quy dau tu|gmbh|grundung|unternehmen|beteiligung|anteil|immobilien|aktien|fonds)\b/,'hinh thuc(?: dau tu)?|phuong an(?: dau tu)?|loai hinh|investitionsform|rechtsform|anlageform')},
  timeline,{key:'investment.goal',text:['Bạn muốn làm rõ điều kiện, thủ tục, chi phí hay mục tiêu nào khác của kế hoạch đầu tư?','Möchten Sie Voraussetzungen, Verfahren, Kosten oder ein anderes Ziel Ihrer Investitionsplanung klären?'],known:goalKnown},
 ]},
 {id:'residence',match:/\b(visa|cu tru|dinh cu|quoc tich|aufenthalt\w*|einburger\w*)\b/,bare:/^(?:visa|cu tru|dinh cu|quoc tich|aufenthalt\w*|einburger\w*)$/,slots:[country,
  {key:'residence.purpose',text:['Mục đích dự định là học tập, làm việc, đoàn tụ hay việc khác?','Geht es um Studium, Arbeit, Familiennachzug oder einen anderen Aufenthaltszweck?'],known:orderedFact(/\b(hoc|lam viec|doan tu|du lich|studium|arbeit|familiennachzug|reise)\b/,'muc dich(?: cu tru)?|ly do|aufenthaltszweck|zweck')},timeline,
  {key:'residence.goal',text:['Bạn muốn làm rõ điều kiện, thủ tục hay vướng mắc nào về cư trú hoặc quốc tịch?','Welche Voraussetzungen, Verfahren oder Fragen zu Aufenthalt oder Staatsangehörigkeit möchten Sie klären?'],known:goalKnown}]},
 {id:'inheritance',match:/\b(thua ke|di chuc|erbrecht|erbschaft|testament)\b/,bare:/^(?:thua ke|di chuc|erbrecht|erbschaft|testament)$/,slots:[country,
  {key:'inheritance.situation',text:['Bạn đang tìm hiểu việc lập di chúc hay việc phân chia di sản đã phát sinh?','Geht es um die Erstellung eines Testaments oder um einen bereits eingetretenen Erbfall?'],known:/\b(lap di chuc|phan chia|di san|da mat|erstellung|erbfall|verstorben)\b/},
  {key:'parties',text:texts.parties,known:value=>partyFacts(value)},timeline]},
 {id:'family',match:/\b(ket hon|ly hon|hon nhan|heirat|scheidung|ehe)\b/,bare:/^(?:ket hon|ly hon|hon nhan|heirat|scheidung|ehe)$/,slots:[country,
  {key:'family.situation',text:['Bạn đang tìm hiểu việc đăng ký, chấm dứt hôn nhân hay vấn đề liên quan đến con hoặc tài sản?','Geht es um Eheschließung, Scheidung oder Fragen zu Kindern oder Vermögen?'],known:value=>/\b(dang ky|cham dut|con|tai san|eheschlie|kind\w*|vermogen)\b/.test(normalized(value.normalize('NFC').replace(/(?<!\p{L})còn(?!\p{L})/giu,'remaining')))},timeline,{key:'parties',text:texts.parties,known:value=>partyFacts(value)}]},
 {id:'work',match:/\b(lao dong|viec lam|hop dong lao dong|sa thai|arbeits\w*|kundigung)\b/,bare:/^(?:lao dong|viec lam|hop dong lao dong|sa thai|arbeits\w*|kundigung)$/,slots:[country,
  {key:'work.relationship',text:['Bạn hỏi với vai trò người lao động hay người sử dụng lao động? Hợp đồng đã được ký chưa?','Fragen Sie als Arbeitnehmer oder Arbeitgeber? Wurde der Vertrag bereits unterschrieben?'],known:/\b(nguoi lao dong|nguoi su dung lao dong|nhan vien|chu doanh nghiep|arbeitnehmer|arbeitgeber|mitarbeiter)\b/},timeline,
  {key:'work.goal',text:['Bạn muốn làm rõ việc ký hợp đồng, tiền lương, chấm dứt công việc hay vấn đề nào khác?','Geht es um Vertragsabschluss, Vergütung, Beendigung der Arbeit oder eine andere Frage?'],known:goalKnown}]},
 {id:'exam',match:/\b(thi(?: (?:mai|khong|chua|truot|do|bang|tieng|lai|nghe|tot nghiep|dai hoc))?|ky thi|phuc khao|prufung\w*|fuhrerscheinprufung|durchgefallen|bestehen)\b/,bare:/^(?:thi|ky thi|thi khong do|thi truot|prufung\w*)$/,slots:[
  {key:'exam.kind',text:['Bạn đang nói đến kỳ thi nào: bằng lái, ngoại ngữ, nghề nghiệp hay kỳ thi khác?','Um welche Prüfung geht es: Führerschein, Sprache, Beruf oder eine andere Prüfung?'],retry:['Đó là kỳ thi gì và do đơn vị nào tổ chức?','Wie heißt die Prüfung und wer führt sie durch?'],known:orderedFact(/\b(bang lai|lai xe|ielts|telc|goethe|b1|b2|a1|a2|ngoai ngu|tieng duc|tieng anh|nghe|tot nghiep|dai hoc|fuhrerschein\w*|sprachprufung|berufsprufung|abschlussprufung)\b/,'ky thi|thi gi|prufung\\w*')},
  country,
  {key:'exam.goal',text:['Bạn muốn làm rõ quyền phúc khảo, khiếu nại kết quả hay vấn đề nào khác sau kỳ thi?','Geht es um Einsicht, eine Überprüfung des Ergebnisses, einen Widerspruch oder ein anderes Anliegen?'],retry:['Bạn muốn được hỗ trợ điều gì về kết quả thi?','Was möchten Sie hinsichtlich des Prüfungsergebnisses klären?'],known:/\b(phuc khao|khieu nai|quyen|thu tuc|xem lai ket qua|widerspruch|einsicht|uberprufung|rechte|verfahren)\b/},timeline,
 ]},
 {id:'property',match:/\b(the chap|sang ten dat|chuyen nhuong dat|tang cho dat|nha dat|dat dai|manh dat|thua dat|ve dat|dat (?:cua|o|tai)|so do|so hong|bat dong san|mua nha|thue nha|immobilien|grundstuck\w*|miet\w*|hypothek)\b|^dat$/,bare:/^(?:the chap(?: tai san)?|nha dat|dat|dat dai|manh dat|thua dat|bat dong san|mua nha|thue nha|immobilien|grundstuck\w*|miet\w*|hypothek)$/,slots:[
  {...country,text:['Nhà hoặc mảnh đất bạn hỏi nằm ở tỉnh/thành phố nào, thuộc Việt Nam, Đức hay nước khác?','In welcher Stadt oder Region liegt das Haus oder Grundstück, und in welchem Land?'],retry:['Bạn cho biết nhà hoặc mảnh đất ở Việt Nam, Đức hay nước khác nhé?','Liegt das Haus oder Grundstück in Vietnam, Deutschland oder einem anderen Land?']},
  {key:'property.transaction',text:['Bạn muốn hỏi về mua bán, sang tên, thế chấp hay vướng mắc nào của nhà đất?','Geht es um Kauf, Verkauf, Eigentumsübertragung, Miete, Besicherung oder ein anderes Anliegen?'],retry:['Cụ thể bạn muốn làm gì với nhà đất, hoặc đang gặp trở ngại gì?','Was möchten Sie mit der Immobilie konkret tun, oder welches Problem ist aufgetreten?'],known:orderedFact(/\b(mua|ban|thue|the chap|tang cho|sang ten|chuyen nhuong|tranh chap|cap so|tach thua|thu hoi|boi thuong|kauf|verkauf|miete|hypothek|(?:eigentums)?ubertrag\w*|schenk\w*|streit)\b/,'giao dich|mua ban|sang ten|the chap|vorhaben|geschaft|(?:eigentums)?ubertragung')},
  {key:'property.ownership',text:['Mảnh đất hiện đứng tên ai và đã có giấy chứng nhận chưa? Bạn chỉ cần nói quan hệ, không cần gửi tên hoặc số giấy tờ.','Auf wen ist das Grundstück eingetragen und gibt es einen Eigentumsnachweis? Die Beziehung genügt; Namen oder Dokumentnummern sind nicht nötig.'],retry:['Bạn đang đứng tên trên giấy chứng nhận hay đất vẫn đứng tên người khác? Nếu chưa rõ, cứ nói phần bạn biết nhé.','Sind Sie selbst als Eigentümer eingetragen oder eine andere Person? Wenn Sie unsicher sind, nennen Sie nur die bekannten Angaben.'],known:value=>propertyFacts(value).complete},timeline,
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
 let text=normalized(value.normalize('NFC').replace(/(?<!\p{L})thì(?!\p{L})/giu,'THEN').replace(/(?<!\p{L})thuế(?!\p{L})/giu,'Steuer').replace(/(?<!\p{L})thuê(?!\p{L})/giu,'Miete'));
 if(/\b(khong phai|nicht)\b/.test(text))text=text.replace(/\b(?:khong phai|nicht)\b.*?(?=\b(?:ma|sondern|stattdessen)\b|[,;.!?]|$)/g,' ').split(/\b(?:ma|sondern|stattdessen)\b/).at(-1)||text;
 return topics.map(topic=>({topic,index:topic.match.exec(text)?.index??Infinity})).sort((a,b)=>a.index-b.index).find(match=>match.index<Infinity)?.topic;
}
function intakeState(question:string){
 const lines=question.split('\n').map(line=>line.trim()).filter(Boolean),visits:Record<string,number>={};
 let topic:Topic|undefined,start=0,segment=0,priorCountry='';
 for(let i=0;i<lines.length;i++){
  const found=findTopic(lines[i]),line=normalized(lines[i]);if(!found)continue;
  const newIntent=topicIntent.test(line)||/^(?:ve|zum|zur|uber|con|the con|vay con|und(?: die| das| der)?|was ist mit)\b/.test(line);
  if(!topic||found.id!==topic.id&&newIntent){
   const previous=lines.slice(start,i).join('\n');priorCountry=sameCountry.test(normalized(previous))&&countryState(priorCountry).known?priorCountry+'\n'+previous:previous;
   topic=found;start=i;segment++;visits[topic.id]=(visits[topic.id]||0)+1;
  }
 }
 const text=lines.slice(start).join('\n'),samePlace=sameCountry.test(normalized(text));
 return {topic,text,scope:topic?topic.id+(visits[topic.id]>1?'-'+visits[topic.id]:''):'',segment,countryText:samePlace&&countryState(priorCountry).known?priorCountry+'\n'+text:text};
}
export function currentIntakeContext(question:string){const state=intakeState(question);return {text:state.text,topic:state.topic?.id||null,scope:state.scope,countryKnown:countryState(state.countryText).known};}
export function clarificationText(kind:DetailKind|'country',question:string){return (kind==='country'?country.text:texts[kind])[german(question)?1:0];}
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
// Bind only unambiguous short answers to our own specific factual question.
// These labels preserve context, not proof of title or a legal conclusion.
export function contextualIntakeReply(body:string,key?:string){
 const kind=/^property(?:-\d+)?\.(owner|document)$/.exec(key||'')?.[1],text=normalized(body);
 if(!kind)return body;
 const de=/^(?:ich|mein|meine|meinen|ja|nein|noch|weiss|weiß|keine)\b/.test(text);
 const owner=/^(?:toi|minh|(?:bo|cha|me|vo|chong|ong|ba|anh|chi|em|con)(?: toi| minh)?|vo chong toi|nguoi khac|ngan hang|ich(?: selbst)?|meine? (?:mutter|vater|eltern|frau|mann)|jemand anderes)$/;
 const document=/^(?:co(?: roi)?|da co(?: roi)?|khong(?: co)?|chua(?: co)?|chua co so|ja|nein|noch nicht)$/;
 const unknown=/^(?:chua ro|khong ro|chua biet|khong biet|weiss nicht|weiß nicht|keine ahnung)$/;
 if(!(unknown.test(text)||(kind==='owner'?owner:document).test(text)))return body;
 return (kind==='owner'?(de?'Eingetragener Eigentümer: ':'Người đang đứng tên: '):(de?'Nachweis: ':'Giấy chứng nhận: '))+body;
}
export function contextualIntakeHistory(previous:ClarificationMessage[]){
 const result=new Map<ClarificationMessage,string>();let pending:string|undefined;
 for(const row of [...previous].reverse()){
  if(row.role==='assistant')pending=row.metadata?.kind==='clarify'?row.metadata.clarificationKey:undefined;
  else if(row.role==='user'){result.set(row,contextualIntakeReply(String(row.body),pending));pending=undefined;}
  else pending=undefined;
 }
 return result;
}
// Rows arrive newest first. Only consented customer turns can become provider
// context; local fixed questions may still use legacy turns without uploading them.
export function clarificationHistory(previous:ClarificationMessage[],consentVersion:string){
 const trail:ClarificationMessage[]=[];let count=0;const keys:string[]=[];
 for(const row of previous){
  if(row.role==='assistant'){if(row.metadata?.kind!=='clarify')break;if(row.metadata.clarificationKey==='acknowledgement')continue;count++;const key=row.metadata.clarificationKey||detailKinds.find(kind=>texts[kind].includes(String(row.body)));if(key&&!keys.includes(key))keys.push(key);}
  else if(row.role!=='user')break;
  trail.push(row);
 }
 const users=count?trail.filter(row=>row.role==='user').reverse():[],contextual=contextualIntakeHistory(trail);
 const answers:Record<string,string>={};let pendingKey:string|undefined;
 for(const row of [...trail].reverse()){if(row.role==='assistant')pendingKey=row.metadata?.clarificationKey;else if(row.role==='user'&&pendingKey){answers[pendingKey]=String(row.body);pendingKey=undefined;}}
 return {count,keys,answers,pendingKey,localContext:users.map(row=>contextual.get(row)||String(row.body)).join('\n'),context:users.filter(row=>row.metadata?.aiConsent?.version===consentVersion).map(row=>contextual.get(row)||String(row.body)).join('\n')};
}

// Intake is a completeness gate, not a quota of questions. Asking a slot does
// not mean that the customer supplied it; vague replies must stay in intake.
const emptyReply=/^(?:hay(?: qua)?|cam on(?: ban)?|danke|gut|giup toi(?: voi)?|thu(?: xem)?|test(?:ing)?|abc|asdf\w*|ok(?:ay)?|uh|u|um|vang|da|khong|co|sao|sao vay|gi|khong biet|chua biet|khong ro|chua ro|khong hieu|nichts|ja|nein|weiss nicht|keine ahnung)$/;
const partyRoles=/\b(anh chi em|ong ba|cha|me|con|vo|chong|nguoi mua|nguoi ban|ngan hang|doanh nghiep|ca nhan|chu so huu|nguoi lao dong|nguoi su dung lao dong|geschwister|grosseltern|eltern|kind\w*|ehepartner|kaufer|verkaufer|bank|unternehmen|arbeitnehmer|arbeitgeber)\b/;
const partyFacts=(value:string)=>{
 let known=false;
 for(const line of value.split('\n')){
  const text=normalized(line.normalize('NFC').replace(/(?<!\p{L})còn(?!\p{L})/giu,'remaining')),unclear=/\b(khong biet|chua biet|khong ro|chua ro|weiss nicht|weiß nicht|unklar)\b/.test(text);
  if(partyRoles.test(text))known=!unclear;
  else if(unclear&&/\b(cac ben|ben lien quan|vai tro|nguoi lien quan|beteiligten|parteien|rollen)\b/.test(text))known=false;
 }
 return known;
};
function propertyFacts(value:string){
 let ownerKnown=false,documentKnown=false;
 for(const clause of value.split(/[\n,;]/)){
  const text=normalized(clause),unclear=/\b(khong biet|chua biet|chua ro|khong ro|weiss nicht|weiß nicht|keine ahnung|unklar)\b/.test(text);
  if(/\b(dung ten|chua dung ten|chua sang ten|dang su dung|dang quan ly|eingetragen|eigentumer\w*)\b/.test(text))ownerKnown=!unclear;
  if(/\b(so do|so hong|giay chung nhan|co so|chua co so|chua duoc cap so|grundbuch|urkunde|nachweis)\b/.test(text))documentKnown=!unclear;
 }
 const land=/\b(dat|dat dai|manh dat|thua dat|dat cua|ve dat|so do|so hong|grundstuck\w*)\b/.test(normalized(value.normalize('NFC').replace(/(?<!\p{L})(?:đặt|đạt)(?!\p{L})/giu,'action')));
 return {ownerKnown,documentKnown,complete:!land||ownerKnown&&documentKnown};
}
const fillerWords=new Set('toi minh em anh chi ban muon can dang hoi nho giup tu van ho tro mot chut ti it ve nay kia do ay no the vay nhu la xin chao voi nhe a ah uh vang da ich mochte will brauche etwas fragen bitte hilfe ja gut'.split(' '));
// Unknown topics are not filler. Only positively recognized empty replies may
// become disposable intake; the caller separately protects retained history.
export function isVagueIntakeReply(text:string){const value=normalized(text);return !value||vague.test(value)||emptyReply.test(value)||value.split(' ').every(word=>fillerWords.has(word));}
// These fragments refer to the last answered topic only when the caller has
// an actual prior answer and consented customer context. Alone they stay vague.
export function acknowledgementText(text:string){
 const value=normalized(text);
 if(!/^(?:(?:ok|okay|vang|da|gut) )?(?:cam on(?: ban| nhe| rat nhieu)?|da hieu(?: roi)?|toi hieu roi|danke(?: schon| sehr| fur die hilfe)?|vielen dank|verstanden|alles klar)$/.test(value))return null;
 return german(text)||/danke|dank|verstanden|alles klar/.test(value)?'Gern. Wenn Sie noch etwas klären möchten, schreiben Sie einfach hier weiter.':'Rất vui được hỗ trợ bạn. Khi cần làm rõ thêm, bạn cứ nhắn tại đây nhé.';
}
export const isBriefIntakeFollowup=(text:string)=>/^(?:(?:con|the con|vay con|und(?: die| das| der)?|was ist mit) )?(?:chi phi|thu tuc|giay to|thoi han|bao lau|kosten|verfahren|unterlagen|fristen?|dauer)(?: (?:thi sao|nhu the nao|bao nhieu|ra sao|la gi|genau))?$/.test(normalized(text).replace(/^(?:cam on(?: ban)?|danke(?: schon| sehr)?|vielen dank|vang|ok|okay|verstanden|alles klar)[,;.! ]+/,''));
const usableReply=(text:string)=>!isVagueIntakeReply(text)&&/[\p{L}\p{N}]/u.test(normalized(text));
export function intakeClarification(question:string,asked:readonly string[]=[],answers:Record<string,string>={}):Clarification|null{
 const state=intakeState(question),text=normalized(state.text),last=state.text.split('\n').at(-1)||question;
 const prompt=(key:string,pair:Pair):Clarification=>({key,text:pair[german(state.text)?1:0]});
 if(state.topic){
  for(const slot of state.topic.slots){
   const key=state.scope+'.'+slot.key.split('.').at(-1),response=answers[key]||answers[slot.key]||'';
   const known=slot.key==='country'?countryState(state.countryText).known:typeof slot.known==='function'?slot.known(state.text):slot.known?.test(text);
   const answered=!slot.known&&partyFacts(response);
   if(!known&&!answered){
    if(slot.key==='property.ownership'){
     const {ownerKnown,documentKnown}=propertyFacts(state.text);
     if(ownerKnown&&!documentKnown)return prompt(state.scope+'.document',['Mảnh đất đã có sổ đỏ, sổ hồng hoặc giấy chứng nhận chưa?','Gibt es für das Grundstück bereits einen Eigentumsnachweis?']);
     if(!ownerKnown)return prompt(state.scope+'.owner',['Ai đang đứng tên mảnh đất: bạn, người thân hay một bên khác?','Auf wen ist das Grundstück eingetragen: Sie, Angehörige oder eine andere Person?']);
    }
    const followup=prompt(key,asked.includes(key)&&slot.retry?slot.retry:slot.text);
    if(typeof slot.known==='function'&&slot.known.retracted?.(state.text))followup.retracted=true;
    return followup;
   }
  }
  return null;
 }
 if(!usableReply(last))return prompt('goal',asked.includes('goal')?['Bạn đang cần hỗ trợ chuyện gì? Bạn mô tả cụ thể điều đang vướng nhé.','Wobei benötigen Sie Hilfe? Beschreiben Sie bitte konkret, was Sie klären möchten.']:texts.goal);
 if(text.split(' ').length<3||!/[?？]/.test(state.text)&&!goalKnown.test(text)&&! /\b(hoi|giai thich|tu van|question|frage|klaren|erklaren)\b/.test(text))return prompt('goal',asked.includes('goal')?texts.situation:texts.goal);
 return nextClarification(question,asked);
}

// A repeated missing slot needs a clearer question, not the same sentence again.
export function unrepeatedClarification(initial:Clarification,previous:readonly string[],question:string):string{
 const last=previous[0]||'',recent=previous.slice(0,3).map(normalized),state=intakeState(question);
 const suffix=initial.key.split('.').at(-1),slot=state.topic?.slots.find(slot=>slot.key.split('.').at(-1)===suffix);
 const variants:Pair[]=suffix==='country'?[
  ['Bạn cho biết quốc gia nơi sự việc xảy ra nhé?','In welchem Land findet die Angelegenheit statt?'],
  ['Sự việc diễn ra ở Việt Nam, Đức hay một nước khác?','Geht es um Vietnam, Deutschland oder ein anderes Land?'],
 ]:suffix==='owner'?[
  ['Người đứng tên là bạn, người thân hay một bên khác?','Sind Sie selbst, Angehörige oder eine andere Person eingetragen?'],
  ['Bạn biết ai đang đứng tên không? Nếu chưa rõ, cứ nói mình chưa biết nhé.','Wissen Sie, wer eingetragen ist? Falls nicht, sagen Sie einfach, dass Sie es noch nicht wissen.'],
 ]:suffix==='document'?[
  ['Đất đã được cấp giấy chứng nhận, chưa có hay bạn chưa rõ?','Gibt es bereits einen Nachweis, noch keinen, oder wissen Sie es noch nicht?'],
  ['Bạn đã thấy sổ đỏ hoặc giấy chứng nhận của mảnh đất chưa?','Haben Sie den Eigentumsnachweis für das Grundstück schon gesehen?'],
 ]:suffix==='kind'?[
  ['Bạn có thể cho biết tên kỳ thi hoặc lĩnh vực được kiểm tra không?','Wie heißt die Prüfung oder welches Fach wird geprüft?'],
 ]:[texts[suffix as DetailKind]||texts.situation,texts.goal];
 const candidates=[initial.text,...(slot?[slot.text,...(slot.retry?[slot.retry]:[])].map(pair=>pair[german(question)?1:0]):[]),...variants.map(pair=>pair[german(question)?1:0])];
 return candidates.find(value=>!recent.includes(normalized(value)))||candidates.find(value=>normalized(value)!==normalized(last))||initial.text;
}

export const isRepeatedClarification=(question:string,previous:readonly string[])=>previous.some(value=>normalized(value)===normalized(question));
