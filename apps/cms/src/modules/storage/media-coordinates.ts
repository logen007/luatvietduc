import type {CollectionBeforeOperationHook} from 'payload';

// Run before native upload processing: admin.readOnly does not protect the
// plugin's storage coordinates from REST or Local API writes.
export const mediaStorageCoordinates:CollectionBeforeOperationHook=({operation,args})=>{
 if((operation==='create'||operation==='update')&&args.data&&typeof args.data==='object'&&!Array.isArray(args.data)){
  const data={...args.data} as Record<string,unknown>;
  for(const key of ['prefix','_objectKey','_objectkey','_object_key'])delete data[key];
  if(operation==='create')data.prefix='';
  args.data=data as typeof args.data;
 }
 return args;
};
