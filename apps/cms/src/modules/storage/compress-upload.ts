import sharp from 'sharp';
import {spawn,execFile} from 'node:child_process';
import {promisify} from 'node:util';
const execute=promisify(execFile);
async function probe(file:string){const {stdout}=await execute('ffprobe',['-v','error','-show_entries','format=duration:stream=codec_type,width,height,nb_frames','-of','json',file],{timeout:5000,maxBuffer:65536});return JSON.parse(stdout);}
import {mkdtemp,writeFile,readFile,rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import type {CollectionBeforeOperationHook} from 'payload';

// Lossless only: documents, image pixels, dimensions, audio and frame rate
// must survive uploading. Encoded files are adopted only when smaller.
const formats:Record<string,string>={'image/jpeg':'jpeg','image/png':'png','image/webp':'webp','video/mp4':'mp4','video/webm':'webm'};
let busy=false;
async function command(binary:string,args:string[],timeout:number){
 await new Promise<void>((resolve,reject)=>{
  const child=spawn(binary,args,{stdio:['ignore','ignore','ignore'],shell:false});
  const timer=setTimeout(()=>{child.kill('SIGKILL');reject(new Error('Compression deadline'));},timeout);
  child.once('error',error=>{clearTimeout(timer);reject(error);});
  child.once('close',code=>{clearTimeout(timer);code===0?resolve():reject(new Error('Compression failed'));});
 });
}
export async function compressUpload(data:Buffer,mime:string):Promise<Buffer>{
 const format=formats[mime];
 // One bounded encoder per process. Busy/failed encoders preserve uploads.
 if(!format||busy||!data.length||data.length>(mime.startsWith('video/')?50:10)*1024*1024)return data;
 busy=true;let temporary:string|undefined;
 try{
  let result:Buffer;
  if(mime.startsWith('image/')){const meta=await sharp(data,{limitInputPixels:40_000_000,failOn:'error'}).metadata();if(meta.format!==format||(meta.pages??1)>1||!meta.width||!meta.height||meta.width*meta.height>40_000_000)return data;}
  if(format==='png'||format==='webp'){
   const image=sharp(data,{limitInputPixels:40_000_000,failOn:'error'}),meta=await image.metadata();
   if(meta.format!==format||(meta.pages??1)>1)return data;
   const output=image.keepMetadata().timeout({seconds:10});
   result=await (format==='png'?output.png({compressionLevel:9,adaptiveFiltering:true}):output.webp({lossless:true,effort:4})).toBuffer();
  }else{
   temporary=await mkdtemp(path.join(os.tmpdir(),'lvd-upload-'));
   const source=path.join(temporary,'input.'+format),target=path.join(temporary,'output.'+format);
   await writeFile(source,data,{mode:0o600});
   if(format==='jpeg')await command('jpegtran',['-copy','all','-optimize','-outfile',target,source],10000);
   else{
    // Force the declared container and disallow external/network protocols.
    // Lossless codecs frequently cannot improve already efficient videos;
    // those files deliberately retain their original bytes.
    const before=await probe(source),picture=before.streams?.find((stream:any)=>stream.codec_type==='video');
    if(!picture||picture.width*picture.height>8_294_400||!Number.isFinite(Number(before.format?.duration))||Number(before.format.duration)>180)return data;
    const video=format==='mp4'?['-c:v','libx264','-preset','ultrafast','-crf','0','-movflags','+faststart']:['-c:v','libvpx-vp9','-lossless','1','-deadline','realtime','-cpu-used','4'];
    await command('ffmpeg',['-nostdin','-v','error','-max_alloc','134217728','-threads','1','-protocol_whitelist','file,pipe','-f',format==='mp4'?'mov':'matroska','-i',source,'-map','0','-map_metadata','0',...video,'-c:a','copy','-c:s','copy','-threads','1','-fs',String(data.length),'-y',target],20000);
    const after=await probe(target);
    if(!Number.isFinite(Number(before.format?.duration))||!Number.isFinite(Number(after.format?.duration))||Math.abs(Number(before.format.duration)-Number(after.format?.duration))>0.002||JSON.stringify(before.streams)!==JSON.stringify(after.streams))return data;
   }
   result=await readFile(target);
  }
  return result.length>0&&result.length<data.length?result:data;
 }catch{return data;}
 finally{if(temporary)await rm(temporary,{recursive:true,force:true}).catch(()=>{});busy=false;}
}
export const compressMediaUpload:CollectionBeforeOperationHook=async({operation,args})=>{
 const file=args.req?.file,user=args.req?.user;
 if((operation==='create'||operation==='update')&&file&&user&&(['owner','support'].includes(user.role)||args.overrideAccess===true)){
  const data=await compressUpload(file.data,file.mimetype);
  if(data!==file.data)args.req.file={...file,data,size:data.length};
 }
 return args;
};
