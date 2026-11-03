import type { CollectionConfig } from "payload";
import { owner } from "../shared/access";
import {
  articleWorkflow,
  createArticle,
  readArticles,
  scopedStaff,
} from "../../access/articles";
import { articleLock, auditArticle } from "./audit";
export const Articles: CollectionConfig = {
  slug: "articles",labels:{singular:"Bài viết",plural:"Bài viết & hỏi đáp"},
  versions: { drafts: true },
  admin: { group: "Nội dung", useAsTitle: "title" },
  access: {
    create: createArticle,
    read: readArticles,
    update: scopedStaff,
    delete: owner,
    readVersions: scopedStaff,
  },
  hooks: {
    beforeChange: [articleLock, articleWorkflow],
    afterChange: [auditArticle],
  },
  fields: [
    {
      name: "kind",
      label: "Loại nội dung",
      type: "select",
      defaultValue: "article",
      options: ["article", "news", "question"],
    },
    { name: "legalField", label: "Lĩnh vực", type: "text" },
    { name: "effectiveFrom", label: "Có hiệu lực từ", type: "date" },
    { name: "reviewDueAt", label: "Hạn rà soát", type: "date" },
    {
      name: "reviewedBy",
      label: "Người duyệt",
      type: "relationship",
      relationTo: "users",
      access: { create: () => false, update: () => false },
    },
    {
      name: "reviewedAt",
      label: "Ngày duyệt",
      type: "date",
      access: { create: () => false, update: () => false },
    },
    { name: "title", label:"Tiêu đề", type: "text", required: true },
    { name: "slug", label:"Đường dẫn", type: "text", required: true, unique: true },
    { name: "body", label:"Nội dung", type: "textarea", required: true },
    {
      name: "jurisdiction", label:"Quốc gia",
      type: "select",
      required: true,
      options: ["VN", "DE"],
    },
    { name: "language", label:"Ngôn ngữ nội dung", type: "select", required: true, options: ["vi", "de"] },
    {
      name: "sourceUrl", label:"Nguồn tham khảo",
      type: "text",
      validate: (v: unknown) => {
        if (!v) return true;
        try {
          return new URL(String(v)).protocol === "https:" || "HTTPS required";
        } catch {
          return "Valid HTTPS URL required";
        }
      },
    },
    {
      name: "reviewState", label:"Trạng thái duyệt",
      type: "select",
      defaultValue: "draft",
      options: ["draft", "pending", "approved", "withdrawn"],
      access: {
        create: ({ req }) => ["owner", "editor"].includes(req.user?.role || ""),
        update: ({ req }) =>
          ["owner", "editor", "reviewer"].includes(req.user?.role || ""),
      },
    },
    {
      name: "aiAllowed", label:"Cho phép dùng cho AI",
      type: "checkbox",
      defaultValue: false,
      access: {
        create: ({ req }) => req.user?.role === "owner",
        update: ({ req }) => req.user?.role === "owner",
      },
    },
  ],
};
