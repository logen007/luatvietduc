// Stored legacy scope remains useful internally; visitors never need to classify a question.
export function sourceScopes(country:string,question=''){
 if(country==='VN'||country==='DE')return [country,'BOTH'];
 const text=question.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').replace(/Đ/g,'D').toLowerCase();
 const vietnam=/\b(viet nam|vietnam)\b/.test(text),germany=/(?:^|[^\p{L}])Đức(?:$|[^\p{L}])/iu.test(question)||/\b(germany|deutschland|german|nuoc duc|tai duc|luat duc|o duc|sang duc)\b/.test(text);
 return vietnam!==germany?[vietnam?'VN':'DE','BOTH']:['VN','DE','BOTH'];
}
export const sourceInScope=(scope:string,country:string,question='')=>sourceScopes(country,question).includes(scope);
