import type {User} from '../../payload-types';
import {pool} from '../shared/db';
import {HttpError} from '../chat/service';
import {requireKnowledge} from '../knowledge/articles';
import {canWriteContent} from '../identity/permissions';
export async function indexStatus(user:User|null,ids:number[]){
 requireKnowledge(user);
 // IDs come only from the server's authorized Payload list.
 const rows=ids.length?(await pool.query('SELECT source_id,status,error_code,indexed_revision,updated_at FROM lvd_rag_jobs WHERE source_id=ANY($1::integer[])',[ids])).rows:[];
 const worker=(await pool.query('SELECT heartbeat_at,state FROM lvd_rag_worker WHERE id=true')).rows[0];
 return {rows,worker:worker?{state:worker.state,online:Date.now()-new Date(worker.heartbeat_at).getTime()<180000}:null};
}
export async function retryIndex(user:User|null,id:number,authorizedId:number){
 requireKnowledge(user);if(id!==authorizedId)throw new HttpError(403,'Bài viết không thuộc quyền quản lý.');
 await pool.query("INSERT INTO lvd_rag_jobs(source_id) VALUES($1) ON CONFLICT(source_id) DO UPDATE SET generation=lvd_rag_jobs.generation+1,status='pending',available_at=now(),attempts=0,error_code=NULL,updated_at=now()",[id]);
 return {ok:true};
}
export async function knowledgeGaps(user:User|null){
 requireKnowledge(user);
 // Private messages remain in staff inbox; never automatically turn them into public knowledge.
 return (await pool.query("SELECT c.id,c.title,c.updated_at FROM lvd_conversations c WHERE (c.assigned_to=$1 OR $2) AND ($2 OR c.jurisdiction='BOTH' OR c.jurisdiction=ANY($3::text[])) AND c.ai_enabled=false AND EXISTS(SELECT 1 FROM lvd_chat_events e WHERE e.conversation_id=c.id AND e.action='ai.handoff') AND c.state<>'closed' ORDER BY c.updated_at DESC LIMIT 20",[user.id,canWriteContent(user),user.jurisdictions||[]])).rows;
}
