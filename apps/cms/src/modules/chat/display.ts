export const shortConversationId=(id:string)=>'#'+id.slice(0,8);
export function conversationDisplayTitle(id:string,title?:string|null,untitled=shortConversationId(id),custom=false){
 const value=title?.trim()||'';
 if(custom&&value)return value;
 return !value||value==='Cuộc trò chuyện mới'||value==='Cuộc hội thoại mới'||/^(hi|hey|hello|hallo|chào|xin chào)[.!?\s]*$/i.test(value)||value.length<4?untitled:value;
}
