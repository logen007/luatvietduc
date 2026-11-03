import { getPayload } from "payload";
import config from "@payload-config";
import { notFound } from "next/navigation";
import { Header, Footer } from "../../../../modules/shared/Header";
export const dynamic = "force-dynamic";
export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params,
    payload = await getPayload({ config });
  const result = await payload.find({
    collection: "articles",
    overrideAccess: false,
    where: { slug: { equals: slug } },
    limit: 1,
  });
  const a = result.docs[0];
  if (!a) notFound();
  return (
    <>
      <Header />
      <main className="live-reading-page">
        <div className="container">
          <nav className="live-breadcrumb" aria-label="Đường dẫn">
            <a href="/">Trang chủ</a>
            <span>/</span>
            <a href="/bai-viet">Bài viết</a>
            <span>/</span>
            <span>{a.jurisdiction === "VN" ? "Việt Nam" : "Đức"}</span>
          </nav>
          <header className="live-reading-heading">
            <p className="live-eyebrow">
              {a.jurisdiction === "VN" ? "PHÁP LUẬT VIỆT NAM" : "PHÁP LUẬT ĐỨC"}
            </p>
            <h1>{a.title}</h1>
            <div className="live-reading-meta">
              <span>Luật Việt Đức</span>
              <span aria-hidden="true">·</span>
              <time dateTime={a.updatedAt}>
                Cập nhật {new Date(a.updatedAt).toLocaleDateString("vi-VN")}
              </time>
            </div>
          </header>
          <div className="live-reading-layout">
            <aside className="live-reading-aside">
              <p className="live-eyebrow">TRONG BÀI VIẾT</p>
              <a href="#noi-dung">Nội dung bài viết</a>
              {a.sourceUrl && <a href="#nguon-tham-khao">Nguồn tham khảo</a>}
              <span className="live-aside-line"></span>
              <p>Bạn cần làm rõ vấn đề trong trường hợp cụ thể?</p>
              <a className="live-text-action" href="/tro-chuyen">
                Hỏi chuyên viên ↗
              </a>
            </aside>
            <article className="live-reading-content">
              <div id="noi-dung" className="live-body">
                {a.body}
              </div>
              {a.sourceUrl && (
                <div id="nguon-tham-khao" className="live-source-reference">
                  <p className="live-eyebrow">NGUỒN THAM KHẢO</p>
                  <a href={a.sourceUrl} rel="noopener noreferrer">
                    Xem nguồn gốc của thông tin{" "}
                    <span aria-hidden="true">↗</span>
                  </a>
                </div>
              )}
              <section className="live-reading-cta">
                <span className="live-eyebrow">TIẾP NỐI CÂU HỎI CỦA BẠN</span>
                <h2>
                  Mỗi vấn đề đều có
                  <br />
                  bối cảnh riêng.
                </h2>
                <a className="button" href="/tro-chuyen">
                  Trao đổi với chuyên viên <span aria-hidden="true">↗</span>
                </a>
              </section>
            </article>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
