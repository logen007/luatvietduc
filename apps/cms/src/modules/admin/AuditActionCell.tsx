'use client';
const labels:Record<string,string>={
 'articles.create':'Thêm bài viết','articles.update':'Cập nhật bài viết','articles.delete':'Xóa bài viết',
 'knowledge.create':'Thêm nguồn kiến thức','knowledge.update':'Cập nhật nguồn kiến thức','knowledge.delete':'Xóa nguồn kiến thức',
};
export function AuditActionCell({cellData}:{cellData?:unknown}){
 const value=String(cellData??'');
 return <span title={value}>{labels[value]||value||'—'}</span>;
}
