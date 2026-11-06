import assert from 'node:assert/strict';
export async function testAnswerRulesEditor({page,base,owner,payload,pool}){
 const origin=new URL(base).origin;assert.ok(['localhost','127.0.0.1'].includes(new URL(origin).hostname));
 const viewport=page.viewportSize(),source='https://luatvietduc.com/admin/knowledge/rules#voice';
 const text='SYNTHETIC BROWSER POLICY: hỏi từng ý, không lặp '+crypto.randomUUID();
 try{
  await page.goto(origin+'/admin/knowledge/rules');
  await page.getByRole('heading',{name:'Quy tắc trả lời',exact:true}).waitFor();
  const section=page.locator('.lvd-answer-rule').filter({has:page.getByRole('heading',{name:'Cách trò chuyện',exact:true})});
  await section.getByRole('textbox').waitFor();assert.equal(await page.locator('.lvd-answer-rules textarea').count(),4);
  await page.setViewportSize({width:390,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true);
  await section.getByRole('textbox').fill(text);await section.getByRole('button',{name:'Lưu thay đổi',exact:true}).click();await section.getByRole('status').filter({hasText:'Đã lưu và áp dụng.'}).waitFor();
  const rows=(await pool.query('SELECT id,body,rule_enabled FROM knowledge WHERE source_url=$1',[source])).rows;assert.equal(rows.length,1);assert.equal(rows[0].body,text);assert.equal(rows[0].rule_enabled,true);
  await page.reload();await section.getByRole('textbox').waitFor();assert.equal(await section.getByRole('textbox').inputValue(),text);
  const staged=text+' BẢN NHÁP';await payload.update({collection:'knowledge',id:rows[0].id,user:owner,overrideAccess:false,draft:true,data:{body:staged,ruleEnabled:true}});
  await page.reload();await section.getByRole('status').filter({hasText:'Có bản nháp chưa áp dụng.'}).waitFor();assert.equal(await section.getByRole('textbox').inputValue(),staged);assert.equal(await section.getByRole('button',{name:'Lưu thay đổi',exact:true}).isEnabled(),true);
  assert.equal((await pool.query('SELECT body FROM knowledge WHERE source_url=$1',[source])).rows[0].body,text);
  await section.getByRole('button',{name:'Lưu thay đổi',exact:true}).click();await section.getByRole('status').filter({hasText:'Đã lưu và áp dụng.'}).waitFor();assert.equal((await pool.query('SELECT body FROM knowledge WHERE source_url=$1',[source])).rows[0].body,staged);
  await section.getByRole('checkbox',{name:'Bật',exact:true}).uncheck();await section.getByRole('button',{name:'Lưu thay đổi',exact:true}).click();await section.getByRole('status').filter({hasText:'Đã lưu và tắt quy tắc.'}).waitFor();
  assert.equal((await pool.query('SELECT rule_enabled FROM knowledge WHERE source_url=$1',[source])).rows[0].rule_enabled,false);
  await section.getByRole('button',{name:'Dùng mặc định',exact:true}).click();assert.notEqual(await section.getByRole('textbox').inputValue(),text);assert.equal(await section.getByRole('checkbox',{name:'Bật',exact:true}).isChecked(),true);
  page.once('dialog',dialog=>dialog.accept());await page.goto(origin+'/admin');
  console.log('Answer rules browser passed: desktop/mobile route, four editable policies, save/apply, reload, disable, explicit unsaved reset and no overflow.');
 }finally{
  const rows=(await pool.query('SELECT id FROM knowledge WHERE source_url=$1',[source])).rows;
  for(const row of rows)await payload.delete({collection:'knowledge',id:row.id,user:owner,overrideAccess:false});
  if(viewport)await page.setViewportSize(viewport);
 }
}
