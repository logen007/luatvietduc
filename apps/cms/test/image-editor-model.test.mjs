import test from 'node:test';
import assert from 'node:assert/strict';
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
