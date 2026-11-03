import { Header, Footer } from '../../../modules/shared/Header';
import { IntegrationPanel } from '../../../modules/integrations/Panel';
export default function Page(){
  return <><Header/><main className="container live-page live-settings-page">
    <div className="live-page-heading"><div><p className="live-eyebrow">QUẢN TRỊ / KẾT NỐI</p><h1>Thiết lập kết nối.</h1><p className="live-lead">Quản lý Google, AI, lưu tệp và email từ một nơi. Chỉ chủ hệ thống được thay đổi các kết nối.</p></div><a className="button secondary" href="/admin">Về quản trị ↗</a></div>
    <IntegrationPanel/>
    <section className="live-settings-links"><div><h2>Cài đặt khác</h2></div><nav aria-label="Cài đặt khác"><a href="/admin/globals/site-settings">Tên website, social và chính sách ↗</a><a href="/admin/collections/users">Tài khoản và phân quyền ↗</a><a href="/kien-thuc">Kho FAQ và thử AI nội bộ ↗</a></nav></section>
  </main><Footer/></>;
}
