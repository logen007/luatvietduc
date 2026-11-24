import assert from 'node:assert/strict';

// Parent executes with the isolated browser database. All created records are
// synthetic; workers/providers stay disabled and cleanup uses native Payload.
export async function testKnowledgeNative({page,base,owner,payload,pool}){
 const origin=new URL(base).origin;assert.ok(['localhost','127.0.0.1'].includes(new URL(origin).hostname));
 assert.equal(typeof pool?.query,'function','Use the parent-owned isolated browser database pool');const {activeAnswerRules}=await import('../src/modules/assistant/rules.ts');
 const viewport=page.viewportSize(),suffix=crypto.randomUUID(),title='Synthetic native knowledge '+suffix,ruleTitle='Synthetic native rule '+suffix;
 const knowledgeIds=[],articleIds=[],taxonomy=[];let anonymous;
 const local={user:owner,overrideAccess:false},ids=values=>(values||[]).map(value=>typeof value==='object'?value.id:value);
 const fits=async()=>assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true,'Native knowledge must fit the viewport');
 const save=async(label,id)=>{
  const result=page.waitForResponse(response=>new URL(response.url()).pathname==='/api/knowledge'+(id?'/'+id:'')&&response.request().method()===(id?'PATCH':'POST'));
  await page.getByRole('button',{name:label,exact:true}).click();const response=await result;assert.ok(response.ok(),await response.text());
  const value=await response.json(),doc=value.doc||value;assert.ok(doc.id,'A native save must return its document ID');if(!knowledgeIds.includes(doc.id))knowledgeIds.push(doc.id);
  await page.waitForURL(url=>url.pathname==='/admin/collections/knowledge/'+doc.id);
  try{await page.waitForFunction(()=>{const editor=document.querySelector('.collection-edit--knowledge [role="textbox"][aria-label="Nội dung bài viết"]');return editor?.getAttribute('contenteditable')==='true'&&editor.closest('form')?.getAttribute('data-form-ready')==='true';});}
  catch(error){console.error('Native knowledge form readiness',await page.evaluate(()=>{const editor=document.querySelector('.collection-edit--knowledge [role="textbox"][aria-label="Nội dung bài viết"]');return {path:location.pathname,editor:Boolean(editor),editable:editor?.getAttribute('contenteditable'),formReady:editor?.closest('form')?.getAttribute('data-form-ready'),titleDisabled:document.querySelector('#field-title')?.disabled};}));throw error;}
  return doc.id;
 };
 const choose=async(name,label)=>{await page.locator('#field-'+name).getByRole('combobox').fill(label);await page.getByRole('option',{name:label,exact:true}).click();};
 const appliedRule=async id=>({main:(await pool.query('SELECT entry_type,rule_enabled,body,_status,approved FROM knowledge WHERE id=$1',[id])).rows[0],active:(await activeAnswerRules('BOTH','Synthetic rule QA',pool)).find(rule=>rule.id===id)});
 try{
  await (await import('./test-answer-rules-editor.mjs')).testAnswerRulesEditor({page,base,owner,payload,pool});
  const category=await payload.create({collection:'categories',...local,data:{name:'Synthetic knowledge category '+suffix,slug:'knowledge-category-'+suffix}});taxonomy.push(['categories',category.id]);
  const tag=await payload.create({collection:'tags',...local,data:{name:'Synthetic knowledge tag '+suffix,slug:'knowledge-tag-'+suffix}});taxonomy.push(['tags',tag.id]);
  const mirrored=await payload.create({collection:'articles',...local,data:{title:'Synthetic mirrored article '+suffix,slug:'mirrored-knowledge-'+suffix,body:'Synthetic mirrored public article body.',language:'vi',jurisdiction:'BOTH',reviewState:'approved',aiAllowed:true,_status:'published'}});articleIds.push(mirrored.id);
  const mirror=await payload.find({collection:'knowledge',...local,where:{articleOrigin:{equals:mirrored.id}},limit:1,depth:0});assert.equal(mirror.totalDocs,1,'The article mirror must really exist before testing list visibility');
  await page.setViewportSize({width:1280,height:900});await page.goto(origin+'/admin/knowledge');await page.waitForURL(url=>url.pathname==='/admin/collections/knowledge');
  const list=page.locator('.collection-list--knowledge');await list.getByRole('heading',{name:'Kiến thức AI',exact:true}).waitFor();assert.equal(await page.locator('.lvd-knowledge-workspace').count(),0);
  assert.equal(await page.locator('.lvd-admin-navigation a[href="/admin/collections/knowledge"]').count(),1);await list.getByRole('button',{name:'Bộ lọc',exact:true}).waitFor();await list.getByRole('button',{name:'Hiển thị cột',exact:true}).waitFor();
  for(const column of ['Tiêu đề','Danh mục','Tag','Trạng thái','Ngày cập nhật'])assert.ok((await list.locator('thead').innerText()).includes(column),column);
  await list.locator('#search-filter-input').fill(mirrored.title);await page.waitForURL(url=>url.searchParams.get('search')===mirrored.title);await list.getByText('Không có kết quả.',{exact:true}).waitFor();assert.equal(await list.locator('tbody a[href="/admin/collections/knowledge/'+mirror.docs[0].id+'"]').count(),0,'Native knowledge list excludes the real mirrored article row');
  await page.goto(origin+'/admin/collections/knowledge');await page.screenshot({path:'test-results/cms-browser/knowledge-list-desktop.png'});await page.locator('a[href="/admin/collections/knowledge/create"]').first().click();
  await page.getByPlaceholder('Tiêu đề kiến thức',{exact:true}).fill(title);const rich=page.getByRole('textbox',{name:'Nội dung bài viết',exact:true});await rich.waitFor();
  await page.getByRole('button',{name:'HTML',exact:true}).click();await page.getByRole('textbox',{name:'Mã HTML nội dung bài viết',exact:true}).fill('<h2>Synthetic private heading</h2><p><strong>Synthetic private answer.</strong></p><p>Mandatory complete private condition.</p>');await page.getByRole('button',{name:'Trực quan',exact:true}).click();await rich.locator('strong').waitFor();
  await choose('categories',category.label||category.name);await choose('tags',tag.name);
  const id=await save('Lưu bản nháp');await page.waitForURL(url=>url.pathname==='/admin/collections/knowledge/'+id);
  let saved=await payload.findByID({collection:'knowledge',id,draft:true,depth:0,...local});assert.equal(saved._status,'draft');assert.equal(saved.approved,false);assert.deepEqual(ids(saved.categories),[category.id]);assert.deepEqual(ids(saved.tags),[tag.id]);assert.match(saved.body,/<strong>Synthetic private answer\.<\/strong>/);
  await page.reload();await rich.locator('h2').waitFor();assert.equal(await rich.locator('h2').innerText(),'Synthetic private heading');
  await save('Xuất bản',id);saved=await payload.findByID({collection:'knowledge',id,depth:0,...local});assert.equal(saved._status,'published');assert.equal(saved.approved,true);assert.equal(saved.reviewedBy,owner.id);
  const filters=new URLSearchParams({'where[and][0][title][equals]':title,'where[and][1][_status][equals]':'published','where[and][2][updatedAt][greater_than]':'2026-01-01T00:00:00Z','where[and][3][categories][in][0]':String(category.id)});
  await page.goto(origin+'/admin/collections/knowledge?'+filters);await list.locator('a[href="/admin/collections/knowledge/'+id+'"]').waitFor();assert.equal(await list.locator('tbody tr').count(),1,'Native status/date/category filters select the published fixture');
  await page.setViewportSize({width:390,height:844});await fits();await list.locator('a[href="/admin/collections/knowledge/'+id+'"]').click();await rich.locator('strong').waitFor();await fits();
  await page.screenshot({path:'test-results/cms-browser/knowledge-editor-mobile.png'});assert.equal(await page.locator('a[href^="/bai-viet/"]').count(),0,'Private knowledge has no public preview link');
  anonymous=await page.context().browser().newContext();const denied=await anonymous.request.get(origin+'/api/knowledge/'+id);assert.ok([401,403,404].includes(denied.status()));assert.ok(!(await denied.text()).includes('Mandatory complete private condition.'));
  await assert.rejects(payload.findByID({collection:'knowledge',id,user:{...owner,role:'member'},overrideAccess:false}),error=>[401,403,404].includes(error.status));
  const publicPage=await anonymous.request.get(origin+'/bai-viet/'+id);assert.equal(publicPage.status(),404);assert.ok(!(await publicPage.text()).includes('Synthetic private answer.'));
  // Native Save Draft stages a version; only Publish applies the chosen rule
  // checkbox/body to the main row read by the assistant.
  await page.setViewportSize({width:1280,height:900});await page.goto(origin+'/admin/collections/knowledge/create');await page.getByPlaceholder('Tiêu đề kiến thức',{exact:true}).fill(ruleTitle);
  await page.locator('#field-entryType').getByRole('combobox').click();await page.getByRole('option',{name:'Quy tắc trả lời',exact:true}).click();await rich.fill('Synthetic private response rule '+suffix);await page.getByRole('checkbox',{name:'Bật quy tắc',exact:true}).check();
  const ruleId=await save('Lưu bản nháp');let rule=await payload.findByID({collection:'knowledge',id:ruleId,draft:true,depth:0,...local});assert.equal(rule.entryType,'rule');assert.equal(rule.ruleEnabled,true,'The latest version retains the staged checkbox');
  let applied=await appliedRule(ruleId);assert.equal(applied.main.rule_enabled,false,'Saving a new rule draft never activates its staged checkbox');assert.equal(applied.active,undefined);
  await save('Xuất bản',ruleId);applied=await appliedRule(ruleId);assert.equal(applied.main.rule_enabled,true);assert.equal(applied.main._status,'draft');assert.equal(applied.main.approved,false);assert.equal(applied.active?.body,'Synthetic private response rule '+suffix);
  const enabledBody=applied.main.body,ruleURL=origin+'/admin/collections/knowledge?'+new URLSearchParams({'where[title][equals]':ruleTitle});
  await rich.fill('Synthetic edited private response rule '+suffix);await page.getByRole('checkbox',{name:'Bật quy tắc',exact:true}).uncheck();await save('Lưu bản nháp',ruleId);
  rule=await payload.findByID({collection:'knowledge',id:ruleId,draft:true,depth:0,...local});assert.equal(rule.ruleEnabled,false);applied=await appliedRule(ruleId);assert.equal(applied.main.rule_enabled,true,'Staging a disabled checkbox does not change the applied rule');assert.equal(applied.main.body,enabledBody);assert.equal(applied.active?.body,'Synthetic private response rule '+suffix);
  await page.goto(ruleURL);const ruleRow=list.locator('tbody tr').filter({hasText:ruleTitle});await ruleRow.getByText('Đã bật',{exact:true}).waitFor();assert.equal(await ruleRow.getByText('Đã bật',{exact:true}).getAttribute('title'),'Có thay đổi chưa áp dụng','List status reads the main flag and marks the pending draft');
  await ruleRow.locator('a[href="/admin/collections/knowledge/'+ruleId+'"]').click();await rich.waitFor();assert.equal(await page.getByRole('checkbox',{name:'Bật quy tắc',exact:true}).isChecked(),false);await save('Xuất bản',ruleId);
  applied=await appliedRule(ruleId);assert.equal(applied.main.rule_enabled,false);assert.equal(applied.active,undefined);assert.equal(applied.main._status,'draft');assert.equal(applied.main.approved,false);
  await page.goto(ruleURL);await ruleRow.getByText('Đang tắt',{exact:true}).waitFor();
  console.log('Native knowledge browser checks passed: legacy redirect, native list/search/filters, rich create/edit/draft/publish, category/tag, mirrored rows hidden, private access and explicit rules');
 }finally{
  await anonymous?.close();const discard=dialog=>dialog.accept();page.on('dialog',discard);try{await page.goto(origin+'/admin');}finally{page.off('dialog',discard);}
  const leftovers=await payload.find({collection:'knowledge',...local,draft:true,depth:0,where:{title:{in:[title,ruleTitle]}},limit:10});for(const doc of leftovers.docs)if(!knowledgeIds.includes(doc.id))knowledgeIds.push(doc.id);
  for(const id of knowledgeIds.reverse())await payload.delete({collection:'knowledge',id,...local});
  for(const id of articleIds.reverse())await payload.delete({collection:'articles',id,...local});
  for(const [collection,id] of taxonomy.reverse())await payload.delete({collection,id,...local});
  if(viewport)await page.setViewportSize(viewport);
 }
}
