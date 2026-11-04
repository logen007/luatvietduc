import {LocaleText,LocaleDate,LocaleNav} from "../../../../modules/shared/locale";
import { getPayload } from "payload";
import config from "@payload-config";
import { notFound } from "next/navigation";
import { Header } from "../../../../modules/shared/Header";
import { Footer } from "../../../../modules/shared/Footer";
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
    limit: 1,depth:1,
  });
  const a = result.docs[0];
  if (!a) notFound();
  return (
    <>
      <Header />
      <main className="live-reading-page">
        <div className="container">
          <LocaleNav className="live-breadcrumb" label="Đường dẫn">
            <a href="/"> <LocaleText text="Trang chủ"/></a>
            <span>/</span>
            <a href="/#/tin-tuc"> <LocaleText text="Tin tức & đời sống"/></a>
            <span>/</span>
            <span><LocaleText text={a.jurisdiction === "VN" ? "Việt Nam" : a.jurisdiction === "DE" ? "Đức" : "Luật Việt Đức"}/></span>
          </LocaleNav>
          <header className="live-reading-heading">
            <p className="live-eyebrow">
              <LocaleText text={a.kind === "news" ? "TIN TỨC" : "KIẾN THỨC PHÁP LUẬT"}/>
            </p>
            <h1>{a.title}</h1>
            <div className="live-reading-taxonomy">{a.categories?.map(category=>typeof category==='object'&&category?<span key={'category-'+category.id}><LocaleText text={category.name}/></span>:null)}{a.tags?.map(tag=>typeof tag==='object'&&tag?<span key={'tag-'+tag.id}>#{tag.name}</span>:null)}</div>
            <div className="live-reading-meta">
              <span>Luật Việt Đức</span>
              <span aria-hidden="true">·</span>
              <time dateTime={a.updatedAt}> <LocaleText text="Cập nhật"/> <LocaleDate value={a.updatedAt}/>
              </time>
            </div>
          </header>
          <div className="live-reading-layout">
            <aside className="live-reading-aside">
              <p className="live-eyebrow"> <LocaleText text="TRONG BÀI VIẾT"/></p>
              <a href="#noi-dung"> <LocaleText text="Nội dung bài viết"/></a>
              {a.sourceUrl && <a href="#nguon-tham-khao"> <LocaleText text="Nguồn tham khảo"/></a>}
              <span className="live-aside-line"></span>
              <p> <LocaleText text="Bạn cần làm rõ vấn đề trong trường hợp cụ thể?"/></p>
              <a className="live-text-action" href="/tro-chuyen"> <LocaleText text="Hỏi chuyên viên ↗"/> </a>
            </aside>
            <article className="live-reading-content">
              <div id="noi-dung" className="live-body" lang={a.language==='de'?'de':'vi'}>
                {a.body}
              </div>
              {a.sourceUrl && (
                <div id="nguon-tham-khao" className="live-source-reference">
                  <p className="live-eyebrow"> <LocaleText text="NGUỒN THAM KHẢO"/></p>
                  <a href={a.sourceUrl} rel="noopener noreferrer"> <LocaleText text="Xem nguồn gốc của thông tin"/>{" "}
                    <span aria-hidden="true">↗</span>
                  </a>
                </div>
              )}
              <section className="live-reading-cta">
                <span className="live-eyebrow"> <LocaleText text="TIẾP NỐI CÂU HỎI CỦA BẠN"/></span>
                <h2> <LocaleText text="Mỗi vấn đề đều có"/> <br /> <LocaleText text="bối cảnh riêng."/> </h2>
                <a className="button" href="/tro-chuyen"> <LocaleText text="Trao đổi với chuyên viên"/> <span aria-hidden="true">↗</span>
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
