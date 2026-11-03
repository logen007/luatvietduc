import React from "react";
export function AdminWelcome() {
  return (
    <section
      style={{
        padding: "24px",
        border: "1px solid #ddd",
        borderRadius: 10,
        marginBottom: 24,
      }}
    >
      <h2>Luật Việt Đức — Quản trị</h2>
      <p>
        Soạn bài → gửi duyệt → người duyệt xuất bản. Quyền được giới hạn theo
        quốc gia.
      </p>
      <nav style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
        <a href="/">Website</a>
        <a href="/chuyen-vien">Hộp thư chuyên viên</a>
        <a href="/kien-thuc">Thử kiến thức nội bộ</a>
        <a href="/admin/globals/site-settings">Cài đặt</a>
        <a href="/quan-tri">Trạng thái kết nối</a>
      </nav>
    </section>
  );
}
export function GoogleLogin() {
  return process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET ? (
    <div style={{ marginBottom: 24, textAlign: "center" }}>
      <a href="/auth/google">Đăng nhập bằng Google</a>
    </div>
  ) : (
    <p>
      Đăng nhập Google đang chờ cấu hình. Nhân sự dùng tài khoản được chủ hệ
      thống cấp.
    </p>
  );
}
