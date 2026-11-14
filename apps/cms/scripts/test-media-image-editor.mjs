import assert from 'node:assert/strict';
import sharp from 'sharp';

// The caller supplies one real synthetic uploaded-image row. All image bytes
// and transform responses below are local browser fixtures, with no R2 calls.
export async function testMediaImageEditor({page,base,image,inspectActions}){
 assert.ok(image?.id&&image.filename,'An existing synthetic image record is required');
 const origin=new URL(base).origin;assert.ok(['127.0.0.1','localhost'].includes(new URL(origin).hostname));
 const returnUrl=page.url(),viewport=page.viewportSize(),prefix='/__lvd-image-editor-fixture/'+image.id;
 const sourceBytes=await sharp({create:{width:240,height:160,channels:3,background:'#b9c5ce'}}).png().toBuffer();let editedBytes=sourceBytes;
 let doc={...image,mimeType:'image/png',width:240,height:160,url:prefix+'/source.png',originalImageURL:undefined},requests=[],failNext=false,malformedNext=false,failPreview=false,releaseFirst,fixtureFailure;
 const firstGate=new Promise(resolve=>{releaseFirst=resolve;});
 const assetPattern=origin+prefix+'/*',filePattern=origin+'/api/media/file/'+encodeURIComponent(image.filename)+'*';
 const metadataPattern=new RegExp('/api/media/'+image.id+'(?:\\?|$)'),operationPattern=origin+'/service/media/image/'+image.id;
 const assetRoute=route=>failPreview?route.fulfill({status:404,body:'Synthetic preview missing'}):route.fulfill({contentType:'image/png',body:route.request().url().includes('/edited.png')?editedBytes:sourceBytes});
 const metadataRoute=route=>route.request().method()==='GET'?route.fulfill({json:doc}):route.fallback();
 const operationRoute=async route=>{
  try{
  assert.equal(route.request().method(),'POST');const body=route.request().postDataJSON();requests.push(body);
  assert.equal(body.updatedAt,doc.updatedAt,'Every image operation uses the last confirmed revision');
  if(requests.length===1)await firstGate;
  if(malformedNext){malformedNext=false;return await route.fulfill({json:{}});}
  if(failNext){failNext=false;return await route.fulfill({status:503,json:{error:'Synthetic image save unavailable'}});}
  let width=240,height=160;
  if(body.operation==='edit'){
   const crop=body.crop||{width:doc.width,height:doc.height};width=body.rotate===90||body.rotate===270?crop.height:crop.width;height=body.rotate===90||body.rotate===270?crop.width:crop.height;
   if(body.width)width=body.width;if(body.height)height=body.height;
   editedBytes=await sharp({create:{width,height,channels:3,background:'#b9c5ce'}}).png().toBuffer();
  }else assert.equal(body.operation,'restore');
  doc={...doc,width,height,url:prefix+(body.operation==='restore'?'/source.png':'/edited.png')+'?revision='+requests.length,updatedAt:new Date(Date.parse(image.updatedAt)+requests.length*1000).toISOString(),originalImageURL:'/service/media/image/'+image.id};
  return await route.fulfill({json:{doc}});
  }catch(error){fixtureFailure??=error;await route.fulfill({status:500,json:{error:'Synthetic image fixture failed'}}).catch(()=>{});}
 };
 const editor=()=>page.locator('.lvd-image-editor');
 const open=async()=>{await page.locator('.lvd-media-image-tools').getByRole('button',{name:'Chỉnh sửa ảnh',exact:true}).click();await editor().waitFor({state:'visible'});};
 try{
  await page.route(assetPattern,assetRoute);await page.route(filePattern,assetRoute);await page.route(metadataPattern,metadataRoute);await page.route(operationPattern,operationRoute);
  await page.goto(origin+'/admin/collections/media/'+image.id);await open();await inspectActions?.(editor());
  await editor().getByRole('button',{name:'Xoay phải',exact:true}).click();await editor().getByRole('button',{name:'Lật ngang',exact:true}).click();
  await editor().getByLabel('Vùng cắt: X',{exact:true}).fill('20');await editor().getByLabel('Vùng cắt: Y',{exact:true}).fill('10');
  await editor().getByLabel('Vùng cắt: Chiều rộng',{exact:true}).fill('120');await editor().getByLabel('Vùng cắt: Chiều cao',{exact:true}).fill('80');
  await editor().getByLabel('Chiều rộng ảnh sau khi lưu',{exact:true}).fill('40');
  assert.equal(await editor().getByLabel('Chiều cao ảnh sau khi lưu',{exact:true}).inputValue(),'60');
  await editor().getByRole('button',{name:'Hoàn tác',exact:true}).click();assert.equal(await editor().getByLabel('Chiều rộng ảnh sau khi lưu',{exact:true}).inputValue(),'80');
  await editor().getByRole('button',{name:'Làm lại',exact:true}).click();assert.equal(await editor().getByLabel('Chiều rộng ảnh sau khi lưu',{exact:true}).inputValue(),'40');
  await editor().getByRole('button',{name:'Chọn vùng cắt',exact:true}).click();await editor().getByRole('img',{name:'Kéo để chọn vùng cắt',exact:true}).waitFor();
  await editor().getByRole('button',{name:'Xem kết quả',exact:true}).click();
  const requested=page.waitForRequest(request=>request.url()===operationPattern&&request.method()==='POST');
  await editor().getByRole('button',{name:'Lưu ảnh',exact:true}).click();await requested;
  await editor().getByText('Đang lưu ảnh…',{exact:true}).waitFor();assert.equal(await editor().getByRole('button',{name:'Lưu ảnh',exact:true}).isDisabled(),true);
  assert.deepEqual(requests[0],{updatedAt:image.updatedAt,operation:'edit',rotate:90,flipHorizontal:true,flipVertical:false,crop:{left:20,top:10,width:120,height:80},width:40,height:60});
  releaseFirst();await editor().waitFor({state:'detached'});

  await open();await editor().getByRole('button',{name:'Xoay trái',exact:true}).click();const beforeCancel=requests.length;
  await editor().getByRole('button',{name:'Hủy',exact:true}).click();await page.locator('.lvd-confirm-dialog[open]').getByRole('button',{name:'Bỏ thay đổi',exact:true}).click();await editor().waitFor({state:'detached'});assert.equal(requests.length,beforeCancel,'Cancel never writes an image draft');

  await open();await editor().getByRole('button',{name:'Khôi phục ảnh gốc',exact:true}).click();await page.locator('.lvd-confirm-dialog[open]').getByRole('button',{name:'Khôi phục',exact:true}).click();await editor().waitFor({state:'detached'});
  assert.deepEqual(Object.keys(requests.at(-1)).sort(),['operation','updatedAt']);assert.equal(requests.at(-1).operation,'restore');

  // Recovery reads the preserved original on the server, never the broken
  // browser preview. Geometry edits remain blocked until an image loads.
  failPreview=true;await open();await editor().getByRole('alert').filter({hasText:'Chưa tải được ảnh.'}).waitFor();
  assert.equal(await editor().getByRole('button',{name:'Lưu ảnh',exact:true}).isDisabled(),true);
  assert.equal(await editor().getByRole('button',{name:'Khôi phục ảnh gốc',exact:true}).isEnabled(),true);
  failPreview=false;await editor().getByRole('button',{name:'Khôi phục ảnh gốc',exact:true}).click();await page.locator('.lvd-confirm-dialog[open]').getByRole('button',{name:'Khôi phục',exact:true}).click();await editor().waitFor({state:'detached'});
  assert.deepEqual(Object.keys(requests.at(-1)).sort(),['operation','updatedAt']);assert.equal(requests.at(-1).operation,'restore');

  await page.setViewportSize({width:390,height:844});await open();await editor().getByRole('button',{name:'Lật dọc',exact:true}).click();
  assert.ok(await editor().evaluate(element=>{const box=element.getBoundingClientRect();return box.left>=0&&box.right<=innerWidth&&element.scrollWidth<=element.clientWidth;}),'Image editing fits a phone viewport');
  malformedNext=true;await editor().getByRole('button',{name:'Lưu ảnh',exact:true}).click();await editor().getByRole('alert').filter({hasText:'Chưa xác nhận được tệp đã lưu.'}).waitFor();assert.equal(await editor().getByRole('button',{name:'Lật dọc',exact:true}).getAttribute('aria-pressed'),'true','Malformed save acknowledgement preserves image draft');
  failNext=true;await editor().getByRole('button',{name:'Lưu ảnh',exact:true}).click();await editor().getByText('Synthetic image save unavailable',{exact:true}).waitFor();
  assert.equal(await editor().getByRole('button',{name:'Lật dọc',exact:true}).getAttribute('aria-pressed'),'true','A failed save retains the image draft');
  await editor().getByRole('button',{name:'Lưu ảnh',exact:true}).click();await editor().waitFor({state:'detached'});
  assert.deepEqual(requests.at(-1),requests.at(-2),'Retry uses the same confirmed revision and image draft');
  if(fixtureFailure)throw fixtureFailure;
  console.log('Media image editor browser checks passed: crop/rotate/flip/scale, undo/redo, cancel, loading, restore and failed-save retry');
 }catch(error){throw fixtureFailure||error;}finally{
  const discardFixture=dialog=>{void dialog.accept().catch(()=>{});};page.on('dialog',discardFixture);
  try{
   releaseFirst();await page.unroute(assetPattern,assetRoute);await page.unroute(filePattern,assetRoute);await page.unroute(metadataPattern,metadataRoute);await page.unroute(operationPattern,operationRoute);
   if(viewport)await page.setViewportSize(viewport);await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));await page.goto(returnUrl);
  }finally{page.off('dialog',discardFixture);}
 }
}
