"use client";
import {AppLink} from '../../../modules/shared/AppLink';
import {useLocale} from "../../../modules/shared/locale";
import {loadPublicSession,usePublicSession} from '../../../modules/shared/session-client';
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { api } from "../../../modules/shared/client-api";
import { Header } from "../../../modules/shared/Header";
import { Footer } from "../../../modules/shared/Footer";
import {AccountForm,type AccountRecoveryLink} from "../../../modules/identity/AccountForm";
export default function Page() {
 const {t}=useLocale();
 // Account entry starts at the form, rather than retaining the chat scroll offset.
 useLayoutEffect(()=>{window.scrollTo({top:0,left:0,behavior:'instant'});},[]);
  const session=usePublicSession(),data=session.data;
  const recoveryLink=useRef<AccountRecoveryLink|null>(null);
  useEffect(()=>{if(data?.user)recoveryLink.current=null;},[data?.user]);
  const [error,setError]=useState('');
  const [conversation,setConversation]=useState('');
  useEffect(()=>{const id=new URLSearchParams(window.location.search).get('conversation');if(id&&/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(id))setConversation(id);},[]);
  const returnQuery=conversation?'?conversation='+encodeURIComponent(conversation):'',chatHref='/hoi-dap'+returnQuery;
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
            {data?.user&&<h1>{t("Xin chào, {name}",{name:data.user.name||t('Tài khoản')})}</h1>}
            {error && (
              <p className="live-error" role="alert">
                {t(error)}
              </p>
            )}
            {!data ? (
              error ? (
                <div className="live-actions">
                  <button className="button" onClick={() => {setError('');void loadPublicSession().catch(()=>setError('Không thể kiểm tra phiên đăng nhập.'));}}> {t("Thử lại")} </button>
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
                  <AppLink className="button" href={chatHref}> {t("Hội thoại của tôi")} <span aria-hidden="true">↗</span>
                  </AppLink>
                  {["owner", "support"].includes(
                    data.user.role,
                  ) && (
                    <AppLink className="live-account-link" href="/admin/inbox">
                      <span> {t("Hộp thư chuyên viên")}
                      </span>
                      <span aria-hidden="true">↗</span>
                    </AppLink>
                  )}
                  {["owner","support"].includes(data.user.role) && (
                    <AppLink className="live-account-link" href="/admin">
                      <span> {t("Quản trị nội dung")}
                      </span>
                      <span aria-hidden="true">↗</span>
                    </AppLink>
                  )}
                  {data.user.role === "owner" && (
                    <AppLink className="live-account-link" href="/admin/settings">
                      <span> {t("Kết nối hệ thống")}
                      </span>
                      <span aria-hidden="true">↗</span>
                    </AppLink>
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
              <AccountForm google={data.connections.google} conversation={conversation} recoveryLink={recoveryLink.current} onRecoveryLink={value=>{recoveryLink.current=value;}}/>
            )}
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}
