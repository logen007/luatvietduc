import {mediaMetadataGuard} from './metadata-guard';
import {bundledNames,bundledURL} from './bundled';
import {mediaWriteGuard} from "../backup/media-lock";
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
    delete: ({req}):boolean|Where=>req.user?.role==="owner"?{filename:{not_in:bundledNames}}:req.user?.role==="support"?{and:[{uploadedBy:{equals:req.user.id}},{filename:{not_in:bundledNames}}]}:false,
  },
  hooks:{afterRead:[({doc})=>bundledURL(doc)],beforeChange:[mediaMetadataGuard],beforeDelete:[mediaWriteGuard]},
  upload: {
    disableLocalStorage: true,
    mimeTypes: ["image/jpeg", "image/png", "image/webp", "image/svg+xml", "application/pdf", "video/mp4", "video/webm", "audio/mpeg", "audio/wav", "audio/ogg"],
    staticDir: "private-media",
  },
  fields: [
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
