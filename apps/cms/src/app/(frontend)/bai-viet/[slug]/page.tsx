import {AppLink} from '../../../../modules/shared/AppLink';
import {photoForArticle} from '../../../../modules/public-site/search';
import {articleHTML,articleText} from '../../../../modules/content/article-body';
import {LocaleText,LocaleDate} from "../../../../modules/shared/locale";
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
 return publicMetadata({title:a.title,path:'/bai-viet/'+encodeURIComponent(a.slug),description:articleText(a.body||'').replace(/\s+/g,' ').slice(0,180),enabled:settings.publicIndexingEnabled===true,indexable:Boolean(articleText(a.body).trim())});
}
export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params,a=await articleForPage(slug);
  const news=a.kind==='news'||content.newsSlugs.includes(a.slug),parent=articleParent(news?'news':a.kind,a.jurisdiction),revision=getPresentationVersion(path.join(process.cwd(),'public'));
  return (
    <PublicFrame revision={revision} section={news?'news':'lookup'} articleHero>
      <div className="live-reading-page">
        <div className="container">
          <article className="live-reading-article" aria-labelledby="article-title">
            <header className="live-reading-heading live-reading-hero">
              <img className="live-reading-backdrop" src={'/assets/photos/'+photoForArticle(a)+'-1200.webp'} alt="" aria-hidden="true" width={1200} height={800} fetchPriority="high"/>
              <div className="live-reading-heading-inner">
              <div className="live-reading-topline">
                <AppLink className="live-reading-return" href={parent.href}>
                  <span aria-hidden="true">←</span>
                  <LocaleText text={parent.label}/>
                </AppLink>
                <time className="live-reading-meta" dateTime={a.updatedAt}>
                  <LocaleText text="Cập nhật"/> <LocaleDate value={a.updatedAt}/>
                </time>
              </div>
              <h1 id="article-title" lang={a.language==='de'?'de':'vi'}>{a.title}</h1>
              <div className="live-reading-taxonomy">{a.categories?.map(category=>typeof category==='object'&&category?<span key={'category-'+category.id}><LocaleText text={category.name}/></span>:null)}{a.tags?.map(tag=>typeof tag==='object'&&tag?<span key={'tag-'+tag.id}>#{tag.name}</span>:null)}</div>
              </div>
            </header>
            <div className="live-reading-content">
              <div id="noi-dung" className="live-body" lang={a.language==='de'?'de':'vi'} dangerouslySetInnerHTML={{__html:articleHTML(a.body)}}/>
              <footer className="live-reading-footer">
                {a.sourceUrl && (
                  <AppLink id="nguon-tham-khao" className="live-reading-source" href={a.sourceUrl} rel="noopener noreferrer">
                    <LocaleText text="Nguồn tham khảo"/>
                    <span aria-hidden="true">↗</span>
                  </AppLink>
                )}
                <AppLink className="live-reading-question" href="/hoi-dap">
                  <LocaleText text="Gửi câu hỏi"/>
                  <span aria-hidden="true">→</span>
                </AppLink>
              </footer>
            </div>
          </article>
        </div>
      </div>
    </PublicFrame>
  );
}
