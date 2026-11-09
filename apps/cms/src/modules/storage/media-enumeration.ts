import type {CollectionBeforeOperationHook,Where} from 'payload';

const rootsOnly=(where?:Where):Where=>({and:[...(where?[where]:[]),{legacyParent:{exists:false}},{or:[{filename:{exists:false}},{filename:{not_like:'avatar-%'}}]}]});

// Payload 3 maps both find and findByID to "read". A list has where rather
// than id; relationship population uses a nested find with currentDepth > 0.
export const mediaRootEnumeration:CollectionBeforeOperationHook=({operation,args})=>{
 if(operation==='count')args.where=rootsOnly(args.where);
 else if(operation==='read'&&'where' in args&&!('id' in args)&&!(typeof args.currentDepth==='number'&&args.currentDepth>0))args.where=rootsOnly(args.where);
 return args;
};
