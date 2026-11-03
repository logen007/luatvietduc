import type { CollectionConfig } from "payload";
import { owner } from "../shared/access";
import { activeValues } from "../integrations/store";
export const storageReady = async () => Boolean(await activeValues("r2"));
export const Media: CollectionConfig = {
  slug: "media",
  labels: { singular: "Tệp nội dung", plural: "Tệp nội dung" },
  admin: { group: "Nội dung" },
  access: {
    create: async ({ req }) =>
      (await storageReady()) &&
      ["owner", "editor", "reviewer"].includes(req.user?.role || ""),
    read: ({ req }) =>
      req.user && ["owner", "editor", "reviewer"].includes(req.user.role)
        ? true
        : { visibility: { equals: "public" } },
    update: owner,
    delete: owner,
  },
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
