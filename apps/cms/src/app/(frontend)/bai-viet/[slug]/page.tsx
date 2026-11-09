import {featuredArticleImage} from '../../../../modules/public-site/article-image';
import {ArticlePhoto} from '../../../../modules/public-site/ArticlePhoto';
import {AppLink} from '../../../../modules/shared/AppLink';
import {photoForArticle} from '../../../../modules/public-site/search';
import {articleHTML} from '../../../../modules/content/article-body';
import {LocaleText,LocaleDate} from "../../../../modules/shared/locale";
import {notFound,permanentRedirect} from "next/navigation";
import {articleParent} from '../../../../modules/content/navigation';
import {content,publicArticle,publicSiteSettings,publicArticleTranslations,publicArticleSummary} from '../../../../modules/public-site/server';
import {publicMetadata,articleSchema} from '../../../../modules/public-site/seo';
import {PublicFrame} from '../../../../modules/public-site/Frame';
import {getPresentationVersion} from '../../../../modules/shared/presentation-version.mjs';
import path from 'node:path';
import {StructuredData} from '../../../../modules/public-site/StructuredData';
import {photo} from '../../../../modules/public-site/photos';
export const dynamic = "force-dynamic";
async function articleForPage(slug:string){
 const article=await publicArticle(slug);if(article)return article;
 const alias=(content.articleAliases as Record<string,string>)[slug];if(alias){const match=/^(.*)-(\d+)$/.exec(alias);if(match)permanentRedirect('/chu-de/'+match[1]+'/'+match[2]);}
 notFound();
}
export async function generateMetadata({params}:{params:Promise<{slug:string}>}){
 const slug=(await params).slug,a=await articleForPage(slug);
 const [settings,translated,summary]=await Promise.all([publicSiteSettings(),publicArticleTranslations(a.translationGroup),publicArticleSummary(slug)]);
 return publicMetadata({title:a.title,path:'/bai-viet/'+encodeURIComponent(a.slug),description:summary?.summary||'',enabled:settings.publicIndexingEnabled===true,indexable:Boolean(summary?.text),image:featuredArticleImage(a.featuredImage)?.url||photo(photoForArticle(a),1440).src,language:a.language||'vi',article:{published:a.createdAt,modified:a.updatedAt},...(translated.length>1?{translations:Object.fromEntries(translated.map(item=>[item.language||'vi','/bai-viet/'+encodeURIComponent(item.slug)]))}:{})});
}
export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params,a=await articleForPage(slug),summary=await publicArticleSummary(slug);
  const news=a.kind==='news'||content.newsSlugs.includes(a.slug),parent=articleParent(news?'news':a.kind,a.jurisdiction),revision=getPresentationVersion(path.join(process.cwd(),'public'),['editorial-ui.css']),scriptRevision=getPresentationVersion(path.join(process.cwd(),'public'),['editorial-ui.js']);
  const pathName='/bai-viet/'+encodeURIComponent(a.slug);
  return (<><StructuredData value={articleSchema({title:a.title,path:pathName,description:summary?.summary||'',image:featuredArticleImage(a.featuredImage)?.url||photo(photoForArticle(a),1440).src,published:a.createdAt,modified:a.updatedAt,language:a.language||'vi',news,parent})}/>
    <PublicFrame revision={revision} scriptRevision={scriptRevision} section={news?'news':'lookup'} articleHero>
      <div className="live-reading-page">
        <div className="container">
          <article className="live-reading-article" aria-labelledby="article-title">
            <header className="live-reading-heading live-reading-hero">
              <ArticlePhoto image={featuredArticleImage(a.featuredImage)} name={photoForArticle(a)} width={480} responsive={false} className="live-reading-backdrop" alt="" aria-hidden="true" fetchPriority="high"/>
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
              {featuredArticleImage(a.featuredImage)&&<figure className="live-reading-cover"><ArticlePhoto image={featuredArticleImage(a.featuredImage)} name={photoForArticle(a)} alt={featuredArticleImage(a.featuredImage)?.alt||a.title} loading="eager" decoding="async"/></figure>}
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
    </PublicFrame></>
  );
}
