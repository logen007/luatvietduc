import { getPayload } from "payload";
import config from "@payload-config";
import { Header } from "../../../modules/shared/Header";
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
      <main className="container live-page">
        <h1>Bài viết đã xuất bản</h1>
        <div className="live-grid">
          {articles.docs.map((a) => (
            <article className="live-card" key={a.id}>
              <p>
                {a.jurisdiction === "VN"
                  ? "Pháp luật Việt Nam"
                  : "Pháp luật Đức"}
              </p>
              <h2>
                <a href={"/bai-viet/" + encodeURIComponent(a.slug)}>
                  {a.title}
                </a>
              </h2>
              <p>{a.body.slice(0, 180)}…</p>
            </article>
          ))}
        </div>
        {!articles.docs.length && (
          <p>
            Chưa có bài viết được duyệt và xuất bản. Bạn có thể tra cứu danh mục
            chủ đề trong thư viện.
          </p>
        )}
        <a href="/#/tra-cuu">Mở thư viện chủ đề</a>
      </main>
    </>
  );
}
