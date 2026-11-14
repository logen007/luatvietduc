// Actual local HTTP/session/SQL flow; only file bytes and the lost response are
// simulated. No mail, Google, Gemini, R2 or real customer data is used.
import assert from 'node:assert/strict';
export async function testChatLoginRetry(browser,base,payload,pool,owner){
 assert.equal(new URL(base).hostname,'127.0.0.1');
 const previous=await payload.findGlobal({slug:'site-settings',user:owner,overrideAccess:false}),password=crypto.randomUUID(),suffix=crypto.randomUUID();
 const member=await payload.create({collection:'users',user:owner,overrideAccess:false,data:{name:'Synthetic chat retry member',email:'retry-'+suffix+'@example.invalid',password,role:'member'}});
 const conversations=[];
 try{
  await payload.updateGlobal({slug:'site-settings',user:owner,overrideAccess:false,data:{chatEnabled:true,customerAIEnabled:false}});
  for(const withFile of [false,true]){
   const context=await browser.newContext({viewport:{width:withFile?1280:390,height:844}});
   await context.route('**/*',route=>new URL(route.request().url()).origin===base?route.continue():route.abort());
   try{
    const created=await context.request.post(base+'/service/conversations',{headers:{origin:base},data:{consent:true,privacyNoticeVersion:'chat-v2'}});assert.equal(created.ok(),true);const {id}=await created.json();conversations.push(id);
    const conversation=(await pool.query('SELECT guest_hash FROM lvd_conversations WHERE id=$1',[id])).rows[0];assert.ok(conversation.guest_hash);
    await pool.query("INSERT INTO lvd_messages(conversation_id,role,body,internal,actor_key,client_key) SELECT $1,CASE WHEN n%2=0 THEN 'staff' ELSE 'user' END,'Synthetic long history '||n,false,CASE WHEN n%2=0 THEN $2 ELSE $3 END,'synthetic-history-'||n FROM generate_series(1,38) n",[id,'staff:'+owner.id,'guest:'+conversation.guest_hash]);
    const file={id:crypto.randomUUID(),name:'Synthetic.txt',size:12,mimeType:'text/plain'};file.url='/service/chat-files/'+file.id;
    if(withFile)await pool.query("INSERT INTO lvd_chat_files(id,conversation_id,actor_key,object_key,name,mime_type,size,ready) VALUES($1,$2,$3,$4,$5,$6,$7,true)",[file.id,id,'guest:'+conversation.guest_hash,'synthetic-retry/'+file.id,file.name,file.mimeType,file.size]);
    const page=await context.newPage();page.setDefaultTimeout(15000);
    if(withFile)await page.route('**/service/conversations/'+id+'/files',route=>route.fulfill({json:file}));
    let lost=false;const sends=[];
    await page.route('**/service/conversations/'+id+'/messages',async route=>{
     if(route.request().method()!=='POST')return route.continue();
     sends.push(route.request().postDataJSON());const response=await route.fetch();assert.equal(response.ok(),true);
     if(!lost){lost=true;return route.abort('failed');}
     return route.fulfill({response});
    });
    await page.goto(base+'/hoi-dap?conversation='+id);
    const question=page.getByRole('textbox',{name:'Câu hỏi của bạn',exact:true});await question.waitFor();await page.waitForFunction(()=>!document.querySelector('.chat-compose textarea')?.disabled);
    if(withFile)await page.locator('.chat-compose input[type=file]').setInputFiles({name:file.name,mimeType:file.mimeType,buffer:Buffer.from('Synthetic123')});
    const body='Synthetic lost acknowledgment '+(withFile?'with file':'text only');await question.fill(body);await page.locator('.chat-compose button[type=submit]').click();
    await page.locator('.chat-error').waitFor();assert.equal(await question.inputValue(),body);assert.equal(sends.length,1);
    assert.equal((await pool.query('SELECT count(*)::int AS n FROM lvd_messages WHERE conversation_id=$1',[id])).rows[0].n,39);
    if(!withFile){await page.getByRole('button',{name:'Mở menu',exact:true}).click();await page.locator('.live-menu-dialog a[href^="/tai-khoan"]').click();}else await page.locator('.live-header-login-button').click();
    await page.waitForURL('**/tai-khoan?conversation='+id);
    await page.goto(base+'/tai-khoan?mode=signin&conversation='+id);await page.getByLabel('Địa chỉ email',{exact:true}).fill(member.email);await page.getByLabel('Mật khẩu',{exact:true}).fill(password);await page.locator('.live-credentials-form button[type=submit]').click();
    await page.waitForURL('**/hoi-dap?conversation='+id);await question.waitFor();await page.waitForFunction(value=>document.querySelector('.chat-compose textarea')?.value===value,body);assert.equal(await question.inputValue(),body);
    await page.locator('.chat-compose button[type=submit]').click();await page.waitForFunction(()=>document.querySelector('.chat-compose textarea')?.value==='');
    assert.equal(sends.length,2);assert.equal(sends[0].key,sends[1].key,'Login retry keeps the committed request key');
    assert.equal((await pool.query('SELECT count(*)::int AS n FROM lvd_messages WHERE conversation_id=$1',[id])).rows[0].n,39,'No duplicate after lost ACK and login');
    assert.equal((await pool.query('SELECT user_id FROM lvd_conversations WHERE id=$1',[id])).rows[0].user_id,member.id);
    if(withFile){const attached=(await pool.query('SELECT message_id,actor_key FROM lvd_chat_files WHERE id=$1',[file.id])).rows[0];assert.ok(attached.message_id);assert.equal(attached.actor_key,'user:'+member.id);assert.deepEqual(sends[1].fileIds,[file.id]);}
   }finally{await context.close();}
  }
  console.log('Real chat login/retry browser checks passed: 38-message history, committed guest message with lost ACK, explicit email login, identical retry key, no duplicate text and unchanged attached-file binding.');
 }finally{
  if(conversations.length)await pool.query('DELETE FROM lvd_conversations WHERE id=ANY($1::uuid[])',[conversations]);
  await payload.delete({collection:'users',id:member.id,user:owner,overrideAccess:false});
  await payload.updateGlobal({slug:'site-settings',user:owner,overrideAccess:false,data:{chatEnabled:previous.chatEnabled,customerAIEnabled:previous.customerAIEnabled}});
 }
}
