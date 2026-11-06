import type { Access, CollectionConfig } from "payload";
import { articleLock, auditArticle } from "../content/audit";
import {canWriteContent} from '../identity/permissions';
import {lockKnowledgeRules,validateKnowledgeRule,stageNativeRule} from "./rules-hook";
import {knowledgeDefaults} from './content';
const knowledgeRoles = ["knowledge", "support", "reviewer"];
const knowledgeScope: Access = ({ req }) => {
  if (canWriteContent(req.user)) return true;
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
    defaultColumns:['title','categories','tags','_status','entryType','updatedAt'],
    listSearchableFields:['title','body','questionAliases'],
    baseFilter:()=>({articleOrigin:{exists:false}}),
    description:
      "",
  },
  versions: { drafts: true },
  forceSelect:{entryType:true,ruleEnabled:true,updatedAt:true},
  access: {
    read: knowledgeScope,
    readVersions: knowledgeScope,
    create: ({ req }) => canWriteContent(req.user) || Boolean(
      req.user && knowledgeRoles.includes(req.user.role) &&
      req.user.jurisdictions?.some(country=>country==='VN'||country==='DE')
    ),
    update: knowledgeScope,
    delete: ({req})=>req.user?.role==='support'?{articleOrigin:{exists:false}}:req.user?.role==='owner',
  },
  hooks: {
    beforeOperation:[({operation,args,req})=>{if(operation==='create'||operation==='update')req.context.knowledgeDraftOnly='draft' in args&&args.draft===true;return args;}],
    beforeValidate:[({data,originalDoc})=>data?knowledgeDefaults(data,originalDoc):data],
    beforeChange: [
      async args=>{await lockKnowledgeRules(args);return articleLock(args);},
      ({ data, originalDoc, req }) => {
        if(originalDoc?.articleOrigin)throw new Error("Bài viết này được đồng bộ tự động. Hãy chỉnh sửa trong Bài viết.");
        if(!canWriteContent(req.user)&&!req.user?.jurisdictions?.some(country=>country==='VN'||country==='DE'))throw new Error('Country scope required');
        if (
          !canWriteContent(req.user) &&
          (data.jurisdiction ?? originalDoc?.jurisdiction) !== "BOTH" &&
          !req.user?.jurisdictions?.includes(
            data.jurisdiction ?? originalDoc?.jurisdiction,
          )
        )
          throw new Error("Country scope required");
        if (req.user?.role !== "owner" && !knowledgeRoles.includes(req.user?.role || ""))
          throw new Error("Knowledge staff required");
        // The native API normalizes draft=false writes to published before hooks.
        // Preserve the custom service's explicit save/publish intent.
        if(req.context.knowledgeApiPublish===false){data._status='draft';data.approved=false;}
        else if(req.context.knowledgeApiPublish===true)data._status='published';
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
            !canWriteContent(req.user) &&
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
    afterChange: [stageNativeRule,auditArticle],
  },
  fields: [
    {name:'_status',type:'select',options:[],admin:{components:{Field:false,Cell:'./modules/admin/KnowledgeStatusCell#KnowledgeStatusCell'}}},
    {name:"ruleEnabled",label:'Bật quy tắc',type:"checkbox",defaultValue:false,admin:{position:'sidebar',condition:(_data,sibling)=>sibling.entryType==='rule'}},
    {name:"entryType",label:"Loại nội dung",type:"select",defaultValue:"knowledge",options:[{label:"Kiến thức",value:"knowledge"},{label:"Quy tắc trả lời",value:"rule"}],admin:{position:'sidebar'}},
    {name:"articleOrigin",type:"relationship",relationTo:"articles",admin:{hidden:true},access:{create:()=>false,update:()=>false}},
    { name: "title", label: "Tiêu đề", type: "text", required: true,maxLength:240,admin:{className:'lvd-post-title'} },
    {name:'questionAliases',label:'Cách hỏi khác',type:'textarea',maxLength:4000,admin:{position:'sidebar'}},
    {
      name: "body",
      label: "Nội dung",
      admin: {rows:28,className:'lvd-post-body'},
      type: "textarea",
      required: true,
      maxLength:16000,
    },
    {name:'categories',label:'Danh mục',type:'relationship',relationTo:'categories',hasMany:true,admin:{position:'sidebar',allowCreate:true}},
    {name:'tags',label:'Tag',type:'relationship',relationTo:'tags',hasMany:true,admin:{position:'sidebar',allowCreate:true}},
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
      admin:{hidden:true},
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
      admin:{hidden:true},
    },
    { name: "expiresAt", label: "Hết hiệu lực", type: "date",admin:{hidden:true} },
    {
      name: "reviewDueAt",
      label: "Rà soát trước",
      type: "date",
      required: true,
      admin:{hidden:true},
    },
    {
      name: "approved",
      label: "Đã xác nhận nội dung cho kho kiến thức AI",
      type: "checkbox",
      defaultValue: false,
      admin:{hidden:true},
    },
    {
      name: "reviewedBy",
      type: "relationship",
      relationTo: "users",
      admin:{hidden:true},
      access: { create: () => false, update: () => false },
    },
    {
      name: "reviewedAt",
      type: "date",
      admin:{hidden:true},
      access: { create: () => false, update: () => false },
    },
  ],
};
