import { getPayload } from 'payload';
import config from '@payload-config';
import { NextResponse } from 'next/server';
import { integrationCatalog, isProvider, type Provider } from '../../../modules/integrations/catalog';
import { requireOwner, IntegrationError } from '../../../modules/integrations/validation';
import { safeConnection, saveConnection, storedValues, markCheck, setEnabled } from '../../../modules/integrations/store';
import { checkConnection } from '../../../modules/integrations/check';
import {grokModels,chooseGrokModel} from '../../../modules/integrations/grok';
import { rateLimit } from '../../../modules/chat/service';
export const dynamic = 'force-dynamic';
const json = (value: unknown, status = 200) => NextResponse.json(value, { status, headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'} });
async function handle(req: Request) {
  try {
    const payload = await getPayload({config}), {user} = await payload.auth({headers:req.headers});
    requireOwner(user);
    if (req.method === 'GET') return json({connections: await Promise.all((Object.keys(integrationCatalog) as Provider[]).map(safeConnection))});
    if (req.headers.get('origin') !== (process.env.APP_URL || 'http://localhost:3000')) throw new IntegrationError(403,'Nguồn yêu cầu không hợp lệ.');
    if (!req.headers.get('content-type')?.startsWith('application/json')) throw new IntegrationError(415,'Yêu cầu JSON.');
    const reader=req.body?.getReader(); let size=0, body=''; const decoder=new TextDecoder();
    if(reader)for(;;){const part=await reader.read();if(part.done)break;size+=part.value.length;if(size>16000){await reader.cancel();throw new IntegrationError(413,'Nội dung quá lớn.');}body+=decoder.decode(part.value,{stream:true});}
    let data;try{data=JSON.parse(body);}catch{throw new IntegrationError(400,'Dữ liệu không hợp lệ.');}
    if (!isProvider(data.provider) || !Number.isInteger(data.version)) throw new IntegrationError(400,'Kết nối hoặc phiên bản không hợp lệ.');
    await rateLimit('integration-owner:'+user!.id,12);
    if(data.action==='save') {
      if(data.provider==='translation' && data.values && typeof data.values==='object' && !String(data.values.model||'').trim()) {
        const previous=data.version?await storedValues('translation',data.version):null;
        const key=String(data.values.apiKey||(previous?.values.vendor==='xai'?previous.values.apiKey:'')||'').trim();
        if(!key||key.length>4096||/[\r\n\0]/.test(key))throw new IntegrationError(400,'Vui lòng nhập API key xAI hợp lệ.');
        data.values.model=chooseGrokModel(await grokModels(key));
      }
      if(data.provider==='ai' && data.values && typeof data.values==='object' && !String(data.values.model||'').trim()) {
        const previous=data.version?await storedValues(data.provider,data.version):null;
        const key=String(data.values.apiKey||previous?.values.apiKey||'').trim();
        if(!key)throw new IntegrationError(400,'Vui lòng nhập API key Gemini.');
        const response=await fetch('https://generativelanguage.googleapis.com/v1beta/models?pageSize=1000',{headers:{'x-goog-api-key':key},redirect:'error',signal:AbortSignal.timeout(10000)});
        if(!response.ok)throw new IntegrationError(400,'Chưa đọc được danh sách model. Kiểm tra API key hoặc thử lại.');
        const listing=await response.json();
        const models=(listing.models||[]).filter((model:any)=>model.supportedGenerationMethods?.includes('generateContent')&&/^models\/gemini-[a-zA-Z0-9.-]+$/.test(model.name)&&!/(preview|experimental|exp-|image|audio|robotics|computer-use)/i.test(model.name));
        models.sort((a:any,b:any)=>{const rank=(name:string)=>name.includes('flash-lite')?0:name.includes('flash')?1:2;return rank(a.name)-rank(b.name)||b.name.localeCompare(a.name,undefined,{numeric:true});});
        if(!models[0])throw new IntegrationError(400,'Chưa tìm thấy model văn bản phù hợp với khóa này.');
        data.values.model=models[0].name.replace('models/','');
      }
      await saveConnection(data.provider,data.values,data.version,user!.id);
    }
    else if(data.action==='test') {
      const {values}=await storedValues(data.provider,data.version);let result;
      try { result=await checkConnection(data.provider,values,user!.email); }
      catch { result={state:'failed',message:'Không kiểm tra được dịch vụ. Kiểm tra thông tin, quyền truy cập hoặc thử lại sau.'}; }
      await markCheck(data.provider,data.version,result.state,user!.id);
      return json({...result,connection:await safeConnection(data.provider)});
    } else if(data.action==='toggle' && typeof data.enabled==='boolean') await setEnabled(data.provider,data.version,data.enabled,user!.id);
    else throw new IntegrationError(400,'Thao tác không hợp lệ.');
    return json({connection:await safeConnection(data.provider)});
  } catch(e) {
    if(e instanceof IntegrationError)return json({error:e.message},e.status);
    return json({error:'Chưa lưu được kết nối. Vui lòng thử lại; nếu vừa nâng cấp, kiểm tra bước chuẩn bị dữ liệu.'},503);
  }
}
export const GET=handle;
export const POST=handle;
