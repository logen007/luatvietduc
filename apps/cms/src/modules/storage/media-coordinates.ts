import {APIError,type CollectionBeforeOperationHook} from 'payload';
import {mediaUploadLimit,isBannerVideo} from './upload-limits';

// Run before native upload processing: admin.readOnly does not protect the
// plugin's storage coordinates from REST or Local API writes.
export const mediaStorageCoordinates:CollectionBeforeOperationHook=({operation,args})=>{
 const file=args.req?.file;
 if(file&&file.size>mediaUploadLimit(file.mimetype))throw new APIError(isBannerVideo(file.mimetype)?'Video vượt quá 50 MB.':'Tệp vượt quá 10 MB.',413);
 if((operation==='create'||operation==='update')&&args.data&&typeof args.data==='object'&&!Array.isArray(args.data)){
  const data={...args.data} as Record<string,unknown>;
  for(const key of ['prefix','_objectKey','_objectkey','_object_key'])delete data[key];
  if(operation==='create')data.prefix='';
  args.data=data as typeof args.data;
 }
 return args;
};
