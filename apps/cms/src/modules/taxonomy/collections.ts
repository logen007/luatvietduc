import type {CollectionConfig,CollectionBeforeValidateHook} from 'payload';
import {owner} from '../shared/access';
import {permalink} from './slug';
const roles=['owner','editor','reviewer','knowledge','support'];
const manage=({req}:any)=>roles.includes(req.user?.role||'');
const normalize:CollectionBeforeValidateHook=({data,originalDoc})=>{
 if(!data)return data;
 const slug=permalink(String(data.slug||originalDoc?.slug||data.name||''));
 if(!slug)throw new Error('Hãy nhập tên hoặc đường dẫn hợp lệ.');data.slug=slug;return data;
};
export const Categories:CollectionConfig={
 slug:'categories',labels:{singular:'Danh mục',plural:'Danh mục'},admin:{group:'Nội dung',useAsTitle:'label',defaultColumns:['label','slug','parent','updatedAt'],description:'Tạo danh mục cha hoặc chọn danh mục cha để tạo danh mục con.'},
 access:{read:()=>true,create:manage,update:manage,delete:owner},
 hooks:{beforeValidate:[normalize]},
 fields:[{name:'label',label:'Danh mục',type:'text',admin:{hidden:true},access:{create:()=>false,update:()=>false}},{name:'name',label:'Tên danh mục',type:'text',required:true,maxLength:160},{name:'slug',label:'Permalink',type:'text',unique:true,required:true,admin:{description:'Tự tạo từ tên nếu để trống.'}},{name:'parent',label:'Danh mục cha',type:'relationship',relationTo:'categories',admin:{description:'Để trống để làm danh mục cha. Không thể chọn chính nó hoặc danh mục con của nó.'}},{name:'description',label:'Mô tả',type:'textarea'}],
};
export const Tags:CollectionConfig={
 slug:'tags',labels:{singular:'Tag',plural:'Tag'},admin:{group:'Nội dung',useAsTitle:'name',defaultColumns:['name','slug','updatedAt']},access:{read:()=>true,create:manage,update:manage,delete:owner},hooks:{beforeValidate:[normalize]},
 fields:[{name:'name',label:'Tên tag',type:'text',required:true,maxLength:100},{name:'slug',label:'Permalink',type:'text',required:true,unique:true,admin:{description:'Tự tạo từ tên nếu để trống.'}},{name:'description',label:'Mô tả',type:'textarea'}],
};
