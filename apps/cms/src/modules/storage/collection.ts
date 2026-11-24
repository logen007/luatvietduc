import {compressMediaUpload} from './compress-upload';
import {mediaMetadataGuard} from './metadata-guard';
import {bundledURL} from './bundled';
import {mediaWriteGuard} from "../backup/media-lock";
import {mediaRootEnumeration} from './media-enumeration';
import {captureMediaOwnedFiles,deleteMediaOwnedFiles} from '../integrations/storage';
import {originalFileAvailability,originalMediaView} from './image-edit';
import {mediaStorageCoordinates} from './media-coordinates';
import type { CollectionConfig,Where } from "payload";
import { activeValues } from "../integrations/store";
export const storageReady = async () => Boolean(await activeValues("r2"));
export const Media: CollectionConfig = {
  slug: "media",
  labels: { singular: "Tệp", plural: "Thư viện tệp" },
  defaultSort:"-createdAt",
  admin: { group: "Nội dung",useAsTitle:"alt",defaultColumns:["filename","alt","mimeType","filesize"] },
  access: {
    create: async ({ req }) =>
      (await storageReady()) &&
      ["owner", "support", "editor", "reviewer"].includes(req.user?.role || ""),
    read: ({ req }) =>
      req.user && ["owner", "support", "editor", "reviewer"].includes(req.user.role)
        ? true
        : { visibility: { equals: "public" } },
    update: ({req})=>req.user?.role==="owner"?true:req.user?.role==="support"?{uploadedBy:{equals:req.user.id}}:false,
    delete: ({req}):boolean|Where=>req.user?.role==="owner"?true:req.user?.role==="support"?{uploadedBy:{equals:req.user.id}}:false,
  },
  hooks:{beforeOperation:[mediaRootEnumeration,mediaStorageCoordinates,compressMediaUpload],afterRead:[({doc})=>bundledURL(doc),originalMediaView],beforeChange:[mediaMetadataGuard],beforeDelete:[mediaWriteGuard,captureMediaOwnedFiles],afterDelete:[deleteMediaOwnedFiles]},
  upload: {
    disableLocalStorage: true,
    crop:false,
    focalPoint:false,
    adminThumbnail:'thumbnail',
    imageSizes:[
      {name:'thumbnail',width:150,height:150,fit:'cover',withoutEnlargement:true},
      {name:'medium',width:600,height:600,fit:'inside',withoutEnlargement:true},
      {name:'large',width:1200,height:1200,fit:'inside',withoutEnlargement:true},
    ],
    mimeTypes: ["image/jpeg", "image/png", "image/webp", "image/svg+xml", "application/pdf", "video/mp4", "video/webm", "audio/mpeg", "audio/wav", "audio/ogg"],
    staticDir: "private-media",
  },
  fields: [
    {name:'legacyParent',type:'relationship',relationTo:'media',index:true,admin:{hidden:true},access:{create:()=>false,update:()=>false}},
    {name:'originalFile',type:'json',admin:{hidden:true},access:{read:()=>false,create:()=>false,update:()=>false},hooks:{afterRead:[originalFileAvailability]}},
    {name:'imageTools',type:'ui',admin:{components:{Field:'./modules/storage/MediaImageTools#MediaImageTools'}}},
    {name:'title',label:'Tiêu đề',type:'text',maxLength:200},
    {name:'alt',label:'Văn bản thay thế',type:'text',maxLength:500},
    {name:'caption',label:'Chú thích',type:'textarea',maxLength:2000},
    {name:'description',label:'Mô tả',type:'textarea',maxLength:6000},
    {name:'uploadedBy',label:'Người tải lên',type:'relationship',relationTo:'users',admin:{readOnly:true}},
    {
      name: "visibility",
      label: "Phạm vi",
      type: "select",
      defaultValue: "private",
      options: [{label:"Riêng tư",value:"private"},{label:"Công khai",value:"public"}],
      access: {
        create: ({ req }) => req.user?.role === "owner",
        update: ({ req }) => req.user?.role === "owner",
      },
    },
  ],
};
