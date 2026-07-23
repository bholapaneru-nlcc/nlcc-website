import type { ReactNode } from "react";
import { motion } from "motion/react";
import {
  dateRange,
  daysLeftLabel,
  durationLabel,
  formatDate,
  shortDate,
  smartSpanClass,
  type Article,
  type CommitteeMember,
  type NlccItem,
} from "../lib/nlcc";

/* --------------------------- article imagery ------------------------------ */

const IMAGE_THEMES: Record<string, { grad: string; emoji: string }> = {
  health: { grad: "from-emerald-400 to-teal-600", emoji: "🦷" },
  classes: { grad: "from-indigo-500 to-blue-700", emoji: "📚" },
  community: { grad: "from-amber-400 to-orange-600", emoji: "🤝" },
  "sports-day": { grad: "from-rose-500 to-red-700", emoji: "🏅" },
};

function themeFor(slug?: string) {
  return (
    IMAGE_THEMES[slug || ""] ?? { grad: "from-sky-500 to-indigo-700", emoji: "📰" }
  );
}

function isRealImage(slug?: string) {
  return Boolean(slug && (/^https?:\/\//.test(slug) || slug.startsWith("data:")));
}

export function ArticleImage({
  slug,
  className = "",
}: {
  slug?: string;
  className?: string;
}) {
  // Uploaded/hosted images render as a real <img>.
  if (isRealImage(slug)) {
    return <img src={slug} alt="" className={`object-cover ${className}`} />;
  }
  // Otherwise show a branded gradient placeholder (category-aware).
  const { grad, emoji } = themeFor(slug);
  return (
    <div
      className={`relative flex items-center justify-center overflow-hidden bg-gradient-to-br ${grad} ${className}`}
    >
      <span className="text-5xl drop-shadow-sm sm:text-6xl">{emoji}</span>
      <div className="absolute inset-0 opacity-20 [background-image:radial-gradient(circle_at_20%_20%,white_1px,transparent_1px)] [background-size:22px_22px]" />
      <span className="absolute bottom-1.5 right-2 text-[0.6rem] font-black uppercase tracking-widest text-white/60">
        placeholder
      </span>
    </div>
  );
}

export function MemberAvatar({
  name,
  className = "",
}: {
  name: string;
  className?: string;
}) {
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
  return (
    <div
      className={`flex items-center justify-center bg-gradient-to-br from-brand to-brand-700 text-2xl font-black text-white ${className}`}
    >
      {initials || "NL"}
    </div>
  );
}

/* ------------------------------ page header ------------------------------- */

export function PageHeader({
  kicker,
  title,
  subtitle,
}: {
  kicker: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <section className="card-panel animate-fade-up">
      <span className="text-xs font-black uppercase tracking-[0.18em] text-brand-600">
        {kicker}
      </span>
      <h1 className="mt-2 text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">
        {title}
      </h1>
      {subtitle ? <p className="mt-3 max-w-2xl text-slate-600">{subtitle}</p> : null}
    </section>
  );
}

/* ------------------------------ article card ------------------------------ */

const SPAN_CLASS: Record<string, string> = {
  "span-1": "sm:col-span-1",
  "span-2": "sm:col-span-2",
  "span-3": "sm:col-span-3",
};

export function ArticleCard({
  article,
  index,
  total,
}: {
  article: Article;
  index: number;
  total: number;
}) {
  const span = smartSpanClass(index, total);
  return (
    <motion.article
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-8% 0px" }}
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1], delay: (index % 3) * 0.06 }}
      whileHover={{ y: -6 }}
      className={`group relative flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-xl sm:col-span-1 ${SPAN_CLASS[span]}`}
    >
      <a href={`/articles/${article.id}`} className="block">
        <ArticleImage
          slug={article.featureImage}
          className="aspect-[16/9] w-full"
        />
      </a>
      <div className="flex flex-1 flex-col p-5">
        <span className="text-xs font-black uppercase tracking-wider text-brand-600">
          {article.category}
        </span>
        <h3 className="mt-1.5 text-lg font-extrabold leading-snug text-slate-900">
          <a href={`/articles/${article.id}`} className="transition hover:text-brand">
            {article.title}
          </a>
        </h3>
        <p className="mt-1 text-sm font-semibold text-slate-400">
          {dateRange(article)}
        </p>
        <p className="mt-2 flex-1 text-sm leading-relaxed text-slate-600">
          {article.homepageSummary}
        </p>
        <a
          href={`/articles/${article.id}`}
          className="mt-4 inline-flex items-center gap-1 text-sm font-black text-brand transition hover:gap-2"
        >
          Read More <span aria-hidden>→</span>
        </a>
      </div>
    </motion.article>
  );
}

/* ------------------------------- smart grid ------------------------------- */

