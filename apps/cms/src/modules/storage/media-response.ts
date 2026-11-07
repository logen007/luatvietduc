import {GetObjectCommand,HeadObjectCommand,type S3Client} from '@aws-sdk/client-s3';
import {getRangeRequestInfo} from 'payload/internal';
import {Readable} from 'node:stream';

// Called only after Payload's file-access check. Stream ranges from R2 rather
// than downloading the whole video for Safari's initial two-byte probe.
export async function storedMediaResponse({client,bucket,key,filename,request}:{client:S3Client;bucket:string;key:string;filename:string;request:Pick<Request,'headers'>&{signal?:AbortSignal}}){
 const base={'X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'none'; sandbox",'Cache-Control':'private, no-store','Accept-Ranges':'bytes','Content-Disposition':'inline; filename="'+filename.replace(/["\r\n\\]/g,'_')+'"'};
 let streamed=false;
 try{
  let range:string|undefined,status=200,rangeHeaders:Record<string,string>={};
  const requested=request.headers.get('range');
  if(requested){
   const head=await client.send(new HeadObjectCommand({Bucket:bucket,Key:key}),{abortSignal:AbortSignal.timeout(10000)});
   if(!Number.isSafeInteger(head.ContentLength)||head.ContentLength!<0)return new Response(null,{status:502,headers:base});
   const condition=request.headers.get('if-range');
   const date=condition?Date.parse(condition):NaN;
   const matches=!condition||condition===head.ETag||(Number.isFinite(date)&&head.LastModified&&Math.floor(head.LastModified.getTime()/1000)<=Math.floor(date/1000));
   const result=getRangeRequestInfo({fileSize:head.ContentLength!,rangeHeader:matches?requested:null});
   if(result.type==='invalid')return new Response(null,{status:result.status,headers:{...base,...result.headers}});
   status=result.status;rangeHeaders=result.headers;
   if(result.type==='partial')range=`bytes=${result.rangeStart}-${result.rangeEnd}`;
  }
  const object=await client.send(new GetObjectCommand({Bucket:bucket,Key:key,...(range?{Range:range}:{})}),{abortSignal:AbortSignal.timeout(20000)});
  if(!object.Body)return new Response(null,{status:404,headers:base});
  const stream=object.Body as Readable;
  const cleanup=()=>{request.signal?.removeEventListener('abort',abort);client.destroy();};
  const abort=()=>{stream.destroy();cleanup();};
  stream.once('end',cleanup);stream.once('close',cleanup);stream.once('error',cleanup);
  request.signal?.addEventListener('abort',abort,{once:true});
  if(request.signal?.aborted){abort();return new Response(null,{status:499,headers:base});}
  streamed=true;
  return new Response(Readable.toWeb(stream) as ReadableStream,{status,headers:{
   ...base,'Content-Type':object.ContentType||'application/octet-stream',
   ...(Number.isSafeInteger(object.ContentLength)&&object.ContentLength!>=0?{'Content-Length':String(object.ContentLength)}:{}),
   ...rangeHeaders,
  }});
 }catch{return new Response(null,{status:404,headers:base});}
 finally{if(!streamed)client.destroy();}
}
