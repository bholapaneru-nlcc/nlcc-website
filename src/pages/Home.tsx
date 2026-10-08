import type { ReactNode } from "react";
import { AppShell } from "../components/Layout";
import { EventItem, FeaturedArticle, SideCard, SmartGrid } from "../components/bits";
import { Galaxy } from "../components/Galaxy";
import { Magnetic, Marquee, MaskReveal, Reveal } from "../components/motion";
import {
  daysLeftText,
  fullDate,
  nextTwoWeeks,
  publishedArticles,
  upcomingOnly,
  type NlccItem,
} from "../lib/nlcc";
import { useStore } from "../lib/store";

/* ---------------------------- ticker building ----------------------------- */

/** A section title shown inside the scrolling strip (e.g. "Annual Programme").
 *  Solid white pill + dark text for guaranteed contrast on the dark strip. */
function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-full bg-white px-3 py-1 text-[0.7rem] font-black uppercase tracking-wider text-slate-900 shadow-sm">
      {children}
    </span>
  );
}

/** One scrolling entry: emoji · title — full date · days-left chip.
 *  All colours are solid so nothing fades into the gradient. */
function TickerItem({ emoji, item }: { emoji: string; item: NlccItem }) {
  const left = daysLeftText(item.startDate);
  if (!left) return null; // past item — excluded
  return (
    <span className="inline-flex items-center gap-2 whitespace-nowrap">
      <span className="text-base">{emoji}</span>
      <span className="font-bold text-white">{item.title}</span>
      <span className="text-white/75">— {fullDate(item.startDate)}</span>
      <span className="rounded-full bg-amber-400 px-2 py-0.5 text-[0.7rem] font-black text-slate-900 shadow-sm">
        {left}
      </span>
    </span>
  );
}

/* --------------------------------- hero ----------------------------------- */

function Hero({ tickerItems }: { tickerItems: ReactNode[] }) {
  return (
    <section className="relative isolate flex min-h-[88vh] flex-col overflow-hidden">
      {/* Galaxy backdrop: deep space, four-colour nebula clouds + twinkling
          starfield + scattered drifting planets. */}
      <Galaxy />
      {/* subtle vignette for depth */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 50% 30%, transparent 45%, rgba(2,3,10,0.4) 100%)",
        }}
      />

      {/* Content: fills the available space (flex-1) so the marquee is always
          pinned to the very bottom of the viewport with no gap underneath. */}
      <div className="relative mx-auto flex w-full max-w-[1320px] flex-1 flex-col items-center justify-center px-4 py-10 text-center sm:py-16">
        <MaskReveal
          as="h1"
          text="Welcome"
          className="text-4xl font-bold text-white drop-shadow sm:text-6xl"
        />

        {/* organisation name — three lines grouped tightly */}
        <div className="mt-3 flex flex-col items-center gap-1.5 sm:mt-4 sm:gap-2">
          <MaskReveal
            text="Nepalese Language"
            className="text-xl font-semibold text-white/90 drop-shadow sm:text-3xl"
            delay={0.1}
          />
          <MaskReveal
            text="and"
            className="text-xl font-semibold text-white/90 drop-shadow sm:text-3xl"
            delay={0.18}
          />
          <MaskReveal
            text="Culture Centre"
            className="text-xl font-semibold text-white/90 drop-shadow sm:text-3xl"
            delay={0.26}
          />
        </div>

        <MaskReveal
          text="नमस्ते"
          className="mt-6 text-6xl font-extrabold text-white drop-shadow sm:mt-8 sm:text-8xl"
          delay={0.34}
        />

        <MaskReveal
          text="नेपाली भाषा तथा साँस्कृतिक केन्द्र"
          className="mt-3 text-lg font-medium text-white/85 drop-shadow sm:mt-4 sm:text-3xl"
          delay={0.42}
        />

        <Reveal delay={0.5} className="mt-7 flex flex-wrap items-center justify-center gap-3 sm:mt-9">
          <Magnetic>
            <a
              href="/about"
              className="inline-flex items-center gap-2 rounded-full bg-white px-7 py-3 text-sm font-black text-brand shadow-lg transition hover:shadow-xl"
            >
              Discover NLCC
            </a>
          </Magnetic>
          <Magnetic strength={0.2}>
            <a
              href="/donate"
              className="inline-flex items-center gap-2 rounded-full border border-white/50 bg-white/10 px-7 py-3 text-sm font-black text-white backdrop-blur transition hover:bg-white/20"
            >
              ❤️ Support Us
            </a>
          </Magnetic>
        </Reveal>
      </div>

      {/* schedule marquee at the base of the hero — mirrors the sidebar data.
          Solid dark frosted background guarantees text contrast regardless of
          the drifting crimson/blue gradient behind it. The hero uses 100dvh so
          this sits at the bottom of the visible mobile viewport. */}
      <div className="relative border-t border-white/10 bg-slate-950/85 py-3 backdrop-blur">
        <Marquee
          className="text-sm font-bold text-white"
          duration={26}
          separator={<span className="text-white/30">✦</span>}
          items={
            tickerItems.length
              ? tickerItems
              : ["Welcome to NLCC — preserving Nepali language, culture & identity"]
          }
        />
      </div>
    </section>
  );
}

