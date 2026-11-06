import assert from 'node:assert/strict';
import {encodeCSV} from '../src/modules/content/article-csv.ts';
export async function testArticleImportBrowser(context,base,payload,owner){
 const page=await context.newPage();page.setDefaultTimeout(15000);const slug='csv-browser-'+crypto.randomUUID();
 try{
  await page.setViewportSize({width:390,height:844});await page.goto(base+'/admin/collections/articles');await page.getByRole('link',{name:'CSV mẫu',exact:true}).waitFor();await page.getByRole('link',{name:'Nhập CSV',exact:true}).last().click();await page.getByRole('heading',{name:'Nhập bài viết',exact:true}).waitFor();
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Import form fits mobile viewport');
  const sample=await page.evaluate(async()=>{const response=await fetch('/service/article-import');return {status:response.status,type:response.headers.get('content-type'),csv:await response.text()};});assert.equal(sample.status,200);assert.match(sample.type,/text\/csv/);assert.match(sample.csv,/ai_allowed/);assert.match(sample.csv,/vietnam/);assert.match(sample.csv,/germany/);
  const input=page.locator('input[type=file]'),check=page.getByRole('button',{name:'Kiểm tra tệp',exact:true});
  const upload=async csv=>{if(!await input.count()){if(await page.getByRole('button',{name:'Quay lại',exact:true}).count())await page.getByRole('button',{name:'Quay lại',exact:true}).click();else await page.goto(base+'/admin/articles/import');}await input.setInputFiles({name:'bai-viet.csv',mimeType:'text/csv',buffer:Buffer.from(csv)});await page.getByRole('button',{name:'Tiếp tục',exact:true}).click();};
  await upload(encodeCSV([['title','slug','body','categories'],['CSV browser',slug,'Nội dung mẫu','category-does-not-exist']]));await check.click();await page.getByText('Danh mục không tồn tại hoặc trùng tên:',{exact:false}).waitFor();assert.equal(await page.getByRole('button',{name:'Nhập 0 bài',exact:true}).isDisabled(),true);
  await page.route('**/service/me',route=>route.fulfill({json:{user:{id:owner.id+100000,name:'Another staff member',role:'support',jurisdictions:['VN','DE']},connections:{}}}));
  await page.evaluate(()=>document.dispatchEvent(new Event('lvd:sessionchange')));
  await page.waitForFunction(()=>!document.querySelector('.lvd-csv-table')&&document.querySelector('.lvd-csv-toolbar button')?.disabled&&document.querySelector('input[type=file]')?.value==='');
  await page.unroute('**/service/me');await page.evaluate(()=>document.dispatchEvent(new Event('lvd:sessionchange')));await page.waitForTimeout(250);
  const csv=encodeCSV([['headline','permalink','description','unused'],['CSV browser',slug,'Nội dung tiếng Việt\nnhiều dòng, có dấu phẩy.','Ignore this field']]);
  await upload(csv);await page.getByRole('combobox',{name:'Ghép cột headline',exact:true}).selectOption('title');await page.getByRole('combobox',{name:'Ghép cột description',exact:true}).selectOption('body');await check.click();await page.getByText('Sẵn sàng',{exact:true}).waitFor();await page.getByRole('button',{name:'Nhập 1 bài',exact:true}).click();await page.getByRole('heading',{name:'Đã nhập 1 bài viết',exact:true}).waitFor();
  await upload(csv);await page.getByRole('combobox',{name:'Ghép cột headline',exact:true}).selectOption('title');await page.getByRole('combobox',{name:'Ghép cột description',exact:true}).selectOption('body');await check.click();await page.getByText('Bỏ qua: đã có permalink',{exact:true}).waitFor();assert.equal(await page.getByRole('button',{name:'Nhập 0 bài',exact:true}).isDisabled(),true);
  const docs=await payload.find({collection:'articles',draft:true,where:{slug:{equals:slug}},user:owner,overrideAccess:false});assert.equal(docs.totalDocs,1);assert.equal(docs.docs[0]._status,'draft');
  console.log('Article import browser checks passed: mobile layout, live CSV demo, row errors, preview, create draft, duplicate skip and no overwrite.');
 }finally{await page.close();const docs=await payload.find({collection:'articles',draft:true,where:{slug:{equals:slug}},user:owner,overrideAccess:false});for(const doc of docs.docs)await payload.delete({collection:'articles',id:doc.id,user:owner,overrideAccess:false});}
}
