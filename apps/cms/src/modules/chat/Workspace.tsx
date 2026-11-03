"use client";
import { useEffect, useRef, useState } from "react";
import { Header } from "../shared/Header";
export async function api(path: string, data?: unknown) {
  let response: Response;
  try {
    response = await fetch("/service/" + path, {
      method: data ? "POST" : "GET",
      headers: data ? { "content-type": "application/json" } : undefined,
      body: data ? JSON.stringify(data) : undefined,
      cache: "no-store",
    });
  } catch {
    throw new Error("Không thể kết nối. Vui lòng kiểm tra mạng và thử lại.");
  }
  const result = await response.json().catch(() => null);
  if (!response.ok)
    throw new Error(
      result?.error || "Dịch vụ tạm thời chưa sẵn sàng. Vui lòng thử lại.",
    );
  if (result === null)
    throw new Error("Không thể đọc phản hồi của dịch vụ. Vui lòng thử lại.");
  return result;
}
export function Workspace({ staff = false }: { staff?: boolean }) {
  const [me, setMe] = useState<any>(null),
    [rows, setRows] = useState<any[]>([]),
    [selected, setSelected] = useState(""),
    [conversation, setConversation] = useState<any>(null),
    [messages, setMessages] = useState<any[]>([]),
    [error, setError] = useState(""),
    [connectionError, setConnectionError] = useState(""),
    [text, setText] = useState(""),
    [country, setCountry] = useState("VN"),
    [consent, setConsent] = useState(false),
    [internal, setInternal] = useState(false),
    [busy, setBusy] = useState(false),
    [loaded, setLoaded] = useState(false),
    [notice, setNotice] = useState(""),
    [specialty, setSpecialty] = useState("general");
  const [maxLength, setMaxLength] = useState(2000);
  const pending = useRef<{
      key: string;
      body: string;
      internal: boolean;
    } | null>(null),
    log = useRef<HTMLDivElement>(null),
    shell = useRef<HTMLElement>(null);
  // visualViewport tracks the remaining visible area when mobile keyboards open.
  // Keep this scoped to this workspace; no document-wide layout state is changed.
  useEffect(() => {
    const viewport = window.visualViewport;
    const measure = () => {
      const height = viewport && viewport.scale === 1 ? viewport.height : window.innerHeight;
      const element = shell.current;
      if (!element) return;
      element.style.setProperty("--lvd-chat-vh", `${height}px`);
      element.dataset.compactViewport = String(height <= 620);
      element.dataset.shortViewport = String(height <= 420);
    };
    measure();
    window.addEventListener("resize", measure);
    viewport?.addEventListener("resize", measure);
    return () => {
      window.removeEventListener("resize", measure);
      viewport?.removeEventListener("resize", measure);
    };
  }, []);
  const refreshList = async () => {
    const v = await api(staff ? "queue" : "conversations");
    setRows(v);
    return v;
  };
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const user = await api("me");
        if (!active) return;
        setMe(user);
        const s = await api("settings");
        if (active) {
          setNotice(
            [
              s.supportNotice,
              s.officeHours ? `Giờ trực (${s.timeZone}): ${s.officeHours}` : "",
            ]
              .filter(Boolean)
              .join(" "),
          );
          setMaxLength(s.maxMessageLength || 2000);
        }
        const list = await refreshList();
        if (active && !staff && list[0]) setSelected(list[0].id);
      } catch (e) {
        if (active) setError((e as Error).message);
      } finally {
        if (active) setLoaded(true);
      }
    })();
    const draft = sessionStorage.getItem("lvd-question");
    if (draft) {
      setText(draft);
      sessionStorage.removeItem("lvd-question");
    }
    return () => {
      active = false;
    };
  }, [staff]);
  useEffect(() => {
    if (!selected) {
      setMessages([]);
      setConversation(null);
      setConnectionError("");
      return;
    }
    let active = true,
      cursor = 0;
    const load = async () => {
      try {
        const v = await api(`conversations/${selected}?after=${cursor}`);
        if (!active) return;
        setConversation(v.conversation);
        setRows((current) => current.map((row) => row.id === v.conversation.id
          ? { ...row, state: v.conversation.state, version: v.conversation.version }
          : row));
        if (v.messages.length) {
          cursor = Number(v.messages.at(-1).id);
          setMessages((old) => {
            const ids = new Set(old.map((m) => m.id));
            return [...old, ...v.messages.filter((m: any) => !ids.has(m.id))];
          });
        }
        setConnectionError("");
      } catch (e) {
        if (active) setConnectionError((e as Error).message);
      }
    };
    setMessages([]);
    setConnectionError("");
    load();
    const timer = setInterval(load, 2500);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [selected]);
  useEffect(() => {
    log.current?.scrollTo({
      top: log.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages.length]);
  useEffect(() => {
    if (!staff || !me?.user) return;
    const timer = setInterval(() => refreshList().catch(() => {}), 5000);
    return () => clearInterval(timer);
  }, [staff, me]);
  const act = async (action: string) => {
    if (!conversation) return;
    setBusy(true);
    try {
      await api(`conversations/${selected}/transition`, {
        action,
        version: conversation.version,
      });
      setConversation((await api(`conversations/${selected}`)).conversation);
      await refreshList();
      setError("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || busy || !loaded) return;
    setBusy(true);
    setError("");
    try {
      let id = selected;
      if (!id) {
        if (!consent)
          throw new Error("Vui lòng đồng ý chuyển nội dung cho chuyên viên.");
        const c = await api("conversations", {
          jurisdiction: country,
          specialty,
          consent,
        });
        id = c.id;
        setSelected(id);
      }
      if (
        !pending.current ||
        pending.current.body !== text.trim() ||
        pending.current.internal !== internal
      )
        pending.current = {
          key: crypto.randomUUID(),
          body: text.trim(),
          internal,
        };
      await api(`conversations/${id}/messages`, pending.current);
      pending.current = null;
      setText("");
      await refreshList();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const staffAllowed =
    me?.user && ["owner", "support", "operations"].includes(me.user.role);
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
        <Header />
        <main className="container live-page live-access-page">
          <div className="live-empty-state">
            <span className="live-lock-icon" aria-hidden="true">
              ⌑
            </span>
            <p className="live-eyebrow">KHÔNG GIAN CHUYÊN VIÊN</p>
            <h1>
              Một không gian
              <br />
              dành cho nhân sự.
            </h1>
            <p>
              Cần tài khoản được phân quyền hỗ trợ để truy cập hộp thư và tiếp
              nhận hội thoại.
            </p>
            {error && <p className="live-error" role="alert">{error}</p>}
            <a className="button" href="/tai-khoan">
              Đăng nhập tài khoản <span aria-hidden="true">↗</span>
            </a>
            <a className="live-back-link" href="/tro-chuyen">
              Bạn muốn đặt câu hỏi? Gặp chuyên viên →
            </a>
          </div>
        </main>
      </>
    );
  return (
    <>
      <Header />
      <main
        ref={shell}
        className={
          "chat-shell live-shell " +
          (staff ? "live-staff-shell" : "live-customer-shell")
        }
      >
        <aside className="chat-sidebar">
          <div className="chat-sidebar-heading">
            <span className="live-eyebrow">
              {staff ? "KHÔNG GIAN CHUYÊN VIÊN" : "KHÔNG GIAN CỦA BẠN"}
            </span>
            <button
              className="button chat-new-button"
              disabled={busy}
              onClick={() => {
                setSelected("");
                setConversation(null);
                setMessages([]);
                setError("");
              }}
            >
              <span aria-hidden="true">＋</span>
              {staff ? "Hàng chờ chuyên viên" : "Cuộc trò chuyện mới"}
            </button>
          </div>
          <div className="chat-history-heading">
            <span>{staff ? "Hàng chờ & đang xử lý" : "Hội thoại gần đây"}</span>
            <span>{loaded ? String(rows.length).padStart(2, "0") : "—"}</span>
          </div>
          <div className="chat-history">
            {!loaded ? (
              <div className="chat-sidebar-empty" role="status">
                <span className="live-spinner"></span>
                <p>Đang kết nối…</p>
              </div>
            ) : rows.length === 0 ? (
              <div className="chat-sidebar-empty">
                <span className="chat-empty-lines" aria-hidden="true">
                  <i></i>
                  <i></i>
                  <i></i>
                </span>
                <p>
                  {staff
                    ? "Chưa có yêu cầu trong phạm vi được giao."
                    : "Những cuộc trao đổi của bạn sẽ xuất hiện tại đây."}
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
                    {r.jurisdiction || "VN"}
                  </span>
                  <span className="chat-thread-copy">
                    <span>
                      {staff
                        ? specialtyLabel(r.specialty || "general")
                        : r.title}
                    </span>
                    <small>{stateLabel(r.state)}</small>
                  </span>
                  <span aria-hidden="true" className="chat-thread-arrow">
                    ↗
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
                <small>
                  {me?.user
                    ? "Xem không gian cá nhân"
                    : "Đăng nhập để giữ lịch sử"}
                </small>
              </span>
              <span aria-hidden="true">↗</span>
            </a>
          </div>
        </aside>
        <section className="chat-main">
          <header className="chat-top">
            <div>
              <p className="live-eyebrow">
                {staff ? "HỘP THƯ HỖ TRỢ" : "VIỆT NAM & ĐỨC"}
              </p>
              <h1>{staff ? "Hộp thư chuyên viên" : "Hỏi đáp pháp luật"}</h1>
              <p className="chat-state">
                <span
                  className={
                    "live-status-dot " +
                    (conversation?.state === "human" ? "is-ready" : "")
                  }
                ></span>
                {conversation
                  ? `${conversation.jurisdiction} · ${stateLabel(conversation.state)}`
                  : "Chuyên viên hỗ trợ · AI chưa bật cho khách"}
              </p>
            </div>
            <div className="chat-top-actions">
              <span className="chat-private-label">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M7 10V7a5 5 0 0 1 10 0v3M5 10h14v11H5zM12 14v3" />
                </svg>
                Trao đổi riêng tư
              </span>
              <button
                className="button secondary chat-new-mobile"
                disabled={busy}
                onClick={() => {
                  setError("");
                  setSelected("");
                }}
              >
                Mới <span aria-hidden="true">＋</span>
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
                  Mở lại hội thoại <span aria-hidden="true">↗</span>
                </button>
              )}
            </div>
          </header>
          <details className="mobile-history">
            <summary>
              <span>
                {staff ? "Hàng chờ & đang xử lý" : "Hội thoại gần đây"}
              </span>
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
                <div className="chat-welcome-symbol" aria-hidden="true">
                  <svg viewBox="0 0 32 32">
                    <path d="M7 7h18v14H14l-7 5V7zm5 6h8m-8 4h5" />
                  </svg>
                </div>
                <p className="live-eyebrow">
                  {staff
                    ? "TIẾP NHẬN & ĐỒNG HÀNH"
                    : "BẮT ĐẦU MỘT CUỘC TRAO ĐỔI"}
                </p>
                <h2>
                  {staff ? (
                    <>
                      Mỗi yêu cầu.
                      <br />
                      <span>Một người đồng hành.</span>
                    </>
                  ) : (
                    <>
                      Bạn cần làm rõ
                      <br />
                      <span>vấn đề gì?</span>
                    </>
                  )}
                </h2>
                <p className="chat-welcome-intro">
                  {staff
                    ? "Chọn yêu cầu trong hàng chờ để nhận xử lý và phản hồi trong cùng hội thoại."
                    : notice}
                </p>
                {!staff && (
                  <div className="live-intake">
                    <div className="live-intake-fields">
                      <label htmlFor="intake-country">
                        <span>Hệ thống pháp luật</span>
                        <select
                          id="intake-country"
                          value={country}
                          onChange={(e) => setCountry(e.target.value)}
                        >
                          <option value="VN">Việt Nam</option>
                          <option value="DE">Đức</option>
                        </select>
                      </label>
                      <label htmlFor="intake-specialty">
                        <span>Chuyên môn liên quan</span>
                        <select
                          id="intake-specialty"
                          value={specialty}
                          onChange={(e) => setSpecialty(e.target.value)}
                        >
                          <option value="general">Chung / chưa rõ</option>
                          <option value="residence">Cư trú và quốc tịch</option>
                          <option value="family">Gia đình và thừa kế</option>
                          <option value="work">Lao động</option>
                          <option value="business">Kinh doanh</option>
                        </select>
                      </label>
                    </div>
                    <label className="live-consent">
                      <input
                        type="checkbox"
                        checked={consent}
                        onChange={(e) => setConsent(e.target.checked)}
                      />
                      <span>
                        Tôi đồng ý lưu và chuyển nội dung trao đổi cho chuyên
                        viên.{" "}
                        <a href="/#/chinh-sach-thong-tin">Quyền riêng tư ↗</a>
                      </span>
                    </label>
                  </div>
                )}
              </div>
            ) : messages.length === 0 ? (
              <div className="chat-message-empty">
                <span className="live-small-rule"></span>
                <p>
                  {staff && conversation?.state === "queued"
                    ? "Nhận xử lý yêu cầu để mở nội dung trao đổi."
                    : "Chưa có tin nhắn. Tin gửi thành công sẽ được lưu tại đây."}
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
                <span>
                  {staff
                    ? "Phản hồi trong cùng hội thoại"
                    : "Nêu bối cảnh và điều bạn cần làm rõ."}
                </span>
                <button
                  type="submit"
                  disabled={
                    !loaded || busy ||
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
            <p className="chat-compose-help">
              {staff
                ? "Chỉ trả lời trong hội thoại đã nhận xử lý."
                : "Giữ trình duyệt này để xem phản hồi. Đăng nhập để giữ lịch sử trên nhiều thiết bị."}
            </p>
          </div>
        </section>
      </main>
    </>
  );
}
