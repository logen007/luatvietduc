'use client';
import {useAuth} from '@payloadcms/ui';
export function ArticleImportActions(){
 const {user}=useAuth();if(!['owner','support'].includes(user?.role||''))return null;
 return <div className="gutter--left gutter--right lvd-article-list-header"><h1>Bài viết</h1><div className="lvd-article-import-actions"><a className="lvd-csv-button" href="/admin/collections/articles/create">Thêm mới</a><a className="lvd-csv-button" href="/admin/articles/import">Nhập CSV</a><a className="lvd-csv-sample" href="/service/article-import" download>CSV mẫu</a></div></div>;
}
