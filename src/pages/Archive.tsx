import { AppShell } from "../components/Layout";
import { ArticleImage, PageHeader } from "../components/bits";
import { Reveal } from "../components/motion";
import { formatDate, parseDate, publishedArticles, type Article } from "../lib/nlcc";
import { useStore } from "../lib/store";

/* Group every published article (news + events) into year → month buckets,
   newest first. A few entries whose date can't be parsed fall back to an
   "Undated" group. */

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

interface MonthGroup {
  monthIndex: number;
  label: string;
  articles: Article[];
}
interface YearGroup {
  year: number;
  count: number;
  months: MonthGroup[];
}

function buildArchive(articles: Article[]): { groups: YearGroup[]; undated: Article[] } {
  const byYear = new Map<number, Map<number, Article[]>>();
  const undated: Article[] = [];

  for (const a of articles) {
    const d = parseDate(a.startDate);
    if (!d) {
      undated.push(a);
      continue;
    }
    const y = d.getFullYear();
    const m = d.getMonth();
    if (!byYear.has(y)) byYear.set(y, new Map());
    const ym = byYear.get(y)!;
    if (!ym.has(m)) ym.set(m, []);
    ym.get(m)!.push(a);
  }

  const groups: YearGroup[] = [...byYear.keys()]
    .sort((a, b) => b - a)
    .map((year) => {
      const ym = byYear.get(year)!;
      const months: MonthGroup[] = [...ym.keys()]
        .sort((a, b) => b - a)
        .map((monthIndex) => ({
          monthIndex,
          label: MONTH_NAMES[monthIndex],
          articles: ym.get(monthIndex)!,
        }));
      const count = months.reduce((n, mo) => n + mo.articles.length, 0);
      return { year, count, months };
    });

  return { groups, undated };
}

/* --------------------------------- row ------------------------------------ */

function ArchiveRow({ article }: { article: Article }) {
  return (
    <a
      href={`/articles/${article.id}`}
      className="group flex items-center gap-4 rounded-xl border border-transparent px-3 py-3 transition hover:border-slate-200 hover:bg-slate-50"
    >
      <ArticleImage
        slug={article.featureImage}
        className="h-12 w-16 shrink-0 rounded-lg sm:h-14 sm:w-20"
      />
      <div className="min-w-0 flex-1">
        <h3 className="truncate text-sm font-extrabold text-slate-900 transition group-hover:text-brand sm:text-base">
          {article.title}
        </h3>
        <span className="mt-0.5 block text-xs font-black uppercase tracking-wider text-brand-600">
          {article.category}
        </span>
      </div>
      <span className="hidden shrink-0 text-xs font-semibold text-slate-400 sm:block">
        {formatDate(article.startDate)}
      </span>
    </a>
  );
}

/* --------------------------------- page ----------------------------------- */

export default function Archive() {
  const { data } = useStore();
  const { groups, undated } = buildArchive(publishedArticles(data));
  const total = publishedArticles(data).length;

  return (
    <AppShell active="/archive">
      <PageHeader
        kicker="Archive"
        title="News & Events Archive"
        subtitle="A complete chronological record of every NLCC article, news story and event — grouped by year and month."
      />

      <div className="mt-6 flex items-center gap-3 text-sm font-bold text-slate-500">
        <span className="rounded-full bg-brand-50 px-3 py-1 text-brand">
          {total} {total === 1 ? "entry" : "entries"}
        </span>
        <span>Sorted newest first</span>
      </div>

      {groups.length === 0 && undated.length === 0 ? (
        <div className="card-panel mt-6 text-slate-500">No entries in the archive yet.</div>
      ) : null}

      <div className="mt-6 space-y-10">
        {groups.map((yg, yi) => (
          <Reveal key={yg.year} delay={yi * 0.03}>
            <section>
              {/* year header */}
              <div className="mb-4 flex items-center gap-4">
                <div className="flex flex-col items-center justify-center">
                  <span className="font-display text-4xl font-extrabold leading-none text-brand sm:text-5xl">
                    {yg.year}
                  </span>
                </div>
                <div className="h-px flex-1 bg-gradient-to-r from-brand-600/40 to-transparent" />
                <span className="shrink-0 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-black text-slate-500">
                  {yg.count} {yg.count === 1 ? "entry" : "entries"}
                </span>
              </div>

              {/* months */}
              <div className="space-y-6 sm:pl-2">
                {yg.months.map((mg) => (
                  <div key={mg.monthIndex}>
                    <h3 className="mb-1.5 flex items-center gap-2 text-sm font-black uppercase tracking-widest text-slate-700">
                      <span className="inline-block h-2 w-2 rounded-full bg-brand-600" />
                      {mg.label}
                      <span className="text-slate-300">·</span>
                      <span className="text-slate-400">
                        {mg.articles.length} {mg.articles.length === 1 ? "item" : "items"}
                      </span>
                    </h3>
                    <div className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white sm:border-transparent sm:bg-transparent">
                      {mg.articles.map((a) => (
                        <ArchiveRow key={a.id} article={a} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </Reveal>
        ))}

        {/* undated fallback */}
        {undated.length > 0 ? (
          <Reveal>
            <section>
              <div className="mb-4 flex items-center gap-4">
                <span className="font-display text-3xl font-extrabold text-slate-400">
                  Undated
                </span>
                <div className="h-px flex-1 bg-slate-200" />
              </div>
              <div className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white">
                {undated.map((a) => (
                  <ArchiveRow key={a.id} article={a} />
                ))}
              </div>
            </section>
          </Reveal>
        ) : null}
      </div>
    </AppShell>
  );
}
