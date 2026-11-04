// Single source for the custom page heading and native breadcrumb.
const settings={label:'Cài đặt',url:'/admin/settings'};
export const adminPages={
 settings:{title:'Cài đặt',nav:[{label:'Cài đặt'}]},
 connections:{title:'Kết nối dịch vụ',nav:[settings,{label:'Kết nối dịch vụ'}]},
 backups:{title:'Sao lưu & khôi phục',nav:[settings,{label:'Sao lưu & khôi phục'}]},
 knowledge:{title:'Kiến thức AI',nav:[{label:'Kiến thức AI'}]},
 inbox:{title:'Hộp thư',nav:[{label:'Hộp thư'}]},
} as const;
export type AdminPage=keyof typeof adminPages;
