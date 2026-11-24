// Topic links contain only a public title. A question is prefilled, never sent.
export function initialChatQuestion(search:string,saved:unknown,limit=2000){
 const linked=new URLSearchParams(search).get('question')?.trim();
 return (linked||(typeof saved==='string'?saved.trim():'')).slice(0,limit);
}
