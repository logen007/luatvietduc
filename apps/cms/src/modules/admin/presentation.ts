import type {CollectionConfig,Field,GlobalConfig} from 'payload';
type FieldCopy={label?:string;description?:string;placeholder?:string;cell?:string};
type Presentation={singular?:string;plural?:string;description?:string;fields?:Record<string,FieldCopy>};
// Edit console copy here. Database fields, validation, hooks and access remain
// in their feature modules and stay on the reviewed schema release path.
export const adminDateFormat='dd/MM/yyyy HH:mm';
export const presentation:Record<string,Presentation>={
 articles:{singular:'Bài viết',plural:'Bài viết',fields:{title:{label:'Tiêu đề',placeholder:'Tiêu đề bài viết'},slug:{label:'Permalink',description:''},body:{label:'Nội dung',placeholder:'Viết nội dung bài viết…'},categories:{label:'Danh mục',placeholder:'Danh mục',description:'',cell:'./modules/admin/CategoryCell#CategoryCell'},tags:{label:'Tag',placeholder:'Tag',description:''},kind:{placeholder:'Loại nội dung'},reviewState:{placeholder:'Trạng thái duyệt'},sourceUrl:{placeholder:'Nguồn tham khảo (https://…)'},aiAllowed:{label:'Cho phép dùng cho AI'}}},
 media:{singular:'Tệp',plural:'Thư viện tệp',description:'',fields:{alt:{label:'Văn bản thay thế'},visibility:{label:'Phạm vi'}}},
 'audit-events':{singular:'Sự kiện',plural:'Nhật ký hoạt động',fields:{action:{label:'Thao tác'},recordId:{label:'Mã bản ghi'},actor:{label:'Người thực hiện'},details:{label:'Chi tiết'}}},
 users:{singular:'Người dùng',plural:'Người dùng'},
 categories:{singular:'Danh mục',plural:'Danh mục'},
 tags:{singular:'Tag',plural:'Tag'},
};
function fieldsCopy(fields:Field[],copy:Record<string,FieldCopy>):Field[]{
 return fields.map(field=>{
  const next={...field};
  if('fields' in next)next.fields=fieldsCopy(next.fields,copy);
  if('tabs' in next)next.tabs=next.tabs.map(tab=>({...tab,fields:fieldsCopy(tab.fields,copy)}));
  const text='name' in next?copy[next.name]:undefined;
  if(text){if(text.label!==undefined)Object.assign(next,{label:text.label});if(text.description!==undefined)next.admin={...next.admin,description:text.description};if(text.placeholder!==undefined)next.admin={...next.admin,...{placeholder:text.placeholder}};if(text.cell)next.admin={...next.admin,components:{...next.admin?.components,Cell:text.cell}};}
  return next;
 });
}
export function withAdminPresentation<T extends CollectionConfig|GlobalConfig>(config:T):T{
 const copy=presentation[config.slug];if(!copy)return config;
 return {...config,...('labels' in config?{labels:{singular:copy.singular,plural:copy.plural}}:{}),admin:{...config.admin,...(config.slug==='media'?{listSearchableFields:['filename','title','alt','caption','description'],pagination:{defaultLimit:48,limits:[24,48,96]},components:{...config.admin?.components,views:{...config.admin?.components?.views,list:{Component:'./modules/storage/MediaLibrary#MediaLibrary'}}}}:{}),...(copy.description!==undefined?{description:copy.description}:{})},fields:fieldsCopy(config.fields,copy.fields||{})};
}