/* --------------------------------- page ----------------------------------- */

export default function Home() {
  const { data } = useStore();

  const articles = publishedArticles(data).filter((a) => a.showOnHomepage);
  const featured = articles.find((a) => a.featured) || articles[0];
  const latest = articles
    .filter((a) => !featured || a.id !== featured.id)
    .slice(0, Number(data.settings.homepageArticleLimit) || 6);

  const weekly = nextTwoWeeks(data.weeklySchedule);
  const annual = upcomingOnly(data.annualProgrammes);
  const hindu = upcomingOnly(data.hinduDates);

  // Hero ticker — section titles followed by their items, each with a full
  // date and a "days left" chip. Past items (no valid days-left) are excluded.
  const tickerItems: ReactNode[] = [];
  const addSection = (label: string, emoji: string, list: NlccItem[]) => {
    const upcoming = list.filter((it) => daysLeftText(it.startDate));
    if (!upcoming.length) return;
    tickerItems.push(<SectionLabel>{label}</SectionLabel>);
    upcoming.forEach((it) => tickerItems.push(<TickerItem emoji={emoji} item={it} />));
  };
  addSection("Weekly Class Schedule", "🏫", weekly);
  addSection("Annual Programme", "📅", annual);
  addSection("Important Dates", "🪔", hindu);

  const right = (
    <div className="space-y-5">
      <SideCard title="Weekly Class Schedule" tone="blue" note="Next two weeks">
        {weekly.length ? (
          weekly.map((item) => <EventItem key={item.id} item={item} />)
        ) : (
          <p className="px-1 py-2 text-sm text-slate-500">
            No class schedule listed for the next two weeks.
          </p>
        )}
      </SideCard>
      <SideCard title="Our Annual Programmes" tone="red">
        {annual.length ? (
          annual.map((item) => <EventItem key={item.id} item={item} />)
        ) : (
          <p className="px-1 py-2 text-sm text-slate-500">No upcoming annual programmes.</p>
        )}
      </SideCard>
      <SideCard title="Hindu Calendar Dates" tone="green">
        {hindu.length ? (
          hindu.map((item) => <EventItem key={item.id} item={item} />)
        ) : (
          <p className="px-1 py-2 text-sm text-slate-500">
            No upcoming Hindu calendar dates.
          </p>
        )}
      </SideCard>
    </div>
  );

  return (
    <AppShell active="/" right={right} banner={<Hero tickerItems={tickerItems} />}>
      <div className="space-y-7">
        {featured ? (
          <Reveal>
            <FeaturedArticle article={featured} />
          </Reveal>
        ) : null}

        <Reveal>
          <section className="card-panel">
            <div className="-mx-6 mb-5 flex items-center justify-between gap-4 border-b border-slate-200 px-6 pb-4">
              <h2 className="text-2xl font-extrabold tracking-tight text-slate-900">
                Latest Articles
              </h2>
              <a
                href="/articles"
                className="rounded-lg border border-brand-600 bg-white px-4 py-2 text-sm font-black text-brand-600 transition hover:bg-brand-50"
              >
                View All Articles
              </a>
            </div>
            <SmartGrid articles={latest} />
          </section>
        </Reveal>
      </div>
    </AppShell>
  );
}
