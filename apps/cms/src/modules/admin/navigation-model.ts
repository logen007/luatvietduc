// Presentation hints only. Payload and each service enforce authorization.
export type AdminViewer={role?:string;name?:string;jurisdictions?:readonly string[]|null};
export type AdminLink={label:string;href:string};
export type AdminNavItem=AdminLink&{section?:string;icon:string;children?:AdminLink[]};
export const adminLinks={
 dashboard:{label:'Tổng quan',href:'/admin'},
 articles:{label:'Bài viết',href:'/admin/collections/articles'},
 allArticles:{label:'Tất cả bài viết',href:'/admin/collections/articles'},
 writeArticle:{label:'Viết bài mới',href:'/admin/collections/articles/create'},
 categories:{label:'Danh mục',href:'/admin/collections/categories'},
 tags:{label:'Tag',href:'/admin/collections/tags'},
 media:{label:'Thư viện tệp',href:'/admin/collections/media'},
 knowledge:{label:'Kiến thức AI',href:'/admin/knowledge'},
 inbox:{label:'Hộp thư',href:'/admin/inbox'},
 users:{label:'Người dùng',href:'/admin/collections/users'},
 allUsers:{label:'Tất cả người dùng',href:'/admin/collections/users'},
 createUser:{label:'Thêm mới',href:'/admin/collections/users/create'},
 settings:{label:'Cài đặt',href:'/admin/settings'},
 website:{label:'Website & giao diện',href:'/admin/globals/site-settings'},
 quickReplies:{label:'Câu trả lời nhanh',href:'/admin/collections/quick-replies'},
 connections:{label:'Kết nối dịch vụ',href:'/admin/settings/connections'},
 backups:{label:'Sao lưu & khôi phục',href:'/admin/settings/backups'},
 audit:{label:'Nhật ký hoạt động',href:'/admin/collections/audit-events'},
} as const;

export function adminCapabilities(viewer?:AdminViewer|null){
 const owner=viewer?.role==='owner',staff=viewer?.role==='support',enter=owner||staff;
 return {enter,owner,content:enter,knowledge:enter,inbox:enter,write:owner||(staff&&Boolean(viewer?.jurisdictions?.some(country=>country==='VN'||country==='DE')))};
}
export function adminNavigation(viewer?:AdminViewer|null):AdminNavItem[]{
 const can=adminCapabilities(viewer);if(!can.enter)return [];
 return [
  {...adminLinks.dashboard,section:'Điều hành',icon:'home'},
  {...adminLinks.articles,section:'Nội dung',icon:'post',children:[adminLinks.allArticles,...(can.write?[adminLinks.writeArticle]:[]),adminLinks.categories,adminLinks.tags]},
  {...adminLinks.media,icon:'media'},
  {...adminLinks.knowledge,icon:'knowledge'},
  {...adminLinks.inbox,section:'Hỗ trợ khách',icon:'chat'},
  ...(can.owner?[
   {...adminLinks.users,section:'Hệ thống',icon:'users',children:[adminLinks.allUsers,adminLinks.createUser]},
   {...adminLinks.settings,icon:'settings',children:[adminLinks.website,adminLinks.quickReplies,adminLinks.connections,adminLinks.backups,adminLinks.audit]},
  ]:[]),
 ];
}
export const adminSettingsSections=[
 {title:'Website',items:[adminLinks.website,adminLinks.quickReplies]},
 {title:'Kết nối',items:[adminLinks.connections]},
 {title:'Bảo trì',items:[adminLinks.backups,adminLinks.audit]},
];
type Shortcut={href:string;title:string;text:string;icon:'article'|'chat'|'knowledge'|'settings'};
export function adminShortcuts(viewer?:AdminViewer|null):Shortcut[]{
 const can=adminCapabilities(viewer);if(!can.enter)return [];
 return [
  ...(can.write?[{href:adminLinks.writeArticle.href,title:adminLinks.writeArticle.label,text:'Soạn nội dung, chọn danh mục và xuất bản.',icon:'article' as const}]:[]),
  {href:adminLinks.inbox.href,title:adminLinks.inbox.label,text:'Tiếp nhận yêu cầu, trao đổi và theo dõi hội thoại được giao.',icon:'chat'},
  {href:adminLinks.knowledge.href,title:adminLinks.knowledge.label,text:'Quản lý nội dung được phép dùng để trả lời khách.',icon:'knowledge'},
  ...(can.owner?[
   {href:adminLinks.users.href,title:adminLinks.users.label,text:'Quản lý Admin, Chuyên viên và User.',icon:'settings' as const},
   {href:adminLinks.settings.href,title:adminLinks.settings.label,text:'Quản lý nhận diện, điều hướng và chính sách vận hành.',icon:'settings' as const},
  ]:[]),
 ];
}
