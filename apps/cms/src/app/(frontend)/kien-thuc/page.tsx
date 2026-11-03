"use client";
import { useEffect, useState } from "react";
import { Header } from "../../../modules/shared/Header";
import { api } from "../../../modules/chat/Workspace";
export default function Page() {
  const [sources, setSources] = useState<any[]>([]),
    [id, setId] = useState(""),
    [result, setResult] = useState<any>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    api("knowledge-sources")
      .then(setSources)
      .catch((e) => setError(e.message));
  }, []);
  return (
    <>
      <Header />
      <main className="container live-page live-article">
        <h1>Thử kiến thức AI nội bộ</h1>
        <p>
          Chỉ dùng nguồn công khai đã duyệt và còn hiệu lực. Không nhập câu hỏi
          hay hồ sơ của khách hàng. Kết quả thử không xuất bản tự động.
        </p>
        <a href="/admin/collections/knowledge">Biên tập và duyệt nguồn</a>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setError("");
            setResult(null);
            try {
              setResult(await api("knowledge-test", { id: Number(id) }));
            } catch (e) {
              setError((e as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          <label>
            Nguồn kiểm thử
            <select required value={id} onChange={(e) => setId(e.target.value)}>
              <option value="">Chọn nguồn đã duyệt</option>
              {sources.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.jurisdiction} · {s.title}
                </option>
              ))}
            </select>
          </label>
          <p>
            <button className="button" disabled={busy || !id}>
              {busy ? "Đang kiểm thử…" : "Tóm tắt và kiểm tra giới hạn nguồn"}
            </button>
          </p>
        </form>
        {error && (
          <p role="alert" className="live-error">
            {error}
          </p>
        )}
        {result && (
          <article className="live-card">
            <h2>Kết quả thử nội bộ</h2>
            <div className="live-body">{result.text}</div>
            <a href={result.source.url} rel="noopener noreferrer">
              Nguồn: {result.source.title}
            </a>
            <p>Phiên bản: {result.source.revision}</p>
          </article>
        )}
      </main>
    </>
  );
}
