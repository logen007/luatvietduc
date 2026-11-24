import test from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import {transformMediaImage} from '../src/modules/storage/image-edit.ts';
import {imageCrop,imageGeometry,imageEditBody,imagePreviewTransform,initialImageDraft,initialImageHistory,commitImageDraft,undoImageDraft,redoImageDraft} from '../src/modules/storage/image-editor-model.ts';
test('crop uses current natural pixels before rotation, flips and proportional scale',()=>{
 const draft={...initialImageDraft(),crop:{left:20,top:10,width:120,height:80},rotate:90,flipHorizontal:true,scale:.5};
 assert.deepEqual(imageGeometry(200,100,draft),{crop:draft.crop,width:80,height:120,outputWidth:40,outputHeight:60});
 assert.deepEqual(imageEditBody('revision',200,100,draft),{updatedAt:'revision',operation:'edit',rotate:90,flipHorizontal:true,flipVertical:false,crop:draft.crop,width:40,height:60});
 assert.equal(imagePreviewTransform(200,100,draft),'translate(40 60) scale(-1 1) rotate(90) translate(-60 -40)');
});
test('crop stays inside the source and resize never enlarges or makes zero-sized images',()=>{
 assert.deepEqual(imageCrop(200,100,{left:190,top:-10,width:50,height:200}),{left:190,top:0,width:10,height:100});
 for(const scale of [0,.001,2]){const out=imageGeometry(3,2,{...initialImageDraft(),scale});assert.ok(out.outputWidth>=1&&out.outputWidth<=3);assert.ok(out.outputHeight>=1&&out.outputHeight<=2);}
 assert.deepEqual(imageEditBody('revision',200,100,{...initialImageDraft(),crop:{left:0,top:0,width:200,height:100}}),{updatedAt:'revision',operation:'edit',rotate:0,flipHorizontal:false,flipVertical:false});
});
test('undo and redo retain every edit and a new edit discards the redo branch',()=>{
 let history=initialImageHistory();history=commitImageDraft(history,{...history.present,rotate:90});history=commitImageDraft(history,{...history.present,flipVertical:true});
 history=undoImageDraft(history);assert.equal(history.present.rotate,90);assert.equal(history.present.flipVertical,false);
 history=redoImageDraft(history);assert.equal(history.present.flipVertical,true);
 history=undoImageDraft(history);history=commitImageDraft(history,{...history.present,scale:.5});assert.equal(history.future.length,0);assert.equal(history.present.scale,.5);
});
test('proportional editor resize survives integer rounding on wide and rotated images',async()=>{
 const source=await sharp({create:{width:400,height:100,channels:3,background:'#888'}}).png().toBuffer();
 for(const [scale,rotate] of [[102/400,0],[26/100,0],[26/100,90]]){
  const edit=imageEditBody('2026-11-06T00:00:00Z',400,100,{...initialImageDraft(),scale,rotate});
  const saved=await transformMediaImage(source,'image/png',edit);
  assert.deepEqual([saved.width,saved.height],[edit.width,edit.height],'Saved dimensions match the proportional preview');
 }
 await assert.rejects(()=>transformMediaImage(source,'image/png',{operation:'edit',updatedAt:'2026-11-06T00:00:00Z',width:102,height:30}),{status:400},'An actually distorted resize remains invalid');
});
test('a width change followed by crop retains its scale and saves the exact rounded preview',async()=>{
 const source=await sharp({create:{width:400,height:400,channels:3,background:'#888'}}).png().toBuffer();
 const widthDraft={...initialImageDraft(),scale:256/400},draft={...widthDraft,crop:{left:0,top:0,width:104,height:107}};
 const edit=imageEditBody('2026-11-06T00:00:00Z',400,400,draft);assert.deepEqual([edit.width,edit.height],[67,68]);
 const saved=await transformMediaImage(source,'image/png',edit);assert.deepEqual([saved.width,saved.height],[67,68]);
});
test('one-pixel proportional previews stay nonzero while incompatible shapes stay invalid',async()=>{
 const source=await sharp({create:{width:400,height:3,channels:3,background:'#888'}}).png().toBuffer();
 const edit=imageEditBody('2026-11-06T00:00:00Z',400,3,{...initialImageDraft(),scale:1/400});
 const saved=await transformMediaImage(source,'image/png',edit);assert.deepEqual([saved.width,saved.height],[1,1]);
 await assert.rejects(()=>transformMediaImage(source,'image/png',{...edit,width:1,height:3}),{status:400});
});
test('varied aspect ratios and editor scale fractions save the displayed integer dimensions',async()=>{
 for(const [width,height] of [[400,100],[104,107],[37,113],[1,30],[30,1]]){
  const source=await sharp({create:{width,height,channels:3,background:'#888'}}).png().toBuffer();
  for(const scale of [.01,.13,.5,.64,.9]){
   const edit=imageEditBody('2026-11-06T00:00:00Z',width,height,{...initialImageDraft(),scale});
   const saved=await transformMediaImage(source,'image/png',edit);assert.deepEqual([saved.width,saved.height],[edit.width,edit.height],`${width}×${height} at ${scale}`);
  }
 }
});
