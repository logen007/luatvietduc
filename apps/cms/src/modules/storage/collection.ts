import {bundledNames,bundledURL} from './bundled';
import {mediaWriteGuard} from "../backup/media-lock";
import type { CollectionConfig } from "payload";
import { activeValues } from "../integrations/store";
export const storageReady = async () => Boolean(await activeValues("r2"));
export const Media: CollectionConfig = {
  slug: "media",
  labels: { singular: "Tệp", plural: "Thư viện tệp" },
  admin: { group: "Nội dung",useAsTitle:"alt",defaultColumns:["filename","alt","mimeType","filesize"],description:"Quản lý ảnh, logo, video và tài liệu. Kết nối R2 trong Cài đặt để tải thêm tệp." },
  access: {
    create: async ({ req }) =>
      (await storageReady()) &&
      ["owner", "support", "editor", "reviewer"].includes(req.user?.role || ""),
    read: ({ req }) =>
      req.user && ["owner", "support", "editor", "reviewer"].includes(req.user.role)
        ? true
        : { visibility: { equals: "public" } },
    update: ({req})=>req.user?.role==="owner"?{filename:{not_in:bundledNames}}:false,
    delete: ({req})=>req.user?.role==="owner"?{filename:{not_in:bundledNames}}:false,
  },
  hooks:{afterRead:[({doc})=>bundledURL(doc)],beforeChange:[mediaWriteGuard],beforeDelete:[mediaWriteGuard]},
  upload: {
    disableLocalStorage: true,
    mimeTypes: ["image/jpeg", "image/png", "image/webp", "application/pdf"],
    staticDir: "private-media",
  },
  fields: [
    { name: "alt", label: "Mô tả tệp", type: "text", required: true },
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
