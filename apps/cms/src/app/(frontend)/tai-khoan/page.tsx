"use client";
import {useLocale} from "../../../modules/shared/locale";
import {usePublicSession} from '../../../modules/shared/session-client';
import { useEffect, useState } from "react";
import { api } from "../../../modules/shared/client-api";
import { Header } from "../../../modules/shared/Header";
import { Footer } from "../../../modules/shared/Footer";
import {AccountForm} from "../../../modules/identity/AccountForm";
export default function Page() {
 const {t}=useLocale();
  const session=usePublicSession(),data=session.data;
  const [error,setError]=useState('');
  const [conversation,setConversation]=useState('');
  useEffect(()=>{const id=new URLSearchParams(window.location.search).get('conversation');if(id&&/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(id))setConversation(id);},[]);
  const returnQuery=conversation?'?conversation='+encodeURIComponent(conversation):'',chatHref='/tro-chuyen'+returnQuery;
  useEffect(()=>{setError(session.status==='error'?'Không thể kiểm tra phiên đăng nhập.':'');},[session.status]);
  return (
    <>
      <Header />
      <main className="container live-page live-auth-page">
        <div className="live-auth-layout">
          <section className="live-auth-intro">
            <div className="live-auth-intro-copy">
              <h2>{t("Mọi trao đổi.")}<br/><span>{t("Trong một tài khoản.")}</span></h2>
              <p>{t("Lưu câu hỏi, tài liệu và phản hồi để tiếp tục khi cần.")}</p>
            </div>
          </section>
          <section className="live-auth-panel">
            {(data?.user||!data)&&<h1>{data?.user?t("Xin chào, {name}",{name:data.user.name||t('Tài khoản')}):t("Create your account")}</h1>}
            {error && (
              <p className="live-error" role="alert">
                {t(error)}
              </p>
            )}
            {!data ? (
              error ? (
                <div className="live-actions">
                  <button className="button" onClick={() => location.reload()}> {t("Thử lại")} </button>
                </div>
              ) : (
                <div className="live-loading" role="status">
                  <span className="live-spinner"></span>
                  <p>{t("Đang kiểm tra phiên đăng nhập…")}</p>
                </div>
              )
            ) : data.user ? (
              <>
                <div className="live-account-links">
                  <a className="button" href={chatHref}> {t("Hội thoại của tôi")} <span aria-hidden="true">↗</span>
                  </a>
                  {["owner", "support"].includes(
                    data.user.role,
                  ) && (
                    <a className="live-account-link" href="/admin/inbox">
                      <span> {t("Hộp thư chuyên viên")}
                      </span>
                      <span aria-hidden="true">↗</span>
                    </a>
                  )}
                  {["owner","support"].includes(data.user.role) && (
                    <a className="live-account-link" href="/admin">
                      <span> {t("Quản trị nội dung")}
                      </span>
                      <span aria-hidden="true">↗</span>
                    </a>
                  )}
                  {data.user.role === "owner" && (
                    <a className="live-account-link" href="/admin/settings">
                      <span> {t("Kết nối hệ thống")}
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
                > {t("Đăng xuất")} </button>
              </>
            ) : (
              <AccountForm google={data.connections.google} conversation={conversation}/>
            )}
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}
