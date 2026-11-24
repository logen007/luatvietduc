import assert from 'node:assert/strict';
import {handleEndpoints,type Payload} from 'payload';
import type {User} from '../src/payload-types';
import {pool} from '../src/modules/shared/db';
import {articleTranslation,articleLanguages} from '../src/modules/content/translations';
import {writeKnowledgeArticle,knowledgeArticles} from '../src/modules/knowledge/articles';
import {specialistInbox} from '../src/modules/chat/inbox';
import {createConversation,message,transcript,transition} from '../src/modules/chat/service';

export async function testSpecialistPermissions(payload:Payload,owner:User){
 const database=new URL(process.env.DATABASE_URL||'');assert.ok(['127.0.0.1','localhost'].includes(database.hostname)&&database.pathname==='/lvd_test','Synthetic isolated permissions only');
 const users:number[]=[],articles:number[]=[],knowledge:number[]=[],conversations:string[]=[];
 const suffix=crypto.randomUUID(),password=crypto.randomUUID(),base=process.env.APP_URL||'http://localhost:3000';
 try{
  const specialist=await payload.create({collection:'users',user:owner,overrideAccess:false,data:{name:'Synthetic unrestricted specialist',email:suffix+'@example.invalid',password,role:'support',jurisdictions:['VN']}});users.push(specialist.id);
  const staff=await payload.update({collection:'users',id:specialist.id,user:owner,overrideAccess:false,data:{jurisdictions:[]}});
  const member=await payload.create({collection:'users',user:owner,overrideAccess:false,data:{name:'Synthetic denied member',email:'member-'+suffix+'@example.invalid',password,role:'member'}});users.push(member.id);
  const login=await payload.login({collection:'users',data:{email:staff.email,password}});assert.ok(login.token);
  const native=async(method:string,path:string,data?:unknown,token=login.token)=>handleEndpoints({config:payload.config,request:new Request(base+path,{method,headers:{origin:base,cookie:'payload-token='+token,'content-type':'application/json'},...(data===undefined?{}:{body:JSON.stringify(data)})})});
  const receipt=async(response:Response)=>{assert.ok(response.ok,'Native permission request failed with '+response.status);const value=await response.json();return value.doc||value;};
  const article=await receipt(await native('POST','/api/articles?draft=true',{title:'Synthetic permissions '+suffix,body:'Synthetic original',language:'vi',jurisdiction:'DE',slug:''}));articles.push(article.id);
  const published=await receipt(await native('PATCH','/api/articles/'+article.id,{body:'Synthetic published revision',_status:'published',aiAllowed:true}));assert.equal(published.reviewState,'approved');assert.equal(published._status,'published');
  const mirror=(await pool.query('SELECT id FROM knowledge WHERE article_origin_id=$1',[article.id])).rows[0];assert.ok(mirror);
  assert.ok([403,404].includes((await native('DELETE','/api/knowledge/'+mirror.id)).status),'Synchronized knowledge must be managed through its source article');
  assert.equal((await articleLanguages(payload,staff,article.id)).articles.length,1);
  const manual=await articleTranslation(payload,staff,{id:article.id,updatedAt:published.updatedAt,language:'de',mode:'manual'});assert.ok('id' in manual);articles.push(manual.id!);
  const withdrawn=await receipt(await native('PATCH','/api/articles/'+article.id,{reviewState:'withdrawn',_status:'draft'}));assert.equal(withdrawn._status,'draft');
  const saved=await writeKnowledgeArticle(payload,staff,{title:'Synthetic private permissions '+suffix,body:'Synthetic private knowledge',publish:true,sourceUrl:'https://example.invalid/synthetic'});knowledge.push(saved.id);
  assert.equal((await knowledgeArticles(payload,staff,String(saved.id)) as any).id,saved.id);
  const edited=await receipt(await native('PATCH','/api/knowledge/'+saved.id,{jurisdiction:'DE',body:'Synthetic cross-country revision',_status:'published'}));assert.equal(edited.approved,true);
  await receipt(await native('DELETE','/api/knowledge/'+saved.id));knowledge.splice(knowledge.indexOf(saved.id),1);
  const direct=await receipt(await native('POST','/api/knowledge',{title:'Synthetic native permissions '+suffix,body:'Synthetic native knowledge',jurisdiction:'VN',sourceUrl:'https://example.invalid/synthetic',_status:'published'}));knowledge.push(direct.id);assert.equal(direct.approved,true);
  const memberLogin=await payload.login({collection:'users',data:{email:member.email,password}});assert.ok(memberLogin.token);
  for(const path of ['/api/articles','/api/knowledge'])assert.equal((await native('POST',path,{title:'Denied',body:'Denied'},memberLogin.token)).status,403);
  assert.equal((await native('PATCH','/api/users/'+owner.id,{role:'support'})).status,403);assert.equal((await native('GET','/api/globals/site-settings')).status,403);
  const guest={user:null,guestHash:'synthetic-specialist-'+suffix},actor={user:staff,guestHash:''},admin={user:owner,guestHash:''};
  const c=await createConversation(guest,{consent:true,jurisdiction:'DE'});conversations.push(c.id);
  await message(guest,c.id,{body:'Synthetic inbox permissions '+suffix,key:crypto.randomUUID()},2000);
  const claimed=await transition(admin,c.id,{action:'claim',version:c.version});
  assert.equal((await transcript(actor,c.id)).conversation.assignedTo,owner.id);assert.equal((await specialistInbox(actor,{view:'active',query:c.id})).total,1);
  await message(actor,c.id,{body:'Synthetic other-assignment reply',key:crypto.randomUUID()},2000);
  await assert.rejects(()=>transition(actor,c.id,{action:'close',version:c.version}),{status:409});
  await assert.rejects(()=>transition(actor,c.id,{action:'claim',version:claimed.version}),{status:409});
  const closed=await transition(actor,c.id,{action:'close',version:claimed.version});assert.equal((await specialistInbox(actor,{view:'done',query:c.id})).total,1);
  const reopened=await transition(actor,c.id,{action:'reopen',version:closed.version});assert.equal(reopened.state,'queued');
  assert.equal((await transcript(actor,c.id)).messages.length,2);await assert.rejects(()=>transcript({user:member,guestHash:''},c.id),{status:403});
  await receipt(await native('PATCH','/api/articles/'+article.id,{_status:'published',reviewState:'draft',aiAllowed:true}));
  assert.equal((await pool.query('SELECT id FROM knowledge WHERE article_origin_id=$1',[article.id])).rowCount,1);
  for(const id of [...articles]){await receipt(await native('DELETE','/api/articles/'+id));articles.splice(articles.indexOf(id),1);}
  assert.equal((await pool.query('SELECT id FROM knowledge WHERE article_origin_id=$1',[article.id])).rowCount,0,'Deleting the canonical article removes its synchronized knowledge');
  console.log('Specialist permissions passed: no country assignments; native article/knowledge create/edit/publish/withdraw/delete, manual language draft, cross-assignment inbox read/reply/close/reopen, stale/claim guards and member/settings/users denial.');
 }finally{
  for(const id of articles.reverse())await payload.delete({collection:'articles',id,user:owner,overrideAccess:false});
  for(const id of knowledge.reverse())await payload.delete({collection:'knowledge',id,user:owner,overrideAccess:false});
  if(conversations.length)await pool.query('DELETE FROM lvd_conversations WHERE id=ANY($1::uuid[])',[conversations]);
  for(const id of users.reverse())await payload.delete({collection:'users',id,user:owner,overrideAccess:false});
 }
}
