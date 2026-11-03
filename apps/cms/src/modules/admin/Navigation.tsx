import React from 'react';
export function AdminNavigation({user}:{user?:{role?:string}|null}){
 const role=user?.role||'';
 return <nav className="lvd-admin-navigation" aria-label="Công cụ quản trị">
  {role==='owner'&&<><h3>Hệ thống</h3><a href="/admin/settings">Tổng quan cài đặt</a><a href="/admin/settings/connections">Kết nối dịch vụ</a><a href="/admin/settings/backups">Sao lưu & khôi phục</a></>}
  {['owner','support','operations'].includes(role)&&<a href="/admin/inbox">Hộp thư chuyên viên</a>}
  {['owner','knowledge','reviewer'].includes(role)&&<a href="/admin/knowledge">Kiểm thử kiến thức</a>}
 </nav>;
}
