"use client";
import { useEffect, useState } from "react";
import { Header, Footer } from "../../../modules/shared/Header";
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
      <main className="container live-page live-knowledge-page">
        <div className="live-page-heading">
          <div>
            <p className="live-eyebrow">KIẾN THỨC / THỬ NGHIỆM NỘI BỘ</p>
            <h1>
              Kiến thức có nguồn.
              <br />
              <span>Kiểm chứng trước khi dùng.</span>
            </h1>
            <p className="live-lead">
              Thử tóm tắt và kiểm tra giới hạn từ nguồn công khai đã duyệt, còn
              hiệu lực. Kết quả không tự động xuất bản.
            </p>
          </div>
          <a className="button secondary" href="/admin/collections/knowledge">
            Biên tập & duyệt nguồn <span aria-hidden="true">↗</span>
          </a>
        </div>
        <div className="live-knowledge-grid">
          <form
            className="live-card live-source-form"
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
            <span className="live-step-index">01 / CHỌN NGUỒN</span>
            <h2>Bắt đầu từ căn cứ.</h2>
            <p>
              Nguồn đã duyệt trong phạm vi được phân quyền sẽ xuất hiện ở đây.
            </p>
            <label htmlFor="knowledge-source">
              Nguồn kiểm thử
              <select
                id="knowledge-source"
                required
                value={id}
                onChange={(e) => setId(e.target.value)}
              >
                <option value="">Chọn nguồn đã duyệt</option>
                {sources.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.jurisdiction} · {s.title}
                  </option>
                ))}
              </select>
            </label>
            <button className="button" disabled={busy || !id}>
              {busy ? (
                <>
                  <span className="live-spinner"></span>Đang kiểm thử…
                </>
              ) : (
                <>
                  Tóm tắt & kiểm tra nguồn <span aria-hidden="true">↗</span>
                </>
              )}
            </button>
            <p className="live-form-note">
              Chỉ dùng dữ liệu công khai. Không nhập câu hỏi hoặc hồ sơ riêng
              của khách hàng.
            </p>
          </form>
          <section className="live-knowledge-output" aria-live="polite">
            {error ? (
              <div className="live-error" role="alert">
                {error}
              </div>
            ) : result ? (
              <article className="live-card live-source-result">
                <span className="live-step-index">02 / KẾT QUẢ NỘI BỘ</span>
                <h2>Nội dung cần rà soát.</h2>
                <div className="live-body">{result.text}</div>
                <div className="live-source-reference">
                  <a href={result.source.url} rel="noopener noreferrer">
                    Nguồn: {result.source.title} ↗
                  </a>
                  <small>Phiên bản: {result.source.revision}</small>
                </div>
              </article>
            ) : (
              <div className="live-output-empty">
                <span className="live-document-icon" aria-hidden="true">
                  ≡
                </span>
                <p className="live-eyebrow">KẾT QUẢ KIỂM THỬ</p>
                <h2>
                  Nguồn rõ ràng.
                  <br />
                  Câu trả lời có giới hạn.
                </h2>
                <p>
                  Chọn một nguồn để xem kết quả thử nghiệm nội bộ. Nhân sự phụ
                  trách kiểm tra nội dung trước khi sử dụng.
                </p>
              </div>
            )}
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}
