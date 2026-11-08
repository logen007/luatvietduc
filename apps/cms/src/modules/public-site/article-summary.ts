import {articleText} from '../content/article-body';

// One safe text conversion supplies list summaries and reading time. Keep the
// same body parser as article rendering/RAG; never strip markup with a regex.
export function articleSummary(body:unknown){
 const text=articleText(body).trim();
 return {text,summary:text.replace(/\s+/g,' ').slice(0,180),readingMinutes:Math.max(1,Math.ceil(text.split(/\s+/u).filter(Boolean).length/220))};
}
