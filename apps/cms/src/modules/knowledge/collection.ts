import type { CollectionConfig } from "payload";
import { scopedStaff } from "../../access/articles";
import { articleLock, auditArticle } from "../content/audit";
import { owner } from "../shared/access";
export const Knowledge: CollectionConfig = {
  slug: "knowledge",
  labels: { singular: "Nguồn kiến thức", plural: "Kho kiến thức AI" },
  admin: {
    group: "Kiến thức",
    useAsTitle: "title",
    description:
      "Chỉ nhập nguồn công khai. Không nhập hồ sơ khách hàng hoặc hội thoại riêng.",
  },
  versions: { drafts: true },
  access: {
    read: ({ req }) =>
      req.user?.role === "knowledge" ? true : scopedStaff({ req }),
    readVersions: ({ req }) =>
      req.user?.role === "knowledge" ? true : scopedStaff({ req }),
    create: ({ req }) => ["owner", "knowledge"].includes(req.user?.role || ""),
    update: ({ req }) =>
      req.user?.role === "knowledge" ? true : scopedStaff({ req }),
    delete: owner,
  },
  hooks: {
    beforeChange: [
      articleLock,
      ({ data, originalDoc, req }) => {
        if (
          req.user?.role === "reviewer" &&
          !req.user.jurisdictions?.includes(
            data.jurisdiction ?? originalDoc?.jurisdiction,
          )
        )
          throw new Error("Country scope required");
        const changed =
          originalDoc &&
          [
            "title",
            "body",
            "sourceUrl",
            "jurisdiction",
            "effectiveFrom",
            "expiresAt",
            "reviewDueAt",
          ].some((k) => k in data && data[k] !== originalDoc[k]);
        if (changed) {
          data.approved = false;
          data._status = "draft";
          data.reviewedBy = null; data.reviewedAt = null;
        }
        if(data.approved===false&&originalDoc?.approved===true){data._status='draft';data.reviewedBy=null;data.reviewedAt=null}
        if (data.approved === true && originalDoc?.approved !== true) {
          if (!["owner", "reviewer"].includes(req.user?.role || ""))
            throw new Error("Reviewer required");
          if (
            req.user?.role !== "owner" &&
            !req.user?.jurisdictions?.includes(
              data.jurisdiction ?? originalDoc?.jurisdiction,
            )
          )
            throw new Error("Country scope required");
          data.reviewedBy = req.user?.id;
          data.reviewedAt = new Date().toISOString();
        }
        if (
          data._status === "published" &&
          !(data.approved ?? originalDoc?.approved)
        )
          throw new Error("Approved source required");
        if(data._status==='published' && originalDoc?._status!=='published' && !['owner','reviewer'].includes(req.user?.role||''))throw new Error('Reviewer publication required');
        return data;
      },
    ],
    afterChange: [auditArticle],
  },
  fields: [
    { name: "title", label: "Tên nguồn", type: "text", required: true },
    {
      name: "body",
      label: "Nội dung công khai đã biên tập",
      type: "textarea",
      required: true,
    },
    {
      name: "jurisdiction",
      label: "Quốc gia",
      type: "select",
      required: true,
      options: ["VN", "DE"],
    },
    {
      name: "sourceUrl",
      label: "Nguồn gốc HTTPS",
      type: "text",
      required: true,
      validate: (v: unknown) => {
        try {
          return new URL(String(v)).protocol === "https:" || "HTTPS required";
        } catch {
          return "Valid source URL required";
        }
      },
    },
    {
      name: "effectiveFrom",
      label: "Hiệu lực từ",
      type: "date",
      required: true,
    },
    { name: "expiresAt", label: "Hết hiệu lực", type: "date" },
    {
      name: "reviewDueAt",
      label: "Rà soát trước",
      type: "date",
      required: true,
    },
    {
      name: "approved",
      label: "Đã duyệt cho AI nội bộ",
      type: "checkbox",
      defaultValue: false,
    },
    {
      name: "reviewedBy",
      type: "relationship",
      relationTo: "users",
      access: { create: () => false, update: () => false },
    },
    {
      name: "reviewedAt",
      type: "date",
      access: { create: () => false, update: () => false },
    },
  ],
};
