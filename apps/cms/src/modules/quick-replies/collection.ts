import type {CollectionConfig} from 'payload';
import {owner} from '../shared/access';

// Human reply templates only: never indexed as AI knowledge or sent automatically.
export const QuickReplies:CollectionConfig={
 slug:'quick-replies',
 labels:{singular:'Câu trả lời nhanh',plural:'Câu trả lời nhanh'},
 defaultSort:'title',
 admin:{group:'Cài đặt',useAsTitle:'title',defaultColumns:['title','enabled','updatedAt'],listSearchableFields:['title','body']},
 access:{
  read:({req})=>req.user?.role==='owner'?true:req.user?.role==='support'?{enabled:{equals:true}}:false,
  create:owner,update:owner,delete:owner,
 },
 fields:[
  {name:'title',label:'Tên mẫu',type:'text',required:true,maxLength:120},
  {name:'body',label:'Nội dung',type:'textarea',required:true,maxLength:10000},
  {name:'enabled',label:'Đang dùng',type:'checkbox',defaultValue:true},
 ],
};
