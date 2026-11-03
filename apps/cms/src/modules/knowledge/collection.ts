import type { Access, CollectionConfig } from "payload";
import { articleLock, auditArticle } from "../content/audit";
import { owner } from "../shared/access";
const knowledgeRoles = ["knowledge", "support", "reviewer"];
const knowledgeScope: Access = ({ req }) => {
  if (req.user?.role === "owner") return true;
  if (!req.user || !knowledgeRoles.includes(req.user.role)) return false;
  const countries = (req.user.jurisdictions || []).filter(j => j === "VN" || j === "DE");
  return countries.length ? { jurisdiction: { in: countries } } : false;
};
export const Knowledge: CollectionConfig = {
  slug: "knowledge",
  labels: { singular: "Nguồn kiến thức", plural: "Kho kiến thức AI" },
  admin: {
    group: "Kiến thức",
    useAsTitle: "title",
    description:
      "Nhập FAQ công khai, kiểm tra căn cứ và xuất bản trong quốc gia được giao. Không nhập hồ sơ hay hội thoại riêng. Xuất bản là xác nhận chuyên viên chịu trách nhiệm nội dung.",
  },
  versions: { drafts: true },
  access: {
    read: knowledgeScope,
    readVersions: knowledgeScope,
    create: ({ req, data }) => req.user?.role === "owner" || Boolean(
      req.user && knowledgeRoles.includes(req.user.role) &&
      req.user.jurisdictions?.includes(data?.jurisdiction)
    ),
    update: knowledgeScope,
    delete: owner,
  },
  hooks: {
    beforeChange: [
      articleLock,
      ({ data, originalDoc, req }) => {
        if (
          req.user?.role !== "owner" &&
          !req.user?.jurisdictions?.includes(
            data.jurisdiction ?? originalDoc?.jurisdiction,
          )
        )
          throw new Error("Country scope required");
        if (req.user?.role !== "owner" && !knowledgeRoles.includes(req.user?.role || ""))
          throw new Error("Knowledge staff required");
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
        // Publication is an explicit self-approval of this revision by scoped staff.
        const publishing = data._status === "published" && data.approved !== false;
        if (changed && !publishing) {
          data.approved = false;
          data._status = "draft";
          data.reviewedBy = null; data.reviewedAt = null;
        }
        if(data.approved===false&&originalDoc?.approved===true){data._status='draft';data.reviewedBy=null;data.reviewedAt=null}
        if (publishing || (data.approved === true && originalDoc?.approved !== true)) {
          if (!["owner", ...knowledgeRoles].includes(req.user?.role || ""))
            throw new Error("Knowledge publisher required");
          if (
            req.user?.role !== "owner" &&
            !req.user?.jurisdictions?.includes(
              data.jurisdiction ?? originalDoc?.jurisdiction,
            )
          )
            throw new Error("Country scope required");
          data.approved = true;
          data.reviewedBy = req.user?.id;
          data.reviewedAt = new Date().toISOString();
        }
        if (
          data._status === "published" &&
          !(data.approved ?? originalDoc?.approved)
        )
          throw new Error("Approved source required");
        if(data._status==='published' && originalDoc?._status!=='published' && !['owner',...knowledgeRoles].includes(req.user?.role||''))throw new Error('Reviewer publication required');
        return data;
      },
    ],
    afterChange: [auditArticle],
  },
  fields: [
    { name: "title", label: "Câu hỏi chuẩn / tên nguồn", type: "text", required: true },
    {
      name: "body",
      label: "Câu trả lời chuẩn và phạm vi áp dụng",
      admin: { description: "FAQ gồm: câu trả lời; điều kiện áp dụng; trường hợp loại trừ; khi nào chuyển chuyên viên. Chỉ dùng nội dung công khai đã kiểm chứng." },
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
      label: "Đã xác nhận nội dung cho kho kiến thức AI",
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
