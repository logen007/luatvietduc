import React from "react";
import { connectionStatus } from "./public";

type WelcomeProps = {
  user?: { name?: string; role?: string } | null;
};
type IconName = "article" | "chat" | "knowledge" | "settings" | "arrow";

function WorkIcon({ name }: { name: IconName }) {
  const paths: Record<IconName, React.ReactNode> = {
    article: <><path d="M7 3h7l4 4v14H5V3h2Z" /><path d="M13 3v5h5M8 12h7M8 16h5" /></>,
    chat: <><path d="M4 4h16v12H9l-5 4V4Z" /><path d="M8 8h8M8 12h5" /></>,
    knowledge: <><path d="M3 4h6l3 2 3-2h6v15h-6l-3 2-3-2H3V4Z" /><path d="M12 6v15" /></>,
    settings: <><path d="M4 6h16M4 12h16M4 18h16" /><circle cx="9" cy="6" r="2" /><circle cx="15" cy="12" r="2" /><circle cx="8" cy="18" r="2" /></>,
    arrow: <path d="M5 12h14m-5-5 5 5-5 5" />,
  };
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

export async function AdminWelcome({ user }: WelcomeProps) {
  const role = user?.role || "";
  const canEdit = ["owner", "support", "editor", "reviewer"].includes(role);
  const canSupport = ["owner", "support", "operations"].includes(role);
  const canKnowledge = ["owner", "knowledge", "reviewer", "support"].includes(role);
  const connections = await connectionStatus();
  const destinations = [
    ...(canEdit ? [{ href: "/admin/collections/articles/create", title: "Viết bài mới", text: "Soạn bài, xem phiên bản và duyệt nội dung theo quốc gia.", icon: "article" as const }] : []),
    ...(canSupport ? [{ href: "/admin/inbox", title: "Hộp thư chuyên viên", text: "Tiếp nhận yêu cầu, trao đổi và theo dõi hội thoại được giao.", icon: "chat" as const }] : []),
    ...(canKnowledge ? [{ href: "/admin/knowledge", title: "Kiến thức AI", text: "Nhập tiêu đề, nội dung và xuất bản bài viết cho trợ lý.", icon: "knowledge" as const }] : []),
    ...(role === "owner" ? [{ href: "/admin/collections/users", title: "Người dùng", text: "Quản lý nhân sự, vai trò và quốc gia được giao.", icon: "settings" as const }, { href: "/admin/settings", title: "Cài đặt hệ thống", text: "Quản lý nhận diện, điều hướng và chính sách vận hành.", icon: "settings" as const }] : []),
  ];
  return (
    <section className="lvd-admin-welcome" aria-labelledby="lvd-admin-welcome-title">
      <header className="lvd-admin-welcome__header">
        <div>
          <p className="lvd-admin-eyebrow">LUẬT VIỆT ĐỨC / QUẢN TRỊ</p>
          <h1 id="lvd-admin-welcome-title">Không gian làm việc.</h1>
          <p className="lvd-admin-welcome__intro">{user?.name ? `Chào ${user.name}. ` : ""}Quản lý nội dung, hỗ trợ bạn đọc và xây dựng kiến thức từ một nơi.</p>
        </div>
        <a className="lvd-admin-website-link" href="/">Mở website <WorkIcon name="arrow" /></a>
      </header>
      {destinations.length > 0 && <nav className="lvd-admin-destinations" aria-label="Khu vực làm việc">
        {destinations.map((item) => <a href={item.href} key={item.href} className="lvd-admin-destination">
          <span className="lvd-admin-destination__icon"><WorkIcon name={item.icon} /></span>
          <span className="lvd-admin-destination__body"><strong>{item.title}</strong><span>{item.text}</span></span>
          <span className="lvd-admin-destination__arrow"><WorkIcon name="arrow" /></span>
        </a>)}
      </nav>}
      <div className="lvd-admin-workflow">
        <p><span className="lvd-admin-workflow__dot" aria-hidden="true" />Nội dung được kiểm duyệt trước khi xuất bản.</p>
        <span>Phân quyền theo Việt Nam / Đức</span>
      </div>
      {role === "owner" && <section className="lvd-admin-connections" aria-labelledby="lvd-admin-connections-title">
        <div className="lvd-admin-connections__heading"><h2 id="lvd-admin-connections-title">Kết nối hệ thống</h2><a href="/admin/settings/connections">Thiết lập kết nối <WorkIcon name="arrow" /></a></div>
        <div className="lvd-admin-connection-list">
          {[{ label: "Google", ready: connections.google }, { label: "Lưu tệp R2", ready: connections.storage }, { label: "Email", ready: connections.email }, { label: "Gemini / FAQ", ready: connections.ai }].map((item) => <div key={item.label} className="lvd-admin-connection"><span>{item.label}</span><span className={item.ready ? "lvd-admin-status lvd-admin-status--configured" : "lvd-admin-status"}>{item.ready ? "Đã cấu hình" : "Chưa kết nối"}</span></div>)}
        </div>
      </section>}
    </section>
  );
}

export async function GoogleLogin() {
  const googleConfigured = (await connectionStatus()).google;
  return (
    <section className="lvd-admin-login" aria-labelledby="lvd-admin-login-title">
      <a href="/" className="lvd-admin-login__brand"><span aria-hidden="true">L</span><strong>Luật Việt Đức</strong></a>
      <p className="lvd-admin-eyebrow">KHÔNG GIAN QUẢN TRỊ</p>
      <h1 id="lvd-admin-login-title">Chào mừng trở lại.</h1>
      <p className="lvd-admin-login__intro">Đăng nhập bằng tài khoản được phân quyền để tiếp tục công việc.</p>
      {googleConfigured ? <><a className="lvd-admin-google-link" href="/auth/google"><svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M20.5 12.2c0-.6-.1-1.2-.2-1.8H12v3.4h4.8c-.2 1.1-.8 2-1.7 2.6v2.2h2.8c1.6-1.5 2.6-3.7 2.6-6.4ZM12 21c2.4 0 4.4-.8 5.9-2.2l-2.8-2.2c-.8.5-1.8.8-3.1.8-2.3 0-4.3-1.6-5-3.7H4.2V16c1.5 3 4.5 5 7.8 5ZM7 13.7a5.4 5.4 0 0 1 0-3.4V8H4.2a9 9 0 0 0 0 8L7 13.7ZM12 6.6c1.4 0 2.6.5 3.5 1.4L18 5.5A8.8 8.8 0 0 0 12 3c-3.3 0-6.3 2-7.8 5L7 10.3c.7-2.1 2.7-3.7 5-3.7Z" /></svg>Tiếp tục bằng Google</a><div className="lvd-admin-login__divider"><span>hoặc dùng tài khoản nhân sự</span></div></> : <p className="lvd-admin-login__notice">Đăng nhập Google đang chờ cấu hình. Vui lòng dùng tài khoản nhân sự bên dưới.</p>}
    </section>
  );
}
