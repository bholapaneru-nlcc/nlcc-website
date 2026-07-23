import { AppShell } from "../components/Layout";
import { ArticleImage, PageHeader, SmartGrid } from "../components/bits";
import { BlockRenderer, type ContentBlock } from "../components/BlockRenderer";
import { dateRange, publishedArticles, type Article } from "../lib/nlcc";
import { useStore } from "../lib/store";

function ArticleDetail({ article }: { article: Article }) {
  const blocks = Array.isArray(article.contentBlocks)
    ? (article.contentBlocks as ContentBlock[])
    : [];
  const paragraphs = (article.body || "").split(/\n{2,}/).filter(Boolean);
  return (
    <div className="space-y-5">
      <a
        href="/articles"
        className="inline-flex items-center gap-1 text-sm font-black text-brand transition hover:gap-2"
      >
        <span aria-hidden>←</span> Back to all articles
      </a>

      <article className="card-panel animate-fade-up">
        <ArticleImage slug={article.featureImage} className="aspect-[16/9] w-full rounded-xl" />
        <span className="mt-5 block text-xs font-black uppercase tracking-wider text-brand-600">
          {article.category}
        </span>
        <h1 className="mt-2 text-3xl font-extrabold leading-tight tracking-tight text-slate-900 sm:text-4xl">
          {article.title}
        </h1>
        <p className="mt-2 text-sm font-bold text-slate-400">{dateRange(article)}</p>

        {blocks.length ? (
          <BlockRenderer blocks={blocks} />
        ) : (
          <div className="mt-5 space-y-4 text-[0.975rem] leading-relaxed text-slate-700">
            {paragraphs.map((para, i) => (
              <p key={i}>{para}</p>
            ))}
          </div>
        )}
      </article>

      {article.galleryImages && article.galleryImages.length > 0 ? (
        <section className="card-panel">
          <h2 className="mb-4 text-xl font-extrabold text-slate-900">Photo Gallery</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            {article.galleryImages.map((img, i) => (
              <ArticleImage
                key={i}
                slug={img}
                className="aspect-[4/3] w-full rounded-lg"
              />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

export default function Articles({ id }: { id?: string }) {
  const { data } = useStore();
  const articles = publishedArticles(data);

  if (id) {
    const article = articles.find((a) => a.id === id);
    if (article) {
      return (
        <AppShell active="/articles">
          <ArticleDetail article={article} />
        </AppShell>
      );
    }
  }

  return (
    <AppShell active="/articles">
      <PageHeader
        kicker="Articles"
        title="News, Events & Announcements"
        subtitle="Browse all published NLCC updates — community news, class information, events and cultural programmes."
      />
      <div className="mt-6">
        <SmartGrid articles={articles} emptyText="No articles have been published yet." />
      </div>
    </AppShell>
  );
}
