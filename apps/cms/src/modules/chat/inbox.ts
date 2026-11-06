import {pool} from '../shared/db';
import {isStaff,HttpError,type Actor} from './service';
export async function specialistInbox(actor:Actor,options:{view?:string;query?:string;page?:number}={}){
 if(!isStaff(actor.user))throw new HttpError(403,'Chỉ dành cho chuyên viên.');
 const manageAll=isStaff(actor.user),countries=['VN','DE','BOTH'];
 const view=['queue','active','done','all','low'].includes(options.view||'')?options.view!:'queue';
 const page=Math.max(1,Math.min(10000,Math.floor(Number(options.page)||1))),query=String(options.query||'').trim().slice(0,120);
 const result=await pool.query(`WITH accessible AS (
 SELECT c.*,CASE WHEN c.assigned_to=$2 OR $3 THEN c.title ELSE NULL END AS safe_title
 FROM lvd_conversations c WHERE c.jurisdiction=ANY($1) AND (
 (c.state='queued' AND c.qualification IN ('low','needs_details')) OR (c.state='queued' AND c.qualification NOT IN ('low','needs_details') AND (NOT c.ai_enabled OR (COALESCE(c.ai_started_at,c.updated_at)<now()-interval '45 seconds' AND EXISTS(SELECT 1 FROM lvd_messages q WHERE q.id=(SELECT max(id) FROM lvd_messages WHERE conversation_id=c.id AND role='user') AND NOT EXISTS(SELECT 1 FROM lvd_messages answer WHERE answer.conversation_id=c.id AND answer.client_key='assistant:'||q.id::text)))))
 OR c.assigned_to=$2 OR ($3 AND c.state IN ('human','closed')))),
 filtered AS (SELECT * FROM accessible WHERE ($4='all' OR ($4='low' AND qualification='low') OR ($4='queue' AND state='queued' AND qualification NOT IN ('low','needs_details')) OR ($4 IN ('active','done') AND state=CASE $4 WHEN 'queue' THEN 'queued' WHEN 'active' THEN 'human' ELSE 'closed' END)) AND ($5='' OR safe_title ILIKE $6 OR id::text ILIKE $6)),
 page_rows AS (SELECT * FROM filtered ORDER BY CASE WHEN qualification='low' THEN 4 WHEN state='human' THEN 0 WHEN state='queued' AND user_id IS NOT NULL THEN 1 WHEN state='queued' THEN 2 ELSE 3 END,CASE WHEN state='queued' THEN created_at END ASC,updated_at DESC LIMIT 30 OFFSET $7)
 SELECT json_build_object('rows',COALESCE((SELECT json_agg(json_build_object('id',p.id,'qualification',p.qualification,'expires_at',p.low_priority_expires_at,'title',p.safe_title,'state',p.state,'version',p.version,'registered',p.user_id IS NOT NULL,'created_at',p.created_at,'updated_at',p.updated_at,'assigned_to',p.assigned_to,'last_role',CASE WHEN p.assigned_to=$2 OR $3 THEN (SELECT role FROM lvd_messages WHERE conversation_id=p.id AND NOT internal ORDER BY id DESC LIMIT 1) ELSE NULL END)) FROM page_rows p),'[]'::json),'total',(SELECT count(*) FROM filtered),'counts',(SELECT json_build_object('low',count(*) FILTER(WHERE qualification='low'),'queue',count(*) FILTER(WHERE state='queued' AND qualification NOT IN ('low','needs_details')),'active',count(*) FILTER(WHERE state='human'),'done',count(*) FILTER(WHERE state='closed'),'all',count(*)) FROM accessible)) AS data`,[countries,actor.user!.id,manageAll,view,query,'%'+query+'%',(page-1)*30]);
 const data=result.rows[0].data;return {...data,page,totalPages:Math.max(1,Math.ceil(data.total/30))};
}
