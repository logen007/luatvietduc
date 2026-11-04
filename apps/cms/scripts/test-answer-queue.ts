import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {pool} from '../src/modules/shared/db';
import * as chat from '../src/modules/chat/service';
import {requestAnswer,processNextAnswer} from '../src/modules/assistant/queue';
import type {User} from '../src/payload-types';
export async function testAnswerQueue(owner:User){
 const url=new URL(process.env.DATABASE_URL||'');
 assert.ok(['localhost','127.0.0.1'].includes(url.hostname)&&url.pathname==='/lvd_test');
 const guest={user:null,guestHash:randomUUID()},other={user:null,guestHash:randomUUID()};
 const make=async()=>{
  const c=await chat.createConversation(guest,{consent:true},{assistantEnabled:true});
  const input={body:'Synthetic queue-only question',key:randomUUID()};
  const sent=await chat.message(guest,c.id,input,2000);
  await pool.query("UPDATE lvd_answer_jobs SET available_at='1900-01-01' WHERE message_id=$1",[sent.id]);
  return {c,sent,input};
 };
 const first=await make();
 assert.equal((await chat.transcript(guest,first.c.id)).messages.length,1,'Question saved before any AI call');
 await chat.message(guest,first.c.id,first.input,2000);
 assert.equal((await pool.query('SELECT * FROM lvd_answer_jobs WHERE message_id=$1',[first.sent.id])).rowCount,1,'Retry keeps one job');
 await assert.rejects(()=>requestAnswer(other,first.c.id,String(first.sent.id)),/không có quyền/);
 await processNextAnswer(async()=>{});
 assert.equal((await pool.query('SELECT status FROM lvd_answer_jobs WHERE message_id=$1',[first.sent.id])).rows[0].status,'pending','In-flight generation cannot lose the latest unanswered job');
 await pool.query("UPDATE lvd_answer_jobs SET available_at='1900-01-01',status='processing',lease=$2,lease_until=now()-interval '1 minute' WHERE message_id=$1",[first.sent.id,randomUUID()]);
 await processNextAnswer();
 assert.equal((await pool.query('SELECT status FROM lvd_answer_jobs WHERE message_id=$1',[first.sent.id])).rows[0].status,'done','Expired worker lease is recovered');
 const transcript=await chat.transcript(guest,first.c.id);
 assert.equal(transcript.messages.length,2);assert.equal(transcript.messages[1].metadata.kind,'handoff','Unconnected AI hands off without external content');
 const claimed=await make();
 await pool.query("UPDATE lvd_conversations SET updated_at=now()-interval '1 minute' WHERE id=$1",[claimed.c.id]);
 await chat.transition({user:owner,guestHash:''},claimed.c.id,{action:'claim',version:1});
 let invoked=false;await processNextAnswer(async()=>{invoked=true;});
 assert.equal(invoked,false,'Human claim cancels queued AI work');
 assert.equal((await chat.transcript(guest,claimed.c.id)).messages.length,1,'Worker cannot inject an answer after claim');
 const concurrent=await make();
 let release!:()=>void,entered!:()=>void;
 const ready=new Promise<void>(resolve=>{entered=resolve;});
 const running=processNextAnswer(async()=>{entered();await new Promise<void>(resolve=>{release=resolve;});});
 await ready;
 const next=await processNextAnswer(async(_actor,_id,messageId)=>{assert.notEqual(String(messageId),String(concurrent.sent.id),'Same job cannot be claimed twice');});
 release();await running;
 // Finish only our own fixtures; other tests keep their rows untouched.
 for(const item of [first,claimed,concurrent])await pool.query('DELETE FROM lvd_conversations WHERE id=$1',[item.c.id]);
 console.log('Answer queue checks passed: saved-first delivery, deduplication, ownership, lease recovery, handoff cancellation and concurrent claims');
}
