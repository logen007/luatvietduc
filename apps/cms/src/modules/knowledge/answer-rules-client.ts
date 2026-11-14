import {defaultAnswerRules} from '../assistant/default-rules';
export type AnswerRuleDraft={pending:boolean;appliedEnabled:boolean;key:string;title:string;body:string;enabled:boolean;id:number|null;updatedAt:string|null;reviewDueAt:string|null};
const object=(value:unknown):value is Record<string,unknown>=>Boolean(value)&&typeof value==='object'&&!Array.isArray(value);
const date=(value:unknown)=>typeof value==='string'&&Number.isFinite(Date.parse(value));
const body=(value:unknown)=>typeof value==='string'&&Boolean(value.trim())&&value.length<=4000;
export function answerRuleList(value:unknown):AnswerRuleDraft[]{
 const rows=object(value)?value.rules:null,keys=new Set<string>(defaultAnswerRules.map(rule=>rule.key));
 if(!Array.isArray(rows)||rows.length!==keys.size||!rows.every(row=>object(row)&&typeof row.key==='string'&&keys.delete(row.key)&&typeof row.title==='string'&&body(row.body)&&typeof row.pending==='boolean'&&typeof row.appliedEnabled==='boolean'&&typeof row.enabled==='boolean'&&(row.id===null||Number.isSafeInteger(row.id)&&Number(row.id)>0)&&(row.updatedAt===null||date(row.updatedAt))&&(row.reviewDueAt===null||date(row.reviewDueAt))))
  throw new Error('Chưa đọc được quy tắc. Tải lại để thử lại.');
 return rows as AnswerRuleDraft[];
}
export function answerRuleReceipt(value:unknown,initial:AnswerRuleDraft,enabled:boolean):AnswerRuleDraft{
 if(!object(value)||!Number.isSafeInteger(value.id)||Number(value.id)<1||initial.id!==null&&value.id!==initial.id||!date(value.updatedAt)||!(value.reviewDueAt===null||date(value.reviewDueAt))||!body(value.body)||typeof value.ruleEnabled!=='boolean'||value.ruleEnabled!==enabled)
  throw new Error('Chưa xác nhận được quy tắc đã lưu. Nội dung đang sửa được giữ nguyên.');
 return {...initial,id:Number(value.id),updatedAt:value.updatedAt as string,reviewDueAt:value.reviewDueAt as string|null,body:value.body as string,enabled,pending:false,appliedEnabled:enabled};
}
