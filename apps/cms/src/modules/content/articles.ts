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
  slug: "articles",
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
    { name: "title", type: "text", required: true },
    { name: "slug", type: "text", required: true, unique: true },
    { name: "body", type: "textarea", required: true },
    {
      name: "jurisdiction",
      type: "select",
      required: true,
      options: ["VN", "DE"],
    },
    { name: "language", type: "select", required: true, options: ["vi", "de"] },
    {
      name: "sourceUrl",
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
      name: "reviewState",
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
      name: "aiAllowed",
      type: "checkbox",
      defaultValue: false,
      access: {
        create: ({ req }) => req.user?.role === "owner",
        update: ({ req }) => req.user?.role === "owner",
      },
    },
  ],
};
