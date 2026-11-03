import { getPayload } from "payload";
import config from "@payload-config";
import { Header, Footer } from "../../../modules/shared/Header";
export const dynamic = "force-dynamic";
export default async function Page() {
  const payload = await getPayload({ config });
  const articles = await payload.find({
    collection: "articles",
    overrideAccess: false,
    sort: "-updatedAt",
    limit: 100,
  });
  return (
    <>
      <Header />
      <main className="container live-page live-journal-page">
        <div className="live-page-heading">
          <div>
            <p className="live-eyebrow">TẠP CHÍ PHÁP LUẬT</p>
            <h1>
              Góc nhìn rõ ràng.
              <br />
              <span>Thông tin đáng đọc.</span>
            </h1>
            <p className="live-lead">
              Bài viết và hỏi đáp về pháp luật Việt Nam, Đức đã được duyệt và
              xuất bản.
            </p>
          </div>
          <a className="live-text-action" href="/#/tra-cuu">
            Khám phá thư viện <span aria-hidden="true">↗</span>
          </a>
        </div>
        <div className="live-journal-divider">
          <span>BÀI VIẾT MỚI NHẤT</span>
          <span>{articles.docs.length} bài viết</span>
        </div>
        {articles.docs.length ? (
          <div className="live-grid live-journal-grid">
            {articles.docs.map((a, i) => (
              <article className="live-card live-journal-card" key={a.id}>
                <a
                  className={
                    "live-journal-visual country-" +
                    a.jurisdiction.toLowerCase()
                  }
                  href={"/bai-viet/" + encodeURIComponent(a.slug)}
                  tabIndex={-1}
                  aria-hidden="true"
                >
                  <span>{a.jurisdiction}</span>
                  <span className="live-journal-number">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="live-journal-visual-line"></span>
                </a>
                <div className="live-journal-meta">
                  <span>
                    {a.jurisdiction === "VN"
                      ? "PHÁP LUẬT VIỆT NAM"
                      : "PHÁP LUẬT ĐỨC"}
                  </span>
                  <time dateTime={a.updatedAt}>
                    {new Date(a.updatedAt).toLocaleDateString("vi-VN")}
                  </time>
                </div>
                <h2>
                  <a href={"/bai-viet/" + encodeURIComponent(a.slug)}>
                    {a.title}
                  </a>
                </h2>
                <p>{a.body.slice(0, 180)}…</p>
                <a
                  className="live-text-action"
                  href={"/bai-viet/" + encodeURIComponent(a.slug)}
                >
                  Đọc bài viết <span aria-hidden="true">↗</span>
                </a>
              </article>
            ))}
          </div>
        ) : (
          <section className="live-empty-state">
            <span className="live-document-icon" aria-hidden="true">
              ≡
            </span>
            <h2>Nội dung đang được biên tập.</h2>
            <p>
              Bài viết sẽ xuất hiện tại đây sau khi được duyệt và xuất bản.
              <br />
              Trong lúc chờ, bạn có thể khám phá danh mục chủ đề trong thư viện.
            </p>
            <a className="button" href="/#/tra-cuu">
              Tra cứu thư viện <span aria-hidden="true">↗</span>
            </a>
          </section>
        )}
      </main>
      <Footer />
    </>
  );
}
