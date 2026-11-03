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
            <p className="live-eyebrow">KHO FAQ / DÀNH CHO CHUYÊN VIÊN</p>
            <h1>
              Quản lý câu trả lời.
              <br />
              <span>Biên tập trong phạm vi được giao.</span>
            </h1>
            <p className="live-lead">
              Nhập câu hỏi, câu trả lời chuẩn và căn cứ. Chuyên viên biên tập FAQ và theo dõi thời hạn rà soát. Quyền tự xuất bản đang chờ phát hành riêng.
            </p>
          </div>
          <a className="button secondary" href="/admin/collections/knowledge">
            Quản lý FAQ <span aria-hidden="true">↗</span>
          </a>
        </div>
        <section className="live-card" aria-label="Quy trình FAQ" style={{ marginBottom: 32 }}>
          <h2>Từ FAQ đến câu trả lời</h2>
          <ol>
            <li><strong>Soạn FAQ:</strong> câu hỏi chuẩn, câu trả lời, điều kiện áp dụng và các trường hợp phải chuyển chuyên viên.</li>
            <li><strong>Kiểm tra căn cứ:</strong> quốc gia, liên kết nguồn, ngày hiệu lực và hạn rà soát.</li>
            <li><strong>Xuất bản:</strong> hiện chủ hệ thống hoặc người duyệt xác nhận nội dung. Quyền chuyên viên tự xuất bản chưa bật. Bản nháp không được dùng.</li>
            <li><strong>Rà soát:</strong> sửa hoặc thu hồi khi căn cứ thay đổi. Không đưa hội thoại khách vào kho FAQ.</li>
          </ol>
          <a className="button secondary" href="/admin/collections/knowledge/create">Thêm FAQ <span aria-hidden="true">↗</span></a>
          <p>AI hiện chỉ thử nghiệm nội bộ. FAQ xuất bản chưa tự bật trả lời khách; kết nối và luồng trả lời có kiểm soát sẽ được cấu hình riêng.</p>
        </section>
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
