import {APIError,type GlobalBeforeChangeHook} from 'payload';
export const heroMediaGuard:GlobalBeforeChangeHook=async({data,req})=>{
 for(const key of ['heroVideo','heroMobileVideo','heroPoster'] as const){
  if(data[key]==null)continue;
  const id=typeof data[key]==='object'?data[key].id:data[key];
  if(!Number.isSafeInteger(id)||id<=0)throw new APIError('Vui lòng chọn tệp trong Thư viện.',400);
  const media=await req.payload.findByID({collection:'media',id,depth:0,overrideAccess:false,req});
  const valid=key==='heroPoster'?media.mimeType?.startsWith('image/'):['video/mp4','video/webm'].includes(media.mimeType||'');
  if(media.visibility!=='public'||!valid)throw new APIError(key==='heroPoster'?'Ảnh chờ phải là ảnh công khai.':'Video banner phải là MP4 hoặc WebM công khai.',400);
 }
 return data;
};
