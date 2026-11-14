import {randomUUID} from 'node:crypto';
import type {CollectionBeforeChangeHook,PayloadRequest} from 'payload';
// A symbol cannot be supplied by REST/GraphQL callers or the editor form.
const groupKey=Symbol('article-translation-group');
export function setTranslationGroup(req:PayloadRequest,group:string){
 req.context={...req.context,articleTranslation:true,[groupKey]:group};
}
export const articleLanguageGroup:CollectionBeforeChangeHook=({data,originalDoc,req,operation})=>{
 if(operation==='update'&&originalDoc?.id&&data.language&&data.language!==originalDoc.language)throw new Error('Dùng nút VI/DE để mở bản ngôn ngữ khác.');
 data.translationGroup=(operation==='update'?originalDoc?.translationGroup:null)||(req.context as Record<symbol,unknown>)[groupKey]||randomUUID();
 return data;
};
