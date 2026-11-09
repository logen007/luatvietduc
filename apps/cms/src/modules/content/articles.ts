import type { CollectionConfig } from "payload";
import {permalink} from "../taxonomy/slug";
import {canWriteContent} from '../identity/permissions';
import {
  articleWorkflow,
  createArticle,
  readArticles,
  scopedStaff,
} from "../../access/articles";
import { articleLock, auditArticle } from "./audit";
import {articleLanguageGroup} from "./translation-group";
export const Articles: CollectionConfig = {
  slug: "articles",labels:{singular:"Bài viết",plural:"Bài viết & hỏi đáp"},
  versions: { drafts: { autosave: { interval: 1200, showSaveDraftButton: false } } },
  admin: { group: "Nội dung", useAsTitle: "title",defaultColumns:["title","categories","tags","_status","aiAllowed","updatedAt"],preview:doc=>"/bai-viet/"+doc.slug },
  access: {
    create: createArticle,
    read: readArticles,
    update: scopedStaff,
    delete: ({req})=>canWriteContent(req.user),
    readVersions: scopedStaff,
  },
  hooks: {
    beforeValidate:[({data,originalDoc})=>{if(!data)return data;data.slug=permalink(String(data.slug||originalDoc?.slug||data.title||''));return data;}],
    beforeChange: [articleLock, articleWorkflow, articleLanguageGroup],
    afterChange: [auditArticle],
  },
  fields: [
    {name:'articleLanguages',type:'ui',admin:{components:{Field:'./modules/content/ArticleLanguages#ArticleLanguages'}}},
    {name:'translationGroup',type:'text',admin:{hidden:true,readOnly:true},index:true},
    {name:'title',label:'Tiêu đề',type:'text',required:true,maxLength:240,admin:{className:'lvd-post-title'}},
    {name:'slug',label:'Permalink',type:'text',required:true,unique:true,admin:{components:{Field:'./modules/content/PermalinkField#PermalinkField'},description:'Địa chỉ bài viết: https://luatvietduc.com/bai-viet/ + permalink. Để trống để tự tạo từ tiêu đề.'}},
    {name:'body',label:'Nội dung',type:'textarea',required:true,maxLength:16000,admin:{rows:28,className:'lvd-post-body'}},
    {name:'categories',label:'Danh mục',type:'relationship',relationTo:'categories',hasMany:true,admin:{position:'sidebar',allowCreate:true,description:'Chọn một hoặc nhiều danh mục. Quản lý danh mục cha–con trong Bài viết → Danh mục.'}},
    {name:'tags',label:'Tag',type:'relationship',relationTo:'tags',hasMany:true,admin:{position:'sidebar',allowCreate:true,description:'Vietnam, Germany hoặc tag do anh tạo thêm.'}},
    {
      name: "kind",
      label: "Loại nội dung",
      type: "select",
      defaultValue: "article",
      options: [{label:"Bài viết",value:"article"},{label:"Tin tức",value:"news"},{label:"Hỏi đáp",value:"question"}],admin:{position:"sidebar"},
    },
    {name:"legalField",type:"text",admin:{hidden:true}},
    {name:"effectiveFrom",type:"date",admin:{hidden:true}},
    {name:"reviewDueAt",type:"date",admin:{hidden:true}},
    {name:"reviewedBy",type:"relationship",relationTo:"users",admin:{hidden:true},access:{create:()=>false,update:()=>false}},
    {name:"reviewedAt",type:"date",admin:{hidden:true},access:{create:()=>false,update:()=>false}},
    {
      name: "jurisdiction", label:"Quốc gia",
      type: "select",
      required: true,
      options: ["VN", "DE",{label:"Việt Nam và Đức",value:"BOTH"}],
      defaultValue:"BOTH",admin:{hidden:true},
    },
    { name: "language", label:"Ngôn ngữ nội dung", type: "select", required: true,defaultValue:"vi", options: [{label:"Tiếng Việt",value:"vi"},{label:"Tiếng Đức",value:"de"}],admin:{hidden:true} },
    {
      name: "sourceUrl", label:"Nguồn tham khảo",
      type: "text",
      validate: (v: unknown) => {
        if (!v) return true;
        try {
          return new URL(String(v)).protocol === "https:" || "Vui lòng dùng địa chỉ HTTPS.";
        } catch {
          return "Địa chỉ HTTPS không hợp lệ.";
        }
      },
    },
    {
      name: "reviewState", label:"Trạng thái duyệt",
      type: "select",
      defaultValue: ({user})=>["owner","knowledge","support"].includes(user?.role||"")?"approved":"draft",
      options: [{label:"Nháp",value:"draft"},{label:"Chờ duyệt",value:"pending"},{label:"Đã duyệt",value:"approved"},{label:"Thu hồi",value:"withdrawn"}],admin:{position:"sidebar"},
      access: {
        create: ({ req }) => ["owner", "editor","knowledge","support"].includes(req.user?.role || ""),
        update: ({ req }) =>
          ["owner", "editor", "reviewer","knowledge","support"].includes(req.user?.role || ""),
      },
    },
    {
      name: "aiAllowed", label:"Cho phép dùng cho AI",
      type: "checkbox",
      defaultValue: false,admin:{position:"sidebar",description:"RAG chỉ nhận bài đã xuất bản, được duyệt và đang bật tùy chọn này. Bỏ tick để ngừng dùng ngay."},
      access: {
        create: ({ req }) => ["owner","knowledge","support","reviewer"].includes(req.user?.role||""),
        update: ({ req }) => ["owner","knowledge","support","reviewer"].includes(req.user?.role||""),
      },
    },
  ],
};
