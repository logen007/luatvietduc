"use client";
import { useEffect, useState } from "react";
import { api } from "../../../modules/shared/client-api";
import { Header } from "../../../modules/shared/Header";
import { Footer } from "../../../modules/shared/Footer";
function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M21.6 12.23c0-.71-.06-1.39-.18-2.05H12v3.88h5.38a4.6 4.6 0 0 1-2 3.02v2.51h3.25c1.9-1.75 2.97-4.33 2.97-7.36Z"
      />
      <path
        fill="#34A853"
        d="M12 22c2.7 0 4.96-.9 6.62-2.41l-3.25-2.51c-.9.6-2.05.96-3.37.96-2.6 0-4.81-1.76-5.6-4.12H3.04v2.6A10 10 0 0 0 12 22Z"
      />
      <path
        fill="#FBBC05"
        d="M6.4 13.92A6 6 0 0 1 6.1 12c0-.67.11-1.32.3-1.92V7.49H3.04A10 10 0 0 0 2 12c0 1.61.38 3.13 1.04 4.51l3.36-2.59Z"
      />
      <path
        fill="#EA4335"
        d="M12 5.96c1.47 0 2.79.51 3.83 1.51l2.87-2.87A9.6 9.6 0 0 0 12 2a10 10 0 0 0-8.96 5.49l3.36 2.59C7.19 7.72 9.4 5.96 12 5.96Z"
      />
    </svg>
  );
}
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
      <main className="container live-page live-auth-page">
        <div className="live-auth-layout">
          <section className="live-auth-intro">
            <div className="live-auth-intro-copy">
              <span className="live-eyebrow">KHÔNG GIAN CÁ NHÂN</span>
              <h2>
                Những câu hỏi quan trọng.
                <br />
                <span>Một nơi để tiếp nối.</span>
              </h2>
              <p>
                Theo dõi trao đổi pháp luật Việt Nam và Đức, từ câu hỏi đầu tiên
                đến phản hồi của chuyên viên.
              </p>
            </div>
            <div className="live-auth-caption">
              <span className="live-small-rule"></span>Rõ ràng trong thông tin.
              Riêng tư trong trao đổi.
            </div>
          </section>
          <section className="live-auth-panel">
            <a className="live-back-link" href="/">
              ← Trở về website
            </a>
            <p className="live-eyebrow">LUẬT VIỆT ĐỨC</p>
            <h1>
              {data?.user ? `Xin chào, ${data.user.name}` : "Chào mừng bạn."}
            </h1>
            {error && (
              <p className="live-error" role="alert">
                {error}
              </p>
            )}
            {!data ? (
              error ? (
                <div className="live-actions">
                  <button className="button" onClick={() => location.reload()}>
                    Thử lại
                  </button>
                  <a className="live-text-action" href="/tro-chuyen">
                    Tiếp tục với tư cách khách ↗
                  </a>
                </div>
              ) : (
                <div className="live-loading" role="status">
                  <span className="live-spinner"></span>
                  <p>Đang kiểm tra phiên đăng nhập…</p>
                </div>
              )
            ) : data.user ? (
              <>
                <p className="live-lead">
                  Lịch sử hội thoại chỉ hiển thị cho bạn và chuyên viên được
                  phân công.
                </p>
                <div className="live-account-links">
                  <a className="button" href="/tro-chuyen">
                    Hội thoại của tôi <span aria-hidden="true">↗</span>
                  </a>
                  {["owner", "support", "operations"].includes(
                    data.user.role,
                  ) && (
                    <a className="live-account-link" href="/admin/inbox">
                      <span>
                        Hộp thư chuyên viên
                        <small>Tiếp nhận và phản hồi yêu cầu</small>
                      </span>
                      <span aria-hidden="true">↗</span>
                    </a>
                  )}
                  {data.user.role !== "member" && (
                    <a className="live-account-link" href="/admin">
                      <span>
                        Quản trị nội dung
                        <small>Bài viết, nguồn kiến thức và tài khoản</small>
                      </span>
                      <span aria-hidden="true">↗</span>
                    </a>
                  )}
                  {data.user.role === "owner" && (
                    <a className="live-account-link" href="/admin/settings">
                      <span>
                        Kết nối hệ thống
                        <small>Cài đặt và trạng thái dịch vụ</small>
                      </span>
                      <span aria-hidden="true">↗</span>
                    </a>
                  )}
                </div>
                <button
                  className="live-signout"
                  onClick={async () => {
                    try {
                      await api("logout", {});
                      location.reload();
                    } catch (e) {
                      setError((e as Error).message);
                    }
                  }}
                >
                  Đăng xuất tài khoản
                </button>
              </>
            ) : (
              <>
                <p className="live-lead">
                  Đăng nhập để lưu hội thoại và xem phản hồi trên nhiều thiết
                  bị.
                </p>
                {data.connections.google ? (
                  <a className="button live-google" href="/auth/google">
                    <GoogleMark />
                    Tiếp tục bằng Google
                  </a>
                ) : (
                  <>
                    <button className="button live-google" disabled>
                      <GoogleMark />
                      Tiếp tục bằng Google
                    </button>
                    <p className="live-inline-notice">
                      <span className="live-status-dot"></span>Đăng nhập Google
                      đang chờ kết nối.
                    </p>
                  </>
                )}
                <div className="live-auth-divider">
                  <span>hoặc</span>
                </div>
                <a
                  className="button secondary live-guest-link"
                  href="/tro-chuyen"
                >
                  Gửi câu hỏi với tư cách khách{" "}
                  <span aria-hidden="true">↗</span>
                </a>
                <p className="live-auth-privacy">
                  Chỉ sử dụng tên và email để đăng nhập. Không yêu cầu quyền đọc
                  hộp thư Gmail.
                </p>
                <a className="live-staff-link" href="/admin/login">
                  Bạn là nhân sự? <span>Đăng nhập quản trị ↗</span>
                </a>
              </>
            )}
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}
