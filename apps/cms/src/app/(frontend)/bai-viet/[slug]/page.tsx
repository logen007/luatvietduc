import { getPayload } from "payload";
import config from "@payload-config";
import { notFound } from "next/navigation";
import { Header } from "../../../../modules/shared/Header";
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
      <main className="container live-page live-article">
        <p>
          {a.jurisdiction === "VN" ? "Pháp luật Việt Nam" : "Pháp luật Đức"}
        </p>
        <h1>{a.title}</h1>
        <p>Cập nhật {new Date(a.updatedAt).toLocaleDateString("vi-VN")}</p>
        <div className="live-body">{a.body}</div>
        {a.sourceUrl && (
          <a href={a.sourceUrl} rel="noopener noreferrer">
            Nguồn tham khảo
          </a>
        )}
        <p>
          <a className="button" href="/tro-chuyen">
            Hỏi chuyên viên về vấn đề này
          </a>
        </p>
      </main>
    </>
  );
}
