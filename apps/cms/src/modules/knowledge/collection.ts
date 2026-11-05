import type { Access, CollectionConfig } from "payload";
import { articleLock, auditArticle } from "../content/audit";
import { owner } from "../shared/access";
import {lockKnowledgeRules,validateKnowledgeRule} from "./rules-hook";
const knowledgeRoles = ["knowledge", "support", "reviewer"];
const knowledgeScope: Access = ({ req }) => {
  if (req.user?.role === "owner") return true;
  if (!req.user || !knowledgeRoles.includes(req.user.role)) return false;
  const countries = (req.user.jurisdictions || []).filter(j => j === "VN" || j === "DE");
  return countries.length ? { jurisdiction: { in: [...countries,"BOTH"] } } : false;
};
export const Knowledge: CollectionConfig = {
  slug: "knowledge",
  labels: { singular: "Nguồn kiến thức", plural: "Kho kiến thức AI" },
  admin: {
    group: "Kiến thức",
    useAsTitle: "title",
    description:
      "",
  },
  versions: { drafts: true },
  access: {
    read: knowledgeScope,
    readVersions: knowledgeScope,
    create: ({ req }) => req.user?.role === "owner" || Boolean(
      req.user && knowledgeRoles.includes(req.user.role) &&
      req.user.jurisdictions?.length
    ),
    update: knowledgeScope,
    delete: owner,
  },
  hooks: {
    beforeChange: [
      async args=>{await lockKnowledgeRules(args);return articleLock(args);},
      ({ data, originalDoc, req }) => {
        if(originalDoc?.articleOrigin)throw new Error("Bài viết này được đồng bộ tự động. Hãy chỉnh sửa trong Bài viết.");
        if (
          req.user?.role !== "owner" &&
          (data.jurisdiction ?? originalDoc?.jurisdiction) !== "BOTH" &&
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
            "questionAliases",
            "entryType",
            "ruleEnabled",
          ].some((k) => k in data && data[k] !== originalDoc[k]);
        // Publication is an explicit self-approval of this revision by scoped staff.
        const withdrawing=data.approved===false&&originalDoc?.approved===true;
        const publishing = data._status === "published" && !withdrawing;
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
            (data.jurisdiction ?? originalDoc?.jurisdiction) !== "BOTH" &&
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
      validateKnowledgeRule,
    ],
    beforeDelete:[async({req})=>{await lockKnowledgeRules({req});}],
    afterChange: [auditArticle],
  },
  fields: [
    {name:"ruleEnabled",type:"checkbox",defaultValue:false,admin:{hidden:true}},
    {name:"entryType",label:"Loại nội dung",type:"select",defaultValue:"knowledge",options:[{label:"Kiến thức",value:"knowledge"},{label:"Quy tắc trả lời",value:"rule"}]},
    {name:"articleOrigin",type:"relationship",relationTo:"articles",admin:{hidden:true},access:{create:()=>false,update:()=>false}},
    { name: "title", label: "Tiêu đề", type: "text", required: true },
    {name:'questionAliases',label:'Cách hỏi khác đã được chuyên viên xác nhận',type:'textarea',maxLength:4000,admin:{description:'Mỗi dòng một câu hỏi có cùng phạm vi và điều kiện với câu hỏi chuẩn. Không bắt buộc. AI còn tìm theo ý nghĩa trong nội dung bài viết.'}},
    {
      name: "body",
      label: "Nội dung",
      admin: { description: "FAQ gồm: câu trả lời; điều kiện áp dụng; trường hợp loại trừ; khi nào chuyển chuyên viên. Chỉ dùng nội dung đã được kiểm chứng và cho phép dùng để trả lời khách." },
      type: "textarea",
      required: true,
    },
    {
      name: "jurisdiction",
      label: "Quốc gia",
      type: "select",
      required: true,
      options: ["VN", "DE", {label:"Kiến thức chung Việt Nam và Đức",value:"BOTH"}],
      defaultValue:"BOTH",
      admin:{hidden:true},
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
