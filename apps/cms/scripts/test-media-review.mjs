import assert from 'node:assert/strict';

// Synthetic metadata only. The caller owns the local browser/server/database;
// inherited routes continue to intercept the synthetic files and deny providers.
export async function testMediaReview({page,base,pool,owner,ids,suffix}){
 const database=new URL(process.env.DATABASE_URL||'');
 if(!['localhost','127.0.0.1'].includes(new URL(base).hostname)||!['localhost','127.0.0.1'].includes(database.hostname)||database.pathname!=='/lvd_test')throw new Error('Isolated browser database only');
 assert.ok(Number.isSafeInteger(owner?.id)&&Array.isArray(ids)&&ids.every(Number.isSafeInteger));
 const original=(await pool.query("SELECT id,title,alt,caption,description,visibility FROM media WHERE id=ANY($1::integer[]) AND mime_type LIKE 'image/%' AND filename LIKE $2 ORDER BY id LIMIT 1",[ids,'synthetic-media-'+suffix+'-%'])).rows[0];
 assert.ok(original,'A synthetic image fixture is required');
 const endpoint=base+'/api/media/'+original.id,match='Synthetic review match '+suffix,caption='Synthetic pending caption '+suffix,conflict='Synthetic media conflict',failedTitle='Synthetic rejected title '+suffix;
 let releaseFirst,patches=0,phase='hold';
 const held=new Promise(resolve=>{releaseFirst=resolve;}),inFlight=new Set();
 const handler=route=>{
  const task=(async()=>{
   if(route.request().method()!=='PATCH')return route.fallback();
   if(phase==='conflict')return route.fulfill({status:409,json:{errors:[{message:conflict}]}});
   if(++patches===1)await held;
   // Forward the original method, body and cookies to the actual local API.
   const response=await route.fetch({maxRedirects:0,timeout:12000});await route.fulfill({response});
  })();
  inFlight.add(task);void task.then(()=>inFlight.delete(task),()=>inFlight.delete(task));return task;
 };
 const dialog=page.locator('.lvd-media-details'),close=page.getByRole('button',{name:'Đóng chi tiết tệp',exact:true});
 const isPatch=response=>response.url()===endpoint&&response.request().method()==='PATCH';
 const confirm=async(action,accept)=>Promise.all([page.waitForEvent('dialog').then(async prompt=>{assert.equal(prompt.type(),'confirm');await (accept?prompt.accept():prompt.dismiss());}),action()]);
 try{
  await pool.query('UPDATE media SET alt=$2 WHERE id=$1',[original.id,match]);
  await page.goto(base+'/admin/collections/media');await page.locator('.lvd-media-grid').waitFor();
  await page.getByRole('searchbox',{name:'Tìm tệp',exact:true}).fill(match);
  await page.waitForFunction(()=>document.querySelectorAll('.lvd-media-grid .lvd-media-tile').length===1);
  await page.locator('.lvd-media-grid a[href="/admin/collections/media/'+original.id+'"]').click();
  const alt=page.getByRole('textbox',{name:'Văn bản thay thế',exact:true}),captionField=page.getByRole('textbox',{name:'Chú thích',exact:true});await alt.waitFor();
  await page.route(endpoint,handler);
  const firstRequest=page.waitForRequest(request=>request.url()===endpoint&&request.method()==='PATCH');
  await alt.fill('Synthetic changed alt '+suffix);const request=await firstRequest;
  await captionField.fill(caption);assert.notEqual(request.postDataJSON().caption,caption,'The pending caption was typed after the first save snapshot');
  const firstResponse=page.waitForResponse(isPatch),laterResponse=page.waitForResponse(response=>isPatch(response)&&response.request().postDataJSON().caption===caption);
  releaseFirst();assert.ok((await firstResponse).ok());assert.ok((await laterResponse).ok());
  await page.waitForFunction(()=>document.querySelector('.lvd-media-detail-state')?.textContent==='Đã lưu');
  assert.ok(await dialog.isVisible(),'Losing the search match must not unmount the active dialog');assert.equal(await captionField.inputValue(),caption);
  assert.equal((await pool.query('SELECT caption FROM media WHERE id=$1',[original.id])).rows[0].caption,caption,'The later autosave persists the pending caption');
  await close.click();await dialog.waitFor({state:'detached'});
  await page.waitForFunction(()=>document.querySelectorAll('.lvd-media-grid .lvd-media-tile').length===0);
  assert.equal(await page.getByRole('searchbox',{name:'Tìm tệp',exact:true}).inputValue(),match,'Closing refreshes the existing search');

  phase='conflict';await page.goto(base+'/admin/collections/media');await page.locator('.lvd-media-grid').waitFor();
  await page.locator('.lvd-media-grid a[href="/admin/collections/media/'+original.id+'"]').click();
  const title=page.getByRole('textbox',{name:'Tiêu đề tệp',exact:true});await title.waitFor();
  const savedTitle=(await pool.query('SELECT title FROM media WHERE id=$1',[original.id])).rows[0].title;
  await title.fill(failedTitle);await dialog.getByRole('alert').filter({hasText:conflict}).waitFor();
  assert.equal(await title.inputValue(),failedTitle,'A failed save retains the draft');
  await confirm(()=>close.click(),false);assert.ok(await dialog.isVisible());assert.equal(await title.inputValue(),failedTitle,'Cancelling discard retains the draft');
  await confirm(()=>page.keyboard.press('Escape'),true);await dialog.waitFor({state:'detached'});
  assert.equal((await pool.query('SELECT title FROM media WHERE id=$1',[original.id])).rows[0].title,savedTitle,'Explicit discard does not persist the rejected draft');
  console.log('Media review checks passed: filtered autosave retains newer drafts, close refreshes, conflict preserves drafts and cancelled/confirmed discard behaves correctly');
 }finally{
  releaseFirst();
  const accept=prompt=>void prompt.accept();page.on('dialog',accept);
  try{
   try{await page.goto(base+'/admin/collections/media');}finally{
    await Promise.allSettled([...inFlight]);await page.unroute(endpoint,handler);
    await pool.query('UPDATE media SET title=$2,alt=$3,caption=$4,description=$5,visibility=$6,updated_at=clock_timestamp() WHERE id=$1',[original.id,original.title,original.alt,original.caption,original.description,original.visibility]);
   }
   await page.goto(base+'/admin/collections/media');await page.locator('.lvd-media-grid').waitFor();
  }finally{page.off('dialog',accept);}
 }
}
