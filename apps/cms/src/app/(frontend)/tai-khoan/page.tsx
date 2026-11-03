"use client";
import { useEffect, useState } from "react";
import { api } from "../../../modules/chat/Workspace";
import { Header } from "../../../modules/shared/Header";
export default function Page() {
  const [data, setData] = useState<any>(null),
    [error, setError] = useState("");
  useEffect(() => {
    api("me")
      .then(setData)
      .catch((e) => setError(e.message));
  }, []);
  return (
    <>
      <Header />
      <main className="container live-page">
        <div className="live-card">
          <p className="live-eyebrow">KHÔNG GIAN CÁ NHÂN</p>
          <h1>
            {data?.user
              ? `Xin chào, ${data.user.name}`
              : "Đăng nhập Luật Việt Đức"}
          </h1>
          {error && <p role="alert">{error}</p>}
          {!data ? (
            <p>Đang kiểm tra phiên đăng nhập…</p>
          ) : data.user ? (
            <>
              <p>
                Lịch sử hội thoại chỉ hiển thị cho bạn và chuyên viên được phân
                công.
              </p>
              <div className="live-actions">
                <a className="button" href="/tro-chuyen">
                  Hội thoại của tôi
                </a>
                {["owner", "support", "operations"].includes(
                  data.user.role,
                ) && (
                  <a className="button secondary" href="/chuyen-vien">
                    Hộp thư chuyên viên
                  </a>
                )}
                {data.user.role !== "member" && (
                  <a className="button secondary" href="/admin">
                    Quản trị nội dung
                  </a>
                )}
                {data.user.role === "owner" && (
                  <a className="button secondary" href="/quan-tri">
                    Kết nối hệ thống
                  </a>
                )}
                <button
                  className="button secondary"
                  onClick={async () => {
                    try {
                      await api("logout", {});
                      location.reload();
                    } catch (e) {
                      setError((e as Error).message);
                    }
                  }}
                >
                  Đăng xuất
                </button>
              </div>
            </>
          ) : (
            <>
              <p>
                Dùng tài khoản Gmail để lưu hội thoại và xem phản hồi trên nhiều
                thiết bị.
              </p>
              {data.connections.google ? (
                <a className="button" href="/auth/google">
                  Tiếp tục bằng Google
                </a>
              ) : (
                <p className="live-notice">
                  Đăng nhập Google đang chờ cấu hình. Bạn vẫn có thể gửi câu hỏi
                  với tư cách khách.
                </p>
              )}
              <p>
                Chỉ sử dụng tên và email để đăng nhập. Không yêu cầu quyền đọc
                hộp thư Gmail.
              </p>
              <div className="live-actions">
                <a className="button secondary" href="/tro-chuyen">
                  Tiếp tục với tư cách khách
                </a>
                <a className="text-link" href="/admin/login">
                  Đăng nhập dành cho nhân sự
                </a>
              </div>
            </>
          )}
        </div>
      </main>
    </>
  );
}
