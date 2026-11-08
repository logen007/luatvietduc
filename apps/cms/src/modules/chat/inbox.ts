import {recoveredConversationTitle,unnamedTitleContextSQL} from './conversation-title';
import {pool} from '../shared/db';
import {isStaff,HttpError,type Actor} from './service';
export async function specialistInbox(actor:Actor,options:{view?:string;query?:string;page?:number}={}){
 if(!isStaff(actor.user))throw new HttpError(403,'Chỉ dành cho chuyên viên.');
 const manageAll=isStaff(actor.user),countries=['VN','DE','BOTH'];
 const view=['queue','active','done','all','low'].includes(options.view||'')?options.view!:'queue';
 const page=Math.max(1,Math.min(10000,Math.floor(Number(options.page)||1))),query=String(options.query||'').trim().slice(0,120);
 // Intake qualification and durable history do not determine specialist priority.
 // AI stays low until handoff; account-owned history never displays an expiry.
 const result=await pool.query(`WITH accessible AS (
 SELECT c.*,CASE WHEN c.state='queued' AND c.ai_enabled THEN 'low' ELSE 'ready' END AS inbox_qualification,
 CASE WHEN c.user_id IS NULL AND NOT c.retain_history AND c.state='queued' AND c.ai_enabled THEN c.low_priority_expires_at ELSE NULL END AS inbox_expires_at,
 CASE WHEN c.assigned_to=$2 OR $3 THEN c.title ELSE NULL END AS safe_title
 FROM lvd_conversations c WHERE c.jurisdiction=ANY($1) AND (
 c.state='queued'
 OR c.assigned_to=$2 OR ($3 AND c.state IN ('human','closed')))),
 filtered AS (SELECT * FROM accessible WHERE ($4='all' OR ($4='low' AND inbox_qualification='low') OR ($4='queue' AND state='queued' AND inbox_qualification<>'low') OR ($4 IN ('active','done') AND state=CASE $4 WHEN 'active' THEN 'human' ELSE 'closed' END)) AND ($5='' OR safe_title ILIKE $6 OR id::text ILIKE $6)),
 page_rows AS (SELECT * FROM filtered ORDER BY CASE WHEN $4='all' THEN updated_at END DESC,CASE WHEN inbox_qualification='low' THEN 4 WHEN state='human' THEN 0 WHEN state='queued' AND user_id IS NOT NULL THEN 1 WHEN state='queued' THEN 2 ELSE 3 END,CASE WHEN state='queued' THEN created_at END ASC,updated_at DESC LIMIT 30 OFFSET $7)
 SELECT json_build_object('rows',COALESCE((SELECT json_agg(json_build_object('id',p.id,'qualification',p.inbox_qualification,'expires_at',p.inbox_expires_at,'title',p.safe_title,'title_context',CASE WHEN p.assigned_to=$2 OR $3 THEN ${unnamedTitleContextSQL('p')} ELSE NULL END,'customTitle',p.id IN (SELECT conversation_id FROM lvd_chat_events WHERE action='customer.rename'),'state',p.state,'version',p.version,'registered',p.user_id IS NOT NULL,'created_at',p.created_at,'updated_at',p.updated_at,'assigned_to',p.assigned_to,'last_role',CASE WHEN p.assigned_to=$2 OR $3 THEN (SELECT role FROM lvd_messages WHERE conversation_id=p.id AND NOT internal ORDER BY id DESC LIMIT 1) ELSE NULL END)) FROM page_rows p),'[]'::json),'total',(SELECT count(*) FROM filtered),'counts',(SELECT json_build_object('low',count(*) FILTER(WHERE inbox_qualification='low'),'queue',count(*) FILTER(WHERE state='queued' AND inbox_qualification<>'low'),'active',count(*) FILTER(WHERE state='human'),'done',count(*) FILTER(WHERE state='closed'),'all',count(*)) FROM accessible)) AS data`,[countries,actor.user!.id,manageAll,view,query,'%'+query+'%',(page-1)*30]);
 const data=result.rows[0].data;data.rows=data.rows.map(({title_context,...row}:any)=>({...row,title:recoveredConversationTitle(row.title,title_context,row.customTitle)}));return {...data,page,totalPages:Math.max(1,Math.ceil(data.total/30))};
}
