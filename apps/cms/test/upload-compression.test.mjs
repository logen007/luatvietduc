import {test} from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import {compressUpload,compressMediaUpload} from '../src/modules/storage/compress-upload.ts';
test('compression reduces redundant bytes while preserving document pixels and dimensions',async()=>{
 const source=await sharp({create:{width:320,height:240,channels:4,background:'#f0f0f0'}}).png({compressionLevel:0}).toBuffer();
 const output=await compressUpload(source,'image/png');assert.ok(output.length<source.length/2);
 assert.deepEqual(await sharp(output).raw().toBuffer(),await sharp(source).raw().toBuffer());
 const meta=await sharp(output).metadata();assert.equal(meta.width,320);assert.equal(meta.height,240);
 assert.ok((await compressUpload(output,'image/png')).length<=output.length);
});
test('documents and unreadable images retain original bytes',async()=>{
 for(const mime of ['application/pdf','application/vnd.openxmlformats-officedocument.wordprocessingml.document','image/svg+xml','image/png','image/webp','image/jpeg','video/mp4','video/webm']){
  const source=Buffer.from('synthetic invalid data');assert.strictEqual(await compressUpload(source,mime),source);
 }
});
test('media hook updates bytes and size together without changing name or MIME',async()=>{
 const data=await sharp({create:{width:100,height:100,channels:3,background:'white'}}).png({compressionLevel:0}).toBuffer();
 const args={req:{user:{role:'support'},file:{data,size:data.length,name:'document.png',mimetype:'image/png'}},overrideAccess:false};
 assert.equal(await compressMediaUpload({operation:'create',args}),args);
 assert.ok(args.req.file.size<data.length);assert.equal(args.req.file.size,args.req.file.data.length);assert.equal(args.req.file.name,'document.png');assert.equal(args.req.file.mimetype,'image/png');
 const denied={req:{file:{data,size:data.length,name:'document.png',mimetype:'image/png'}},overrideAccess:false};
 await compressMediaUpload({operation:'create',args:denied});assert.strictEqual(denied.req.file.data,data);
});

test('video optimization keeps duration and frames; discards redundant container padding',async t=>{
 const {execFileSync}=await import('node:child_process');const fs=await import('node:fs/promises');const os=await import('node:os');const path=await import('node:path');
 try{execFileSync('ffmpeg',['-version'],{stdio:'ignore'});execFileSync('ffprobe',['-version'],{stdio:'ignore'});}catch{t.skip('Encoder binaries are verified by the reviewed candidate check');return;}
 const directory=await fs.mkdtemp(path.join(os.tmpdir(),'lvd-compression-test-'));
 try{
  const file=path.join(directory,'video.mp4');
  execFileSync('ffmpeg',['-nostdin','-v','error','-f','lavfi','-i','color=c=white:s=160x96:r=5','-t','1','-c:v','libx264','-crf','0','-threads','1','-y',file],{timeout:10000});
  const free=Buffer.alloc(100000);free.writeUInt32BE(free.length);free.write('free',4);
  const original=Buffer.concat([await fs.readFile(file),free]);const output=await compressUpload(original,'video/mp4');
  assert.ok(output.length<original.length/2);const out=path.join(directory,'optimized.mp4');await fs.writeFile(out,output);
  const probe=name=>JSON.parse(execFileSync('ffprobe',['-v','error','-show_entries','format=duration:stream=width,height,nb_frames','-of','json',name]));
  const padded=path.join(directory,'padded.mp4');await fs.writeFile(padded,original);assert.deepEqual(probe(out),probe(padded));
  const frames=name=>execFileSync('ffmpeg',['-v','error','-i',name,'-f','rawvideo','-pix_fmt','rgb24','-'],{maxBuffer:5*1024*1024});assert.deepEqual(frames(out),frames(padded));
 }finally{await fs.rm(directory,{recursive:true,force:true});}
});
