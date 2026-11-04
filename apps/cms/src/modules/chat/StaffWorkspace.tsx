"use client";
import {Header} from '../shared/Header';
import {useWorkspace} from './useWorkspace';
export function StaffWorkspace({embedded=false}:{embedded?:boolean}){
 const staff=true;
 const {me,rows,selected,setSelected,conversation,messages,error,setError,connectionError,text,setText,country,setCountry,internal,setInternal,busy,loaded,notice,maxLength,log,shell,act,send,staffAllowed,startNew}=useWorkspace(true);
  const stateLabel = (value: string) =>
    ({
      queued: "Chờ chuyên viên",
      human: "Đang trao đổi",
      closed: "Đã hoàn tất",
    })[value] || value;
  const specialtyLabel = (value: string) =>
    ({
      general: "Tư vấn chung",
      residence: "Cư trú & quốc tịch",
      family: "Gia đình & thừa kế",
      work: "Lao động",
      business: "Kinh doanh",
    })[value] || value;
  if (staff && loaded && !staffAllowed)
    return (
      <>
        {!embedded && <Header />}
        <main className="container live-page live-access-page">
          <div className="live-empty-state">
            <span className="live-lock-icon" aria-hidden="true">
              ⌑
            </span>
            <h1>Hộp thư chuyên viên</h1>
            <p>
              Đăng nhập bằng tài khoản được phân quyền để xem và xử lý yêu cầu.
            </p>
            {error && (
              <p className="live-error" role="alert">
                {error}
              </p>
            )}
            <a className="button" href="/tai-khoan">
              Đăng nhập tài khoản <span aria-hidden="true">↗</span>
            </a>
            <a className="live-back-link" href="/tro-chuyen">
              Gửi câu hỏi cho chuyên viên ↗
            </a>
          </div>
        </main>
      </>
    );
  return (
    <>
      {!embedded && <Header />}
      <main
        ref={shell}
        className={
          "chat-shell live-shell " +
          (staff ? "live-staff-shell" : "live-customer-shell")
        }
      >
        <aside
          className="chat-sidebar"
          aria-label={staff ? "Danh sách yêu cầu" : "Lịch sử hội thoại"}
        >
          <div className="chat-sidebar-heading">
            <button
              className="button chat-new-button"
              disabled={busy}
              onClick={() => {
                setSelected("");
                
                
                setError("");
              }}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 5v14M5 12h14" />
              </svg>
              {staff ? "Xem hàng chờ" : "Cuộc trò chuyện mới"}
            </button>
          </div>
          <div className="chat-history-heading">
            <span>{staff ? "Yêu cầu" : "Cuộc trò chuyện"}</span>
            <span>{loaded ? String(rows.length).padStart(2, "0") : "—"}</span>
          </div>
          <div className="chat-history">
            {!loaded ? (
              <div className="chat-sidebar-empty" role="status">
                <span className="live-spinner"></span>
                <p>Đang tải hội thoại…</p>
              </div>
            ) : rows.length === 0 ? (
              <div className="chat-sidebar-empty">
                <p>
                  {staff
                    ? "Chưa có yêu cầu trong phạm vi được giao."
                    : "Chưa có cuộc trò chuyện."}
                </p>
              </div>
            ) : (
              rows.map((r) => (
                <button
                  key={r.id}
                  className={
                    "chat-thread " + (selected === r.id ? "active" : "")
                  }
                  disabled={busy}
                  onClick={() => {
                    setError("");
                    setSelected(r.id);
                  }}
                  aria-current={selected === r.id ? "true" : undefined}
                >
                  <span className="chat-thread-country">
                    {r.jurisdiction === "BOTH" ? "Chung" : r.jurisdiction || "Chung"}
                  </span>
                  <span className="chat-thread-copy">
                    <span>
                      {staff
                        ? specialtyLabel(r.specialty || "general")
                        : r.title}
                    </span>
                    <small>{stateLabel(r.state)}</small>
                  </span>
                </button>
              ))
            )}
          </div>
          <div className="chat-sidebar-footer">
            <a className="chat-library-link" href="/#/tra-cuu">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 5v15m0-15C9 3 5 3 3 4v15c3-1 6-1 9 1m0-15c3-2 7-2 9-1v15c-3-1-6-1-9 1" />
              </svg>
              Thư viện pháp luật<span aria-hidden="true">↗</span>
            </a>
            <a className="chat-profile-link" href="/tai-khoan">
              <span className="chat-profile-avatar" aria-hidden="true">
                {me?.user?.name?.charAt(0) || "L"}
              </span>
              <span>
                <strong>{me?.user?.name || "Tài khoản của bạn"}</strong>
                <small>{me?.user ? "Tài khoản của bạn" : "Đăng nhập"}</small>
              </span>
              <span aria-hidden="true">↗</span>
            </a>
          </div>
        </aside>
        <section className="chat-main">
          <header className="chat-top">
            <div className="chat-top-copy">
              <h1>{staff ? "Hộp thư chuyên viên" : "Hỏi chuyên viên"}</h1>
              {conversation && (
                <p className="chat-state">
                  {conversation.jurisdiction} · {stateLabel(conversation.state)}
                </p>
              )}
            </div>
            <div className="chat-top-actions">
              <button
                className="button secondary chat-new-mobile"
                disabled={busy}
                aria-label={staff ? "Về hàng chờ" : "Cuộc trò chuyện mới"}
                onClick={() => {
                  setError("");
                  setSelected("");
                }}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M12 5v14M5 12h14" />
                </svg>
              </button>
              {staff && conversation?.state === "queued" && (
                <button
                  className="button"
                  disabled={busy}
                  onClick={() => act("claim")}
                >
                  Nhận xử lý <span aria-hidden="true">↗</span>
                </button>
              )}
              {staff && conversation?.state === "human" && (
                <button
                  className="button secondary"
                  disabled={busy}
                  onClick={() => act("close")}
                >
                  Hoàn tất <span aria-hidden="true">✓</span>
                </button>
              )}
              {conversation?.state === "closed" && (
                <button
                  className="button secondary"
                  disabled={busy}
                  onClick={() => act("reopen")}
                >
                  Mở lại <span aria-hidden="true">↗</span>
                </button>
              )}
            </div>
          </header>
          <details className="mobile-history">
            <summary>
              <span>{staff ? "Hàng chờ & đang xử lý" : "Cuộc trò chuyện"}</span>
              <span>
                {rows.length} <span aria-hidden="true">⌄</span>
              </span>
            </summary>
            <div>
              {rows.length ? (
                rows.map((r) => (
                  <button
                    key={r.id}
                    className={selected === r.id ? "active" : ""}
                    disabled={busy}
                    aria-current={selected === r.id ? "true" : undefined}
                    onClick={() => {
                      setError("");
                      setSelected(r.id);
                    }}
                  >
                    <span>
                      {staff
                        ? `${r.jurisdiction} · ${specialtyLabel(r.specialty || "general")}`
                        : r.title}
                    </span>
                    <small>{stateLabel(r.state)}</small>
                  </button>
                ))
              ) : (
                <p>
                  {staff
                    ? "Chưa có yêu cầu trong phạm vi được giao."
                    : "Chưa có hội thoại."}
                </p>
              )}
            </div>
          </details>
          <div className="chat-log" ref={log} role="log" aria-live="polite">
            {!selected ? (
              <div className="chat-welcome">
                <h2>
                  {staff
                    ? "Chọn một yêu cầu để bắt đầu."
                    : "Bạn cần làm rõ vấn đề gì?"}
                </h2>
                {(staff || notice) && (
                  <p className="chat-welcome-intro">
                    {staff ? "Nhận xử lý để xem nội dung và phản hồi." : notice}
                  </p>
                )}

              </div>
            ) : messages.length === 0 ? (
              <div className="chat-message-empty">
                <span className="live-small-rule"></span>
                <p>
                  {staff && conversation?.state === "queued"
                    ? "Nhận xử lý yêu cầu để mở nội dung trao đổi."
                    : "Chưa có tin nhắn."}
                </p>
              </div>
            ) : (
              <div className="chat-transcript">
                {messages.map((m) => (
                  <div
                    key={m.id}
                    className={
                      "chat-message " +
                      (m.role === "user" ? "user" : "staff") +
                      (m.internal ? " is-internal" : "")
                    }
                  >
                    <span className="chat-message-avatar" aria-hidden="true">
                      {m.role === "user" ? "B" : "L"}
                    </span>
                    <div className="chat-message-body">
                      <div className="chat-message-meta">
                        <strong>
                          {m.internal
                            ? "Ghi chú nội bộ"
                            : m.role === "user"
                              ? "Bạn đọc"
                              : m.role === "assistant"
                                ? m.metadata?.kind === "ai" ? "Trợ lý AI" : "Luật Việt Đức"
                                : "Chuyên viên"}
                        </strong>
                        <time dateTime={m.created_at}>
                          {new Date(m.created_at).toLocaleString("vi-VN")}
                        </time>
                      </div>
                      <p>{m.body}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          {(error || connectionError) && (
            <p className="live-error chat-error" role="alert">
              <span aria-hidden="true">!</span>
              {error || connectionError}
            </p>
          )}
          <div className="chat-compose-wrap">
            <form className="chat-compose" onSubmit={send} aria-busy={busy}>
              <label className="sr-only" htmlFor="message">
                Tin nhắn
              </label>
              <textarea
                id="message"
                maxLength={maxLength}
                value={text}
                onChange={(e) => setText(e.target.value)}
                disabled={
                  !loaded ||
                  busy ||
                  conversation?.state === "closed" ||
                  (staff && conversation?.state !== "human")
                }
                placeholder={
                  conversation?.state === "closed"
                    ? "Hội thoại đã hoàn tất. Mở lại để tiếp tục."
                    : staff
                      ? "Nhập phản hồi cho bạn đọc…"
                      : "Nhập câu hỏi của bạn…"
                }
                required
              />
              <div className="chat-compose-bottom">
                <button
                  type="submit"
                  disabled={
                    !loaded ||
                    busy ||
                    conversation?.state === "closed" ||
                    (staff && conversation?.state !== "human")
                  }
                  aria-label="Gửi tin nhắn"
                >
                  {busy ? (
                    <span className="live-spinner"></span>
                  ) : (
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M12 19V5M6 11l6-6 6 6" />
                    </svg>
                  )}
                </button>
              </div>
            </form>
            {staff && (
              <label className="chat-internal-toggle">
                <input
                  type="checkbox"
                  checked={internal}
                  onChange={(e) => setInternal(e.target.checked)}
                />
                <span>
                  Ghi chú nội bộ <small>Khách không nhìn thấy</small>
                </span>
              </label>
            )}
            {!staff && !me?.user && (
              <p className="chat-compose-help">
                Giữ trình duyệt này để xem phản hồi.
              </p>
            )}
          </div>
        </section>
      </main>
    </>
  );
}
