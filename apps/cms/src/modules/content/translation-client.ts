export type ArticleLanguage='vi'|'de';
export type LanguageSibling={id:number;language:ArticleLanguage};
const object=(value:unknown):value is Record<string,unknown>=>Boolean(value)&&typeof value==='object'&&!Array.isArray(value);
const articleId=(value:unknown):value is number=>typeof value==='number'&&Number.isSafeInteger(value)&&value>0;
const invalid=()=>new Error('Chưa đọc được bản ngôn ngữ. Nội dung đang sửa được giữ nguyên.');

export function translationList(value:unknown,signal?:AbortSignal):{articles:LanguageSibling[];translationReady:boolean}{
 signal?.throwIfAborted();
 if(!object(value)||!Array.isArray(value.articles)||value.articles.length>2||typeof value.translationReady!=='boolean')throw invalid();
 const articles:LanguageSibling[]=[],ids=new Set<number>(),languages=new Set<string>();
 for(const article of value.articles){
  if(!object(article)||!articleId(article.id)||(article.language!=='vi'&&article.language!=='de')||ids.has(article.id)||languages.has(article.language))throw invalid();
  ids.add(article.id);languages.add(article.language);articles.push({id:article.id,language:article.language});
 }
 return {articles,translationReady:value.translationReady};
}
export function translationText(value:unknown,signal?:AbortSignal):{title:string;body:string}{
 signal?.throwIfAborted();
 if(!object(value)||!object(value.translation))throw invalid();
 const {title,body}=value.translation;
 if(typeof title!=='string'||typeof body!=='string'||!title.trim()||!body.trim()||title.length>240||body.length>16000||/[\u0000]/.test(title+body))throw invalid();
 return {title,body};
}
export function translationTarget(value:unknown,signal?:AbortSignal):number{
 signal?.throwIfAborted();if(!object(value)||!articleId(value.id))throw invalid();return value.id;
}
