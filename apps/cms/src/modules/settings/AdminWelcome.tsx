import React from "react";
import {Gutter,SetStepNav} from "@payloadcms/ui";
import {getPayload} from "payload";
import config from "../../payload.config";
import type {User} from "../../payload-types";
import {specialistInbox} from "../chat/inbox";
import { connectionStatus } from "./public";
import {adminCapabilities,adminLinks,adminShortcuts} from '../admin/navigation-model';

type WelcomeProps = {user?:User|null};
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

export function AdminDashboard({user}:WelcomeProps){return <Gutter className="dashboard"><SetStepNav nav={[]}/><AdminWelcome user={user}/></Gutter>;}

export async function AdminWelcome({ user }: WelcomeProps) {
  const can=adminCapabilities(user),canSupport=can.inbox;
  const connections = can.owner ? await connectionStatus() : null;
  const payload=await getPayload({config});
  const results=user?await Promise.allSettled([
    can.content?payload.count({collection:'articles',overrideAccess:false,user}):Promise.resolve(null),
    canSupport?specialistInbox({user,guestHash:''}):Promise.resolve(null),
    can.knowledge?payload.count({collection:'articles',overrideAccess:false,user,where:{and:[{aiAllowed:{equals:true}},{_status:{equals:'published'}},{reviewState:{equals:'approved'}}]}}):Promise.resolve(null),
  ]):[];
  const result=(index:number)=>results[index]?.status==='fulfilled'?results[index].value:null;
  const articles=result(0) as {totalDocs:number}|null,inbox=result(1) as {counts:{queue:number;active:number}}|null,knowledge=result(2) as {totalDocs:number}|null;
  const stats=[...(can.content?[{label:adminLinks.articles.label,value:articles?.totalDocs,href:adminLinks.articles.href,note:'Nội dung bạn có quyền xem'}]:[]),...(canSupport?[{label:'Chờ tiếp nhận',value:inbox?.counts.queue,href:adminLinks.inbox.href,note:'Yêu cầu trong hàng chờ'},{label:'Đang xử lý',value:inbox?.counts.active,href:adminLinks.inbox.href,note:'Hội thoại đã được tiếp nhận'}]:[]),...(can.knowledge?[{label:adminLinks.knowledge.label,value:knowledge?.totalDocs,href:adminLinks.knowledge.href,note:'Bài đã xuất bản và bật dùng cho AI'}]:[])];
  const destinations = adminShortcuts(user);
  return (
    <section className="lvd-admin-welcome" aria-labelledby="lvd-admin-welcome-title">
      <header className="lvd-admin-welcome__header">
        <div>
          <h1 id="lvd-admin-welcome-title">Tổng quan</h1>
          <p className="lvd-admin-welcome__intro">{user?.name ? `Chào ${user.name}. ` : ""}Theo dõi công việc và mở nhanh mục cần xử lý.</p>
        </div>
      </header>
      <div className="lvd-dashboard-stats">{stats.map(stat=><a href={stat.href} key={stat.label}><span>{stat.label}</span><strong>{stat.value===undefined?'—':stat.value.toLocaleString('vi-VN')}</strong><small>{stat.note}</small></a>)}</div>
      <div className="lvd-dashboard-section-title"><h2>Thao tác nhanh</h2></div>
      {destinations.length > 0 && <nav className="lvd-admin-destinations" aria-label="Khu vực làm việc">
        {destinations.map((item) => <a href={item.href} key={item.href} className="lvd-admin-destination">
          <span className="lvd-admin-destination__icon"><WorkIcon name={item.icon} /></span>
          <span className="lvd-admin-destination__body"><strong>{item.title}</strong><span>{item.text}</span></span>
          <span className="lvd-admin-destination__arrow"><WorkIcon name="arrow" /></span>
        </a>)}
      </nav>}
      <div className="lvd-admin-workflow">
        <p><span className="lvd-admin-workflow__dot" aria-hidden="true" />Chỉ bài đã xuất bản và bật dùng cho AI mới được đưa vào kho trả lời.</p>
        <span></span>
      </div>
      {can.owner && connections && <section className="lvd-admin-connections" aria-labelledby="lvd-admin-connections-title">
        <div className="lvd-admin-connections__heading"><h2 id="lvd-admin-connections-title">Kết nối hệ thống</h2><a href={adminLinks.connections.href}>Thiết lập kết nối <WorkIcon name="arrow" /></a></div>
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
