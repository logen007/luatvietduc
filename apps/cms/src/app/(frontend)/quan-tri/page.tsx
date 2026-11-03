"use client";
import { useEffect, useState } from "react";
import { Header } from "../../../modules/shared/Header";
import { api } from "../../../modules/chat/Workspace";
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
      <main className="container live-page">
        <h1>Kết nối hệ thống</h1>
        <p>Chỉ hiển thị trạng thái. Khóa bí mật được cấu hình ở máy chủ.</p>
        {error && <p role="alert">{error}</p>}
        <div className="live-grid">
          {data &&
            Object.entries({
              database: "Cơ sở dữ liệu",
              google: "Đăng nhập Google",
              storage: "Cloudflare R2",
              email: "Email giao dịch",
              ai: "AI thử nội bộ",
              customerAI: "AI cho khách hàng",
            }).map(([key, label]) => (
              <section className="live-card" key={key}>
                <h2>{label}</h2>
                <p>{data[key] ? "Đã cấu hình" : "Chưa bật / chưa cấu hình"}</p>
              </section>
            ))}
        </div>
        <div className="live-actions">
          <a className="button" href="/admin/globals/site-settings">
            Cài đặt website
          </a>
          <a className="button secondary" href="/admin/collections/users">
            Tài khoản & phân quyền
          </a>
          <a className="button secondary" href="/admin/collections/articles">
            Bài viết
          </a>
          <a className="button secondary" href="/admin/collections/knowledge">
            Kho kiến thức
          </a>
          <a
            className="button secondary"
            href="/admin/collections/audit-events"
          >
            Nhật ký thay đổi
          </a>
        </div>
      </main>
    </>
  );
}
