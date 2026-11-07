import type {CollectionAfterMeHook,CollectionAfterOperationHook,PayloadRequest} from 'payload';
import type {PreviewUser} from './role-preview-auth';

function previewResponse<T>(response:T,req:PayloadRequest):T{
 const user=req.user as (PreviewUser&{_strategy?:string})|null,role=user?.rolePreview;
 if(user?._strategy!=='role-preview'||user.collection!=='users'||!['support','member'].includes(role||'')||user.role!==role)return response;
 if(!response||typeof response!=='object'||!('user' in response))return response;
 const current=response.user;
 if(!current||typeof current!=='object'||!('id' in current)||String(current.id)!==String(user.id))return response;
 return {...response,user:{...current,role,rolePreview:role,jurisdictions:role==='support'?(user.jurisdictions||[]).filter(country=>country==='VN'||country==='DE'):[]}};
}
export const rolePreviewMe:CollectionAfterMeHook=({response,req})=>previewResponse(response,req);
// Installed Payload afterRefresh has no result argument. afterOperation runs
// after native response sanitization and preserves the signed token unchanged.
export const rolePreviewRefresh:CollectionAfterOperationHook=({operation,result,req})=>operation==='refresh'?previewResponse(result,req):result;
