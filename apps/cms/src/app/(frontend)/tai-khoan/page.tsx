"use client";
import {useLocale} from "../../../modules/shared/locale";
import {usePublicSession} from '../../../modules/shared/session-client';
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
 const {t,language}=useLocale();
  const session=usePublicSession(),data=session.data;
  const [error,setError]=useState('');
  useEffect(()=>{setError(session.status==='error'?'Không thể kiểm tra phiên đăng nhập.':'');},[session.status]);
  return (
    <>
      <Header />
      <main className="container live-page live-auth-page">
        <div className="live-auth-layout">
          <section className="live-auth-intro">
            <div className="live-auth-intro-copy">
              <h2> {t("Hỏi cho rõ.")} <br />
                <span>{t("Làm cho đúng.")}</span>
              </h2>
              <p> {t("Giấy tờ ở Việt Nam, cuộc sống tại Đức — bắt đầu từ điều bạn đang vướng.")} </p>
            </div>
            <div className="live-auth-caption">
              <span className="live-small-rule"></span>{t("Lưu câu hỏi, tài liệu và phản hồi để xem lại khi cần.")} </div>
          </section>
          <section className="live-auth-panel">
            <a className="live-back-link" href="/"> {t("← Trở về website")} </a>
            <p className="live-eyebrow">LUẬT VIỆT ĐỨC</p>
            <h1>
              {data?.user ? t("Xin chào, {name}",{name:data.user.name}) : t("Cuộc trò chuyện của bạn.")}
            </h1>
            {error && (
              <p className="live-error" role="alert">
                {t(error)}
              </p>
            )}
            {!data ? (
              error ? (
                <div className="live-actions">
                  <button className="button" onClick={() => location.reload()}> {t("Thử lại")} </button>
                  <a className="live-text-action" href="/tro-chuyen"> {t("Tiếp tục với tư cách khách ↗")} </a>
                </div>
              ) : (
                <div className="live-loading" role="status">
                  <span className="live-spinner"></span>
                  <p>{t("Đang kiểm tra phiên đăng nhập…")}</p>
                </div>
              )
            ) : data.user ? (
              <>
                <p className="live-lead"> {t("Lịch sử hội thoại chỉ hiển thị cho bạn và chuyên viên được phân công.")} </p>
                <div className="live-account-links">
                  <a className="button" href="/tro-chuyen"> {t("Hội thoại của tôi")} <span aria-hidden="true">↗</span>
                  </a>
                  {["owner", "support"].includes(
                    data.user.role,
                  ) && (
                    <a className="live-account-link" href="/admin/inbox">
                      <span> {t("Hộp thư chuyên viên")} <small>{t("Tiếp nhận và phản hồi yêu cầu")}</small>
                      </span>
                      <span aria-hidden="true">↗</span>
                    </a>
                  )}
                  {["owner","support"].includes(data.user.role) && (
                    <a className="live-account-link" href="/admin">
                      <span> {t("Quản trị nội dung")} <small>{t("Bài viết, nguồn kiến thức và tài khoản")}</small>
                      </span>
                      <span aria-hidden="true">↗</span>
                    </a>
                  )}
                  {data.user.role === "owner" && (
                    <a className="live-account-link" href="/admin/settings">
                      <span> {t("Kết nối hệ thống")} <small>{t("Cài đặt và trạng thái dịch vụ")}</small>
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
                > {t("Đăng xuất tài khoản")} </button>
              </>
            ) : (
              <>
                <p className="live-lead"> {t("Đăng nhập để giữ câu hỏi, tài liệu và phản hồi trong tài khoản.")} </p>
                {data.connections.google ? (
                  <a className="button live-google" href="/auth/google">
                    <GoogleMark /> {t("Tiếp tục bằng Google")} </a>
                ) : (
                  <>
                    <button className="button live-google" disabled>
                      <GoogleMark /> {t("Tiếp tục bằng Google")} </button>
                    <p className="live-inline-notice">
                      <span className="live-status-dot"></span>{t("Đăng nhập Google đang chờ kết nối.")} </p>
                  </>
                )}
                <div className="live-auth-divider">
                  <span>{t("hoặc")}</span>
                </div>
                <a
                  className="button secondary live-guest-link"
                  href="/tro-chuyen"
                > {t("Hỏi ngay, chưa cần đăng nhập")}{" "}
                  <span aria-hidden="true">↗</span>
                </a>
                <p className="live-auth-privacy"> {t("Chỉ sử dụng tên và email để đăng nhập. Không yêu cầu quyền đọc hộp thư Gmail.")} </p>
                <a className="live-staff-link" href="/admin/login"> {t("Bạn là nhân sự?")} <span>{t("Đăng nhập quản trị ↗")}</span>
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