export function SmartGrid({
  articles,
  emptyText = "No articles found.",
}: {
  articles: Article[];
  emptyText?: string;
}) {
  if (!articles.length) {
    return <p className="px-1 py-6 text-slate-500">{emptyText}</p>;
  }
  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
      {articles.map((article, index) => (
        <ArticleCard key={article.id} article={article} index={index} total={articles.length} />
      ))}
    </div>
  );
}

/* --------------------------- featured article ----------------------------- */
//
// Reproduces the v6.3 fix: the image floats to the left and the text wraps
// beneath it, removing the large blank gap under the picture.
export function FeaturedArticle({ article }: { article: Article }) {
  return (
    <section className="card-panel mb-8 animate-fade-up">
      <ArticleImage
        slug={article.featureImage}
        className="float-none mb-4 aspect-[16/9] w-full rounded-xl sm:float-left sm:mb-0 sm:mr-6 sm:w-[44%]"
      />
      <span className="inline-block text-xs font-black uppercase tracking-wider text-brand-600">
        Featured • {shortDate(article.startDate)}
      </span>
      <h2 className="mt-2 text-3xl font-extrabold leading-tight tracking-tight text-slate-900">
        {article.title}
      </h2>
      <p className="mt-3 text-[0.975rem] leading-relaxed text-slate-700">
        {article.homepageSummary}
      </p>
      <a
        href={`/articles/${article.id}`}
        className="mt-4 inline-flex items-center gap-2 rounded-lg bg-brand px-5 py-2.5 text-sm font-black text-white shadow-sm transition hover:bg-brand-700"
      >
        Read More <span aria-hidden>→</span>
      </a>
      <span className="block clear-both" />
    </section>
  );
}

/* ------------------------------ sidebar card ------------------------------ */

const TONE: Record<string, { bar: string; dot: string; chip: string }> = {
  blue: { bar: "bg-ink", dot: "text-ink", chip: "bg-ink-50 text-ink" },
  red: { bar: "bg-brand", dot: "text-brand", chip: "bg-brand-50 text-brand" },
  green: { bar: "bg-emerald-600", dot: "text-emerald-600", chip: "bg-emerald-50 text-emerald-700" },
};

export function SideCard({
  title,
  tone = "blue",
  note,
  children,
}: {
  title: string;
  tone?: keyof typeof TONE | string;
  note?: string;
  children: ReactNode;
}) {
  const t = TONE[tone] ?? TONE.blue;
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <header className={`flex items-center gap-2 px-5 py-3 ${t.bar}`}>
        <span className="text-base font-black text-white">●</span>
        <h2 className="text-sm font-black uppercase tracking-wide text-white">{title}</h2>
      </header>
      <div className="space-y-2 p-4">
        {note ? <p className="text-xs font-bold text-slate-400">{note}</p> : null}
        {children}
      </div>
    </section>
  );
}

/* ------------------------------ event item -------------------------------- */

export function EventItem({ item }: { item: NlccItem }) {
  const days = daysLeftLabel(item.startDate);
  const isClass = item.eventMode === "class";
  return (
    <div className="rounded-lg border border-slate-100 bg-slate-50/70 px-3 py-2.5">
      <div className="flex items-baseline justify-between gap-2">
        <strong className="text-sm font-extrabold text-slate-800">{item.title}</strong>
        {days ? (
          <span className="shrink-0 rounded-full bg-brand-50 px-2 py-0.5 text-[0.65rem] font-black uppercase text-brand">
            {days}
          </span>
        ) : null}
      </div>
      <p className="mt-0.5 text-xs font-semibold text-slate-500">
        {isClass ? formatDate(item.startDate) : shortDate(item.startDate)}
      </p>
      {isClass ? (
        <>
          {item.time ? (
            <p className="text-xs text-slate-500">🕒 {item.time}</p>
          ) : null}
          {item.location ? (
            <p className="text-xs text-slate-500">📍 {item.location}</p>
          ) : null}
          <p className="text-xs font-bold text-slate-400">{durationLabel(item)}</p>
        </>
      ) : (
        <p className="text-xs font-bold text-slate-400">{durationLabel(item)}</p>
      )}
    </div>
  );
}

/* --------------------------- committee member ----------------------------- */

export function MemberCard({ member }: { member: CommitteeMember }) {
  const hasPhoto = isRealImage(member.photo);
  return (
    <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white text-center shadow-sm transition hover:-translate-y-1 hover:shadow-xl">
      {hasPhoto ? (
        <img src={member.photo} alt={member.name} className="aspect-square w-full object-cover" />
      ) : (
        <MemberAvatar name={member.name} className="aspect-square w-full text-4xl" />
      )}
      <div className="p-4">
        <h3 className="text-base font-extrabold text-slate-900">{member.name}</h3>
        <p className="mt-1 text-sm font-bold text-brand">{member.post}</p>
      </div>
    </article>
  );
}
