"use client";
import { useEffect, useRef, useState } from "react";
import { Header } from "../shared/Header";
export async function api(path: string, data?: unknown) {
  const r = await fetch("/service/" + path, {
    method: data ? "POST" : "GET",
    headers: data ? { "content-type": "application/json" } : undefined,
    body: data ? JSON.stringify(data) : undefined,
    cache: "no-store",
  });
  const v = await r.json();
  if (!r.ok) throw new Error(v.error || "Không thể kết nối");
  return v;
}
export function Workspace({ staff = false }: { staff?: boolean }) {
  const [me, setMe] = useState<any>(null),
    [rows, setRows] = useState<any[]>([]),
    [selected, setSelected] = useState(""),
    [conversation, setConversation] = useState<any>(null),
    [messages, setMessages] = useState<any[]>([]),
    [error, setError] = useState(""),
    [text, setText] = useState(""),
    [country, setCountry] = useState("VN"),
    [consent, setConsent] = useState(false),
    [internal, setInternal] = useState(false),
    [busy, setBusy] = useState(false),
    [loaded, setLoaded] = useState(false),
    [notice, setNotice] = useState(""),
    [specialty, setSpecialty] = useState("general");
  const pending = useRef<{
      key: string;
      body: string;
      internal: boolean;
    } | null>(null),
    log = useRef<HTMLDivElement>(null);
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
        if (active) setNotice(s.supportNotice || "");
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
      return;
    }
    let active = true,
      cursor = 0;
    const load = async () => {
      try {
        const v = await api(`conversations/${selected}?after=${cursor}`);
        if (!active) return;
        setConversation(v.conversation);
        if (v.messages.length) {
          cursor = Number(v.messages.at(-1).id);
          setMessages((old) => {
            const ids = new Set(old.map((m) => m.id));
            return [...old, ...v.messages.filter((m: any) => !ids.has(m.id))];
          });
        }
        setError("");
      } catch (e) {
        if (active) setError((e as Error).message);
      }
    };
    setMessages([]);
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
    if (!text.trim() || busy) return;
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
  if (staff && loaded && !staffAllowed)
    return (
      <>
        <Header />
        <main className="container live-page">
          <h1>Hộp thư chuyên viên</h1>
          <p>Cần tài khoản được phân quyền hỗ trợ để truy cập.</p>
          <a className="button" href="/tai-khoan">
            Đăng nhập
          </a>
        </main>
      </>
    );
  return (
    <>
      <Header />
      <main className="chat-shell live-shell">
        <aside className="chat-sidebar">
          <button
            className="button"
            onClick={() => {
              setSelected("");
              setConversation(null);
              setMessages([]);
            }}
          >
            {staff ? "Hàng chờ chuyên viên" : "Cuộc trò chuyện mới"}
          </button>
          <div className="chat-history">
            {!loaded ? (
              <p>Đang kết nối…</p>
            ) : rows.length === 0 ? (
              <p>
                {staff
                  ? "Chưa có yêu cầu trong phạm vi được giao."
                  : "Chưa có hội thoại."}
              </p>
            ) : (
              rows.map((r) => (
                <button
                  key={r.id}
                  className={selected === r.id ? "active" : ""}
                  onClick={() => setSelected(r.id)}
                >
                  {staff
                    ? `${r.jurisdiction} · ${r.state === "queued" ? "Chờ nhận" : "Đang xử lý"} · ${r.specialty || "Chung"}`
                    : r.title}
                </button>
              ))
            )}
          </div>
          <a href="/tai-khoan">
            {me?.user?.name || "Đăng nhập Google để giữ lịch sử"}
          </a>
        </aside>
        <section className="chat-main">
          <header className="chat-top">
            <div>
              <h1>{staff ? "Hộp thư chuyên viên" : "Hỏi đáp pháp luật"}</h1>
              <p>
                {conversation
                  ? `${conversation.jurisdiction} · ${{ queued: "Chờ chuyên viên", human: "Chuyên viên đang xử lý", closed: "Đã đóng" }[conversation.state as string] || conversation.state}`
                  : "Chuyên viên hỗ trợ · AI chưa bật cho khách"}
              </p>
            </div>
            <div className="chat-top-actions">
              <button
                className="button secondary chat-new-mobile"
                onClick={() => setSelected("")}
              >
                Mới
              </button>
              {staff && conversation?.state === "queued" && (
                <button
                  className="button"
                  disabled={busy}
                  onClick={() => act("claim")}
                >
                  Nhận xử lý
                </button>
              )}
              {staff && conversation?.state === "human" && (
                <button
                  className="button secondary"
                  disabled={busy}
                  onClick={() => act("close")}
                >
                  Hoàn tất
                </button>
              )}
              {conversation?.state === "closed" && (
                <button
                  className="button secondary"
                  disabled={busy}
                  onClick={() => act("reopen")}
                >
                  Mở lại
                </button>
              )}
            </div>
          </header>
          <div className="chat-log" ref={log} role="log" aria-live="polite">
            {!selected ? (
              <div className="chat-welcome">
                <h2>
                  {staff
                    ? "Chọn yêu cầu để tiếp nhận"
                    : "Bạn cần tìm hiểu vấn đề gì?"}
                </h2>
                <p>{notice}</p>
                {!staff && (
                  <div className="live-intake">
                    <label>
                      Hệ thống pháp luật
                      <select
                        value={country}
                        onChange={(e) => setCountry(e.target.value)}
                      >
                        <option value="VN">Việt Nam</option>
                        <option value="DE">Đức</option>
                      </select>
                    </label>
                    <label>
                      Chuyên môn liên quan
                      <select
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
                    <label className="live-consent">
                      <input
                        type="checkbox"
                        checked={consent}
                        onChange={(e) => setConsent(e.target.checked)}
                      />{" "}
                      Tôi đồng ý lưu và chuyển nội dung trao đổi cho chuyên
                      viên. <a href="/#/chinh-sach-thong-tin">Quyền riêng tư</a>
                    </label>
                  </div>
                )}
              </div>
            ) : messages.length === 0 ? (
              <p>Chưa có tin nhắn. Tin gửi thành công sẽ được lưu tại đây.</p>
            ) : (
              messages.map((m) => (
                <div
                  key={m.id}
                  className={
                    "chat-message " + (m.role === "user" ? "user" : "staff")
                  }
                >
                  <div className="chat-message-body">
                    <small>
                      {m.internal
                        ? "Ghi chú nội bộ"
                        : m.role === "user"
                          ? "Bạn đọc"
                          : "Chuyên viên"}{" "}
                      · {new Date(m.created_at).toLocaleString("vi-VN")}
                    </small>
                    <p>{m.body}</p>
                  </div>
                </div>
              ))
            )}
          </div>
          {error && (
            <p className="live-error" role="alert">
              {error}
            </p>
          )}
          {!staff && (
            <details className="mobile-history">
              <summary>{staff?"Hàng chờ & hội thoại đang xử lý":"Lịch sử hội thoại"}</summary>
              {rows.map((r) => (
                <button key={r.id} onClick={() => setSelected(r.id)}>
                  {staff?`${r.jurisdiction} · ${r.specialty||"Chung"} · ${r.state}`:r.title}
                </button>
              ))}
            </details>
          )}
          <div className="chat-compose-wrap">
            <form className="chat-compose" onSubmit={send}>
              <label className="sr-only" htmlFor="message">
                Tin nhắn
              </label>
              <textarea
                id="message"
                maxLength={2000}
                value={text}
                onChange={(e) => setText(e.target.value)}
                disabled={
                  busy ||
                  conversation?.state === "closed" ||
                  (staff && conversation?.state !== "human")
                }
                placeholder={
                  staff ? "Nhập phản hồi cho bạn đọc…" : "Nhập câu hỏi của bạn…"
                }
                required
              />
              <button
                type="submit"
                disabled={
                  busy ||
                  conversation?.state === "closed" ||
                  (staff && conversation?.state !== "human")
                }
                aria-label="Gửi tin nhắn"
              >
                {busy ? "…" : "↑"}
              </button>
            </form>
            {staff && (
              <label>
                <input
                  type="checkbox"
                  checked={internal}
                  onChange={(e) => setInternal(e.target.checked)}
                />{" "}
                Ghi chú nội bộ (khách không nhìn thấy)
              </label>
            )}
            <p className="chat-compose-help">
              {staff
                ? "Chỉ trả lời trong hội thoại đã nhận xử lý."
                : "Giữ trình duyệt này để xem phản hồi; đăng nhập Google để giữ lịch sử trên nhiều thiết bị."}
            </p>
          </div>
        </section>
      </main>
    </>
  );
}
