"use client";
import { useEffect, useState } from "react";
import { Header, Footer } from "../../../modules/shared/Header";
import { api } from "../../../modules/chat/Workspace";
const connections = [
  {
    key: "database",
    label: "Cơ sở dữ liệu",
    detail: "Dữ liệu nội dung, tài khoản và hội thoại.",
    icon: "◫",
  },
  {
    key: "google",
    label: "Đăng nhập Google",
    detail: "Nhận diện tài khoản bằng Gmail.",
    icon: "G",
  },
  {
    key: "storage",
    label: "Cloudflare R2",
    detail: "Lưu trữ ảnh và tệp nội dung.",
    icon: "▱",
  },
  {
    key: "email",
    label: "Email giao dịch",
    detail: "Xác thực, khôi phục và thông báo.",
    icon: "↗",
  },
  {
    key: "ai",
    label: "AI thử nội bộ",
    detail: "Kiểm thử trên nguồn công khai đã duyệt.",
    icon: "✳",
  },
  {
    key: "customerAI",
    label: "AI cho khách hàng",
    detail: "Trạng thái trợ lý trong chat công khai.",
    icon: "✧",
  },
];
export default function Page() {
  const [data, setData] = useState<any>(null),
    [error, setError] = useState("");
  useEffect(() => {
    api("connections")
      .then(setData)
      .catch((e) => setError(e.message));
  }, []);
  return (
    <>
      <Header />
      <main className="container live-page live-settings-page">
        <div className="live-page-heading">
          <div>
            <p className="live-eyebrow">VẬN HÀNH / KẾT NỐI</p>
            <h1>
              Mọi kết nối.
              <br />
              <span>Một góc nhìn rõ ràng.</span>
            </h1>
            <p className="live-lead">
              Theo dõi trạng thái các dịch vụ của Luật Việt Đức. Khóa bí mật
              được cấu hình riêng trên máy chủ.
            </p>
          </div>
          <a className="button" href="/admin/globals/site-settings">
            Cài đặt website <span aria-hidden="true">↗</span>
          </a>
        </div>
        {error && (
          <p className="live-error" role="alert">
            {error}
          </p>
        )}
        {!data && !error && (
          <div className="live-loading" role="status">
            <span className="live-spinner"></span>
            <p>Đang kiểm tra kết nối…</p>
          </div>
        )}
        <div className="live-grid live-connection-grid">
          {data &&
            connections.map((item) => (
              <section
                className="live-card live-connection-card"
                key={item.key}
              >
                <div className="live-connection-top">
                  <span className="live-connection-icon" aria-hidden="true">
                    {item.icon}
                  </span>
                  <span
                    className={
                      "live-status " +
                      (data[item.key] ? "is-ready" : "is-pending")
                    }
                  >
                    <i></i>
                    {data[item.key] ? "Đã cấu hình" : "Chưa kết nối"}
                  </span>
                </div>
                <h2>{item.label}</h2>
                <p>{item.detail}</p>
              </section>
            ))}
        </div>
        <section className="live-settings-links">
          <div>
            <p className="live-eyebrow">TRUY CẬP NHANH</p>
            <h2>
              Quản lý từng phần,
              <br />
              thay đổi dễ dàng.
            </h2>
          </div>
          <nav aria-label="Các khu vực quản trị">
            <a href="/admin/collections/users">
              <span>Tài khoản & phân quyền</span>
              <span aria-hidden="true">↗</span>
            </a>
            <a href="/admin/collections/articles">
              <span>Bài viết & hỏi đáp</span>
              <span aria-hidden="true">↗</span>
            </a>
            <a href="/admin/collections/knowledge">
              <span>Kho kiến thức AI</span>
              <span aria-hidden="true">↗</span>
            </a>
            <a href="/admin/collections/audit-events">
              <span>Nhật ký thay đổi</span>
              <span aria-hidden="true">↗</span>
            </a>
          </nav>
        </section>
      </main>
      <Footer />
    </>
  );
}
