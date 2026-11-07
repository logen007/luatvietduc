import {IntegrationError} from './validation';
type LanguageModel={id:string;input_modalities?:string[];output_modalities?:string[]};
export async function grokModels(apiKey:string):Promise<LanguageModel[]>{
 const response=await fetch('https://api.x.ai/v1/language-models',{
  headers:{Authorization:'Bearer '+apiKey},redirect:'error',cache:'no-store',signal:AbortSignal.timeout(10000),
 });
 if(!response.ok)throw new IntegrationError(400,'Chưa kết nối được xAI. Kiểm tra API key và quyền truy cập model.');
 const reader=response.body?.getReader(),decoder=new TextDecoder();let bytes=0,text='';
 if(reader)for(;;){const part=await reader.read();if(part.done)break;bytes+=part.value.length;if(bytes>256000){await reader.cancel();throw new IntegrationError(502,'Danh sách model xAI vượt giới hạn.');}text+=decoder.decode(part.value,{stream:true});}
 let listing;try{listing=JSON.parse(text+decoder.decode());}catch{throw new IntegrationError(502,'Chưa đọc được danh sách model xAI.');}
 return Array.isArray(listing?.models)?listing.models.filter((model:LanguageModel)=>typeof model?.id==='string'&&/^grok-[a-zA-Z0-9.-]+$/.test(model.id)&&model.input_modalities?.includes('text')&&model.output_modalities?.includes('text')):[];
}
export function chooseGrokModel(models:LanguageModel[]):string{
 // Stable general models with structured output support. Never choose image/code/beta models.
 const candidates=models.filter(model=>/^grok-4\.(?:[3-9]|\d{2,})(?:-latest)?$/.test(model.id));
 candidates.sort((a,b)=>b.id.replace(/-latest$/,'').localeCompare(a.id.replace(/-latest$/,''),undefined,{numeric:true})||a.id.length-b.id.length);
 if(!candidates[0])throw new IntegrationError(400,'Khóa này chưa có model Grok phù hợp. Chọn model văn bản trong tài khoản xAI.');
 return candidates[0].id;
}
