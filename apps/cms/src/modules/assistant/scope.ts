// Stored legacy scope remains useful internally; visitors never need to classify a question.
function mentionedScopes(question:string):string[]|null{
 // Explicitly rejected places do not widen evidence scope. Genuine comparisons remain.
 const relevant=question.replace(/(?:không\s+(?:(?:phải|còn)\s+)?(?:(?:ở|tại|sang)\s+)?|nicht\s+(?:mehr\s+)?(?:in\s+)?|not\s+(?:in\s+)?)(?:Việt\s+Nam|Vietnam|Đức|Deutschland|Germany|German)(?![\p{L}])/giu,' ');
 const text=relevant.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').replace(/Đ/g,'D').toLowerCase();
 const vietnam=/\b(viet nam|vietnam)\b/.test(text),germany=/(?:^|[^\p{L}])Đức(?:$|[^\p{L}])/iu.test(relevant)||/\b(germany|deutschland|german|nuoc duc|tai duc|luat duc|o duc|sang duc)\b/.test(text);
 return vietnam||germany?[...(vietnam?['VN']:[]),...(germany?['DE']:[]),'BOTH']:null;
}
export function sourceScopes(country:string,question=''){
 if(country==='VN'||country==='DE')return [country,'BOTH'];
 const marker='\nCâu hỏi tiếp: ',position=question.lastIndexOf(marker);
 if(question.startsWith('Hội thoại trước:\n')&&position>=0){
  const latest=mentionedScopes(question.slice(position+marker.length));if(latest)return latest;
  // Short follow-ups inherit the most recently stated country. Comparisons
  // mentioning both countries in one turn still admit both sources.
  for(const turn of question.slice('Hội thoại trước:\n'.length,position).split('\n\n').reverse()){const scopes=mentionedScopes(turn);if(scopes)return scopes;}
 }
 return mentionedScopes(question)||['VN','DE','BOTH'];
}
export const sourceInScope=(scope:string,country:string,question='')=>sourceScopes(country,question).includes(scope);
