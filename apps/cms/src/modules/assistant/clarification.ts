// Clarification asks for context, never supplies legal facts or requests documents.
export const detailKinds=['goal','situation','timeline','parties'] as const;
export type DetailKind=typeof detailKinds[number];
const normalized=(value:string)=>value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').replace(/Đ/g,'D').toLowerCase().trim().replace(/[.!?…]+$/g,'').replace(/\s+/g,' ');
export function clarificationText(kind:DetailKind,question:string){
 const german=/\b(ich|mochte|brauche|frage|hallo|bitte|zum|zur|uber|wissen|deutschland)\b/.test(normalized(question));
 const texts:Record<DetailKind,[string,string]>={
  goal:['Bạn muốn tìm hiểu vấn đề gì và cần làm rõ điều gì?','Zu welchem Thema haben Sie eine Frage und was möchten Sie klären?'],
  situation:['Bạn mô tả ngắn tình huống và điều bạn muốn giải quyết nhé.','Beschreiben Sie bitte kurz die Situation und was Sie klären möchten.'],
  timeline:['Việc này đã xảy ra hay đang dự định thực hiện? Có thời hạn nào cần lưu ý không?','Ist das bereits geschehen oder noch geplant? Gibt es eine Frist zu beachten?'],
  parties:['Những bên liên quan có vai trò gì trong việc này? Không cần nêu tên hay thông tin định danh.','Welche Rollen haben die Beteiligten? Namen oder persönliche Angaben sind nicht erforderlich.'],
 };
 return texts[kind][german?1:0];
}
export function initialClarification(question:string){
 const text=normalized(question);
 const vague=/^(?:xin chao|chao(?: ban)?|hello|hi|hallo|guten tag|toi (?:muon|can)(?: hoi| tu van| ho tro| giup do)?(?: ve phap luat)?|toi dang can(?: hoi| tu van| ho tro)?|tu van(?: phap luat)?|can giup do|ich (?:mochte|will|brauche)(?: fragen| hilfe| beratung| etwas fragen)?|hilfe(?: bitte)?)$/.test(text);
 const topic=text.replace(/^(?:toi (?:muon|can|dang can)(?: hoi| tim hieu| tu van)?(?: ve)?|cho (?:toi|minh) hoi(?: ve)?|ich habe eine frage (?:zu|zum|zur))\s+/,'');
 const bareTopic=/^(?:the chap(?: tai san)?|thua ke|quoc tich|cu tru|ket hon|ly hon|nha dat|thue|hop dong|giay to|einburgerung|aufenthalt|erbrecht|steuer|scheidung)$/.test(topic);
 return vague||bareTopic?clarificationText('goal',question):null;
}
