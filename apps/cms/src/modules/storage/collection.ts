import {bundledNames,bundledURL} from './bundled';
import {mediaWriteGuard} from "../backup/media-lock";
import type { CollectionConfig } from "payload";
import { activeValues } from "../integrations/store";
export const storageReady = async () => Boolean(await activeValues("r2"));
export const Media: CollectionConfig = {
  slug: "media",
  labels: { singular: "Tệp nội dung", plural: "Tệp nội dung" },
  admin: { group: "Nội dung",useAsTitle:"alt",defaultColumns:["filename","alt","mimeType","filesize"],description:"Ảnh, logo và video có sẵn nằm trong danh sách này. Tệp giao diện chỉ đọc; tệp tải lên được quản lý qua R2." },
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
      options: ["private", "public"],
      access: {
        create: ({ req }) => req.user?.role === "owner",
        update: ({ req }) => req.user?.role === "owner",
      },
    },
  ],
};
