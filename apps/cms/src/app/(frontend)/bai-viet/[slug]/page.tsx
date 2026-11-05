import {LocaleText,LocaleDate,LocaleNav} from "../../../../modules/shared/locale";
import {notFound,permanentRedirect} from "next/navigation";
import {articleParent} from '../../../../modules/content/navigation';
import {content,publicArticle,publicSiteSettings} from '../../../../modules/public-site/server';
import {publicMetadata} from '../../../../modules/public-site/seo';
import {PublicFrame} from '../../../../modules/public-site/Frame';
import {getPresentationVersion} from '../../../../modules/shared/presentation-version.mjs';
import path from 'node:path';
export const dynamic = "force-dynamic";
async function articleForPage(slug:string){
 const article=await publicArticle(slug);if(article)return article;
 const alias=(content.articleAliases as Record<string,string>)[slug];if(alias){const match=/^(.*)-(\d+)$/.exec(alias);if(match)permanentRedirect('/chu-de/'+match[1]+'/'+match[2]);}
 notFound();
}
export async function generateMetadata({params}:{params:Promise<{slug:string}>}){
 const slug=(await params).slug,a=await articleForPage(slug);
 const settings=await publicSiteSettings();
 return publicMetadata({title:a.title,path:'/bai-viet/'+encodeURIComponent(a.slug),description:String(a.body||'').replace(/\s+/g,' ').slice(0,180),enabled:settings.publicIndexingEnabled===true,indexable:Boolean(a.body?.trim())});
}
export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params,a=await articleForPage(slug);
  const news=a.kind==='news'||content.newsSlugs.includes(a.slug),parent=articleParent(news?'news':a.kind),revision=getPresentationVersion(path.join(process.cwd(),'public'));
  return (
    <PublicFrame revision={revision} section={news?'news':'lookup'}>
      <div className="live-reading-page">
        <div className="container">
          <LocaleNav className="live-breadcrumb" label="Đường dẫn">
            <a href="/"> <LocaleText text="Trang chủ"/></a>
            <span>/</span>
            <a href={parent.href}> <LocaleText text={parent.label}/></a>
            <span>/</span>
            <span aria-current="page">{a.title}</span>
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
              <a className="live-text-action" href="/tro-chuyen"> <LocaleText text="Mở trò chuyện"/> <span aria-hidden="true">↗</span> </a>
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
                <a className="button" href="/tro-chuyen"> <LocaleText text="Mở trò chuyện"/> <span aria-hidden="true">↗</span>
                </a>
              </section>
            </article>
          </div>
        </div>
      </div>
    </PublicFrame>
  );
}
