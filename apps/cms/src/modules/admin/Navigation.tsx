import React from 'react';
import {NavigationLinks} from './NavigationLinks';
export function AdminNavigation({user}:{user?:{role?:string}|null}){
 const role=user?.role||'';
 const edit=['owner','editor','reviewer','knowledge','support'].includes(role),knowledge=['owner','knowledge','reviewer','support'].includes(role),support=['owner','support','operations'].includes(role);
 const items=[{label:'Tổng quan',href:'/admin',icon:'home'},...(edit?[{label:'Bài viết',href:'/admin/collections/articles',icon:'post',children:[{label:'Tất cả bài viết',href:'/admin/collections/articles'},{label:'Viết bài mới',href:'/admin/collections/articles/create'},{label:'Danh mục',href:'/admin/collections/categories'},{label:'Tag',href:'/admin/collections/tags'}]},{label:'Thư viện tệp',href:'/admin/collections/media',icon:'media'}]:[]),...(knowledge?[{label:'Kiến thức AI',href:'/admin/knowledge',icon:'knowledge'}]:[]),...(support?[{label:'Hộp thư',href:'/admin/inbox',icon:'chat'}]:[]),...(role==='owner'?[{label:'Người dùng',href:'/admin/collections/users',icon:'users',children:[{label:'Tất cả người dùng',href:'/admin/collections/users'},{label:'Thêm mới',href:'/admin/collections/users/create'}]},{label:'Cài đặt',href:'/admin/settings',icon:'settings',children:[{label:'Website & giao diện',href:'/admin/globals/site-settings'},{label:'Kết nối dịch vụ',href:'/admin/settings/connections'},{label:'Sao lưu & khôi phục',href:'/admin/settings/backups'},{label:'Nhật ký hoạt động',href:'/admin/collections/audit-events'}]}]:[])];
 return <NavigationLinks items={items}/>;
}
