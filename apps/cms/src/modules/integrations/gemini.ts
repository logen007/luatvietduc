import {IntegrationError} from './validation';

const stableChatModels=['gemini-3.5-flash-lite','gemini-3.1-flash-lite'] as const;
const connectionFailure='Chưa kết nối được Google Gemini. Kiểm tra mạng rồi thử lại.';

// Classify only known error codes. Provider messages, keys, account emails and
// project metadata never become UI copy or logs.
export function geminiErrorMessage(status:number,value:unknown):string{
 const error=value&&typeof value==='object'&&!Array.isArray(value)?(value as any).error:null;
 const details=Array.isArray(error?.details)?error.details.slice(0,20):[];
 const reasons=new Set(details.map((detail:any)=>detail?.reason));
 if(status===401&&reasons.has('ACCOUNT_STATE_INVALID'))return 'Google từ chối khóa vì tài khoản liên kết đang không hợp lệ, có thể đã bị vô hiệu hóa hoặc xóa. Kiểm tra tài khoản trong Google AI Studio và tạo khóa mới.';
 if(status===401||reasons.has('API_KEY_INVALID')||reasons.has('API_KEY_EXPIRED'))return 'Google chưa chấp nhận khóa Gemini. Sao chép đầy đủ khóa từ Google AI Studio, lưu rồi kiểm tra lại.';
 if(status===403&&reasons.has('SERVICE_DISABLED'))return 'Gemini API chưa được bật trong dự án của khóa. Bật Gemini API trong Google Cloud rồi kiểm tra lại.';
 if(status===403)return 'Khóa Gemini chưa có quyền truy cập API hoặc model này. Kiểm tra quyền và giới hạn của khóa trong Google AI Studio.';
 if(status===404)return 'Model Gemini này không còn khả dụng hoặc khóa chưa có quyền dùng. Để trống Model rồi lưu để chọn model Flash-Lite ổn định.';
 if(status===429)return 'Google đang giới hạn lượt truy cập hoặc dự án đã hết hạn mức Gemini. Chờ rồi thử lại; hệ thống không tự bật thanh toán.';
 return 'Google Gemini chưa phản hồi hợp lệ. Thử lại sau; cấu hình hiện tại được giữ nguyên.';
}

async function readMetadata(response:Response):Promise<any>{
 const reader=response.body?.getReader(),decoder=new TextDecoder();let bytes=0,text='';
 if(reader)for(;;){const part=await reader.read();if(part.done)break;bytes+=part.value.length;if(bytes>524288){await reader.cancel();throw new Error('Metadata limit');}text+=decoder.decode(part.value,{stream:true});}
 return JSON.parse(text+decoder.decode());
}

export async function geminiMetadata(apiKey:string,model?:string):Promise<any>{
 if(!apiKey||apiKey.length>4096||/[\r\n\0]/.test(apiKey))throw new IntegrationError(400,'Nhập đầy đủ API key Gemini từ Google AI Studio.');
 if(model!==undefined&&!/^[a-zA-Z0-9][a-zA-Z0-9.-]{0,99}$/.test(model))throw new IntegrationError(400,'Tên model Gemini không hợp lệ.');
 let response:Response;
 try{response=await fetch('https://generativelanguage.googleapis.com/v1beta/models'+(model?'/'+encodeURIComponent(model):'?pageSize=1000'),{headers:{'x-goog-api-key':apiKey},signal:AbortSignal.timeout(10000),redirect:'error',cache:'no-store'});}
 catch{throw new IntegrationError(503,connectionFailure);}
 let data:unknown;
 try{data=await readMetadata(response);}catch{throw new IntegrationError(response.ok?503:400,response.ok?'Chưa đọc được thông tin model Gemini. Thử lại sau.':geminiErrorMessage(response.status,null));}
 if(!response.ok)throw new IntegrationError(response.status===429?429:400,geminiErrorMessage(response.status,data));
 return data;
}

export function selectGeminiChatModel(listing:unknown):string{
 const models=listing&&typeof listing==='object'&&!Array.isArray(listing)&&(listing as any).models;
 if(Array.isArray(models))for(const name of stableChatModels){
  if(models.some((model:any)=>model?.name==='models/'+name&&Array.isArray(model.supportedGenerationMethods)&&model.supportedGenerationMethods.includes('generateContent')))return name;
 }
 throw new IntegrationError(400,'Khóa này chưa có model Flash-Lite ổn định phù hợp. Kiểm tra quyền model trong Google AI Studio; hệ thống không tự chọn model trả phí hoặc thử nghiệm.');
}

export async function chooseGeminiChatModel(apiKey:string){return selectGeminiChatModel(await geminiMetadata(apiKey));}

export async function checkGeminiConnection(apiKey:string,model:string){
 try{
  const info=await geminiMetadata(apiKey,model);
  if(info?.name!=='models/'+model||!Array.isArray(info.supportedGenerationMethods)||!info.supportedGenerationMethods.includes('generateContent'))return {state:'failed',message:'Model này chưa hỗ trợ tạo câu trả lời Gemini. Để trống Model rồi lưu để chọn lại.'};
  return {state:'passed',message:'Khóa Gemini và model truy cập được. Chưa kiểm tra hạn mức tạo nội dung; AI cho khách vẫn tắt.'};
 }catch(error){return {state:'failed',message:error instanceof IntegrationError?error.message:connectionFailure};}
}
