import assert from 'node:assert/strict';

// Runs only inside the isolated CMS browser harness. No real file is uploaded.
export async function testArticleMediaRace({page, base, pool, suffix, mediaFixtureIds}) {
 const filename='synthetic-editor-race-'+suffix+'.png';
 const row=(await pool.query("INSERT INTO media(alt,filename,mime_type,filesize,visibility) VALUES($1,$2,'image/png',120,'public') RETURNING id",['Synthetic editor race',filename])).rows[0];
 mediaFixtureIds.push(row.id);
 const metadataURL=url=>url.origin===base&&url.pathname==='/api/media/'+row.id&&url.searchParams.get('depth')==='0';
 let heldRead;
 const holdRead=route=>{heldRead=route;};
 await page.route(metadataURL,holdRead);
 try {
  await page.getByRole('button',{name:'Thêm tệp',exact:true}).click();
  const drawer=page.locator('.drawer:visible').last();
  await drawer.getByText(filename,{exact:true}).click();
  await page.waitForFunction(()=>document.querySelector('.lvd-editor-media')?.textContent.includes('Đang chèn'));
  assert.ok(heldRead,'Metadata read actually started');
  await drawer.locator('.drawer__close').click();
  await page.getByRole('button',{name:'HTML',exact:true}).click();
  const html=page.getByRole('textbox',{name:'Mã HTML nội dung bài viết',exact:true});
  const newer='<p>New HTML typed while selected media metadata is loading.</p>';
  await html.fill(newer);
  await heldRead.fulfill({json:{id:row.id,visibility:'public',url:'/media/'+filename,mimeType:'image/png',filename}});
  await page.getByText('Nội dung đã thay đổi. Chọn lại tệp để chèn vào bản đang sửa.',{exact:true}).waitFor();
  assert.equal(await html.inputValue(),newer);
  assert.equal(await page.locator('#field-body').inputValue(),'<div data-lvd-richtext="1">'+newer+'</div>','Late media metadata must preserve the newer canonical draft');
  await page.getByRole('button',{name:'Trực quan',exact:true}).click();
  assert.equal(await page.getByRole('textbox',{name:'Nội dung bài viết',exact:true}).innerText(),'New HTML typed while selected media metadata is loading.');
  // Switching modes without typing must also reject insertion: otherwise the
  // hidden visual document changes while HTML still shows its stale snapshot.
  heldRead=undefined;
  const beforeModeSwitch=await page.locator('#field-body').inputValue();
  await page.getByRole('button',{name:'Thêm tệp',exact:true}).click();
  await drawer.getByText(filename,{exact:true}).click();
  await page.waitForFunction(()=>document.querySelector('.lvd-editor-media')?.textContent.includes('Đang chèn'));
  assert.ok(heldRead,'Second metadata read actually started');
  await drawer.locator('.drawer__close').click();
  await page.getByRole('button',{name:'HTML',exact:true}).click();
  const beforeHTML=await html.inputValue();
  await heldRead.fulfill({json:{id:row.id,visibility:'public',url:'/media/'+filename,mimeType:'image/png',filename}});
  await page.getByText('Chuyển về Trực quan rồi chọn lại tệp để chèn.',{exact:true}).waitFor();
  assert.equal(await html.inputValue(),beforeHTML,'HTML stays intact when only the editing mode changed');
  assert.equal(await page.locator('#field-body').inputValue(),beforeModeSwitch,'Mode switching never inserts into a hidden visual document');
  await page.getByRole('button',{name:'Trực quan',exact:true}).click();
  assert.equal(await page.getByRole('textbox',{name:'Nội dung bài viết',exact:true}).locator('img').count(),0);
 } finally {
  await heldRead?.abort().catch(()=>{});
  await page.unroute(metadataURL,holdRead);
 }
}
