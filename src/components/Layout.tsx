import { useEffect, useState, type ReactNode } from "react";
import { useLogo, useNow, useStore } from "../lib/store";
import nepalFlag from "../assets/nepal-flag.svg";

/* ------------------------------- menu items ------------------------------- */

export const MENU = [
  { href: "/", icon: "🏠", label: "Home" },
  { href: "/articles", icon: "📰", label: "Articles" },
  { href: "/archive", icon: "🗂️", label: "Archive" },
  { href: "/donate", icon: "❤️", label: "Donate" },
  { href: "/committee", icon: "👥", label: "Committee" },
  { href: "/contact", icon: "✉️", label: "Contact Us" },
  { href: "/about", icon: "ℹ️", label: "About Us" },
];

/* --------------------------------- clock ---------------------------------- */

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

/* Union Jack rendered as a small circular badge (SVG, so no reliance on
   flag emoji which doesn't render on Windows). */
function FlagUK({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full ring-1 ring-black/15 ${className}`}>
      <svg viewBox="0 0 60 30" preserveAspectRatio="xMidYMid slice" className="h-full w-full">
        <clipPath id="uk-field"><rect width="60" height="30" /></clipPath>
        <clipPath id="uk-trim"><path d="M30,15 h30 v15 z v15 h-30 z h-30 v-15 z v-15 h30 z" /></clipPath>
        <g clipPath="url(#uk-field)">
          <rect width="60" height="30" fill="#012169" />
          <path d="M0,0 L60,30 M60,0 L0,30" stroke="#fff" strokeWidth="6" />
          <path d="M0,0 L60,30 M60,0 L0,30" stroke="#C8102E" strokeWidth="4" clipPath="url(#uk-trim)" />
          <path d="M30,0 v30 M0,15 h60" stroke="#fff" strokeWidth="10" />
          <path d="M30,0 v30 M0,15 h60" stroke="#C8102E" strokeWidth="6" />
        </g>
      </svg>
    </span>
  );
}

/* Nepal flag (crimson double-pennant with blue border, moon & sun) in a
   small circular badge. */
function FlagNepal({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-white ring-1 ring-black/15 ${className}`}>
      <img src={nepalFlag} alt="Nepal" className="h-full w-full object-cover" />
    </span>
  );
}

function Clock({ scrolled = false }: { scrolled?: boolean }) {
  const now = useNow(1000); // ticks every second (original bug #2)

  // Date — "Thursday, 9 July, 2026"
  const dateStr = `${WEEKDAYS[now.getDay()]}, ${now.getDate()} ${MONTHS[now.getMonth()]}, ${now.getFullYear()}`;

  // Live digital times per time zone (BST/DST handled by Intl automatically).
  const zoneTime = (tz: string) =>
    now.toLocaleTimeString("en-GB", {
      timeZone: tz,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
  const london = zoneTime("Europe/London");
  const kathmandu = zoneTime("Asia/Kathmandu");

  const card = scrolled ? "bg-slate-100" : "bg-white/10 backdrop-blur";
  const label = scrolled ? "text-slate-500" : "text-white/70";
  const value = scrolled ? "text-slate-900" : "text-white";
  const bar = scrolled ? "bg-slate-300" : "bg-white/30";

  return (
    <div className="hidden items-center gap-2.5 lg:flex">
      {/* date */}
      <div className={`rounded-xl px-3 py-1.5 text-right ${card}`}>
        <span className={`block text-[0.6rem] font-black uppercase tracking-widest ${label}`}>
          Today
        </span>
        <strong className={`block text-xs font-extrabold ${value}`}>{dateStr}</strong>
      </div>

      {/* London */}
      <div className={`flex items-center gap-2 rounded-xl py-1 pl-2 pr-3 ${card}`}>
        <FlagUK className="h-7 w-7" />
        <div className="leading-none">
          <span className={`block text-[0.6rem] font-black uppercase tracking-widest ${label}`}>
            London
          </span>
          <strong className={`mt-0.5 block font-mono text-sm font-extrabold tabular-nums ${value}`}>
            {london}
          </strong>
        </div>
      </div>

      {/* vertical bar */}
      <span className={`h-8 w-px rounded-full ${bar}`} aria-hidden />

      {/* Kathmandu */}
      <div className={`flex items-center gap-2 rounded-xl py-1 pl-2 pr-3 ${card}`}>
        <FlagNepal className="h-7 w-7" />
        <div className="leading-none">
          <span className={`block text-[0.6rem] font-black uppercase tracking-widest ${label}`}>
            Kathmandu
          </span>
          <strong className={`mt-0.5 block font-mono text-sm font-extrabold tabular-nums ${value}`}>
            {kathmandu}
          </strong>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------- header ---------------------------------- */

function SiteHeader({ onMenu }: { onMenu: () => void }) {
  const { data } = useStore();
  const logo = useLogo();
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const surface = scrolled
    ? "border-b border-slate-200/70 bg-white/80 shadow-sm backdrop-blur-xl"
    : "bg-gradient-to-r from-brand via-brand-600 to-brand-700";

  return (
    <header className={`sticky top-0 z-50 transition-colors duration-300 ${surface}`}>
      <div className="mx-auto flex w-full max-w-[1320px] items-center gap-3 px-4 py-3">
        <a href="/" className="flex min-w-0 items-center gap-2.5 sm:gap-3">
          <img
            src={logo}
            alt="NLCC logo"
            className="h-10 w-10 shrink-0 rounded-full object-cover ring-1 ring-white/30 sm:h-12 sm:w-12"
          />
          <span className="min-w-0 leading-tight">
            <span
              className={`block truncate text-sm font-extrabold tracking-tight transition-colors sm:text-lg ${
                scrolled ? "text-slate-900" : "text-white"
              }`}
            >
              {data.settings.siteTitle}
            </span>
            <span
              className={`hidden truncate text-[0.7rem] font-semibold transition-colors sm:block ${
                scrolled ? "text-slate-500" : "text-white/80"
              }`}
            >
              {data.settings.tagline}
            </span>
          </span>
        </a>
        <div className="ml-auto flex items-center gap-1">
          <Clock scrolled={scrolled} />
          <button
            type="button"
            onClick={onMenu}
            aria-label="Open menu"
            className={`inline-flex h-10 w-10 items-center justify-center rounded-lg transition lg:hidden ${
              scrolled ? "text-slate-700 hover:bg-slate-100" : "text-white hover:bg-white/15"
            }`}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <path d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
      </div>
    </header>
  );
}

/* ------------------------------ mobile drawer ----------------------------- */

function MobileNav({
  open,
  active,
  onClose,
}: {
  open: boolean;
  active: string;
  onClose: () => void;
}) {
  // Lock body scroll while the drawer is open.
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <div className={`fixed inset-0 z-[70] lg:hidden ${open ? "" : "pointer-events-none"}`} aria-hidden={!open}>
      <div
        className={`absolute inset-0 bg-slate-900/50 backdrop-blur-sm transition-opacity duration-300 ${
          open ? "opacity-100" : "opacity-0"
        }`}
        onClick={onClose}
      />
      <div
        className={`absolute left-0 top-0 flex h-full w-72 max-w-[82%] flex-col bg-white shadow-2xl transition-transform duration-300 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between bg-gradient-to-r from-brand via-brand-600 to-brand-700 px-4 py-4 text-white">
          <span className="text-sm font-black uppercase tracking-wide">NLCC Menu</span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close menu"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg hover:bg-white/15"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto p-3">
          <ul className="space-y-1">
            {MENU.map((item) => {
              const isActive =
                active === item.href ||
                (item.href !== "/" && active.startsWith(item.href));
              return (
                <li key={item.href}>
                  <a
                    href={item.href}
                    onClick={onClose}
                    className={`flex items-center gap-3 rounded-xl px-4 py-3.5 text-base font-bold transition ${
                      isActive ? "bg-brand-50 text-brand" : "text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <span className="text-lg">{item.icon}</span>
                    {item.label}
                  </a>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </div>
  );
}

/* ------------------------------- left menu -------------------------------- */

export function LeftMenu({ active }: { active: string }) {
  return (
    <aside className="hidden lg:sticky lg:top-28 lg:block lg:self-start">
      <nav className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
        <div className="mb-2 rounded-lg bg-brand px-4 py-3 text-sm font-black uppercase tracking-wide text-white">
          NLCC
        </div>
        <ul className="space-y-0.5">
          {MENU.map((item) => {
            const isActive =
              active === item.href ||
              (item.href !== "/" && active.startsWith(item.href));
            return (
              <li key={item.href}>
                <a
                  href={item.href}
                  className={`flex items-center gap-2.5 rounded-lg px-3.5 py-2.5 text-sm font-bold transition ${
                    isActive
                      ? "bg-brand-50 text-brand"
                      : "text-slate-600 hover:bg-slate-50 hover:text-brand"
                  }`}
                >
                  <span className="text-base">{item.icon}</span>
                  {item.label}
                </a>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}

/* -------------------------------- footer ---------------------------------- */

function SiteFooter() {
  const { data } = useStore();
  const logo = useLogo();
  return (
    <footer className="mt-12 border-t border-slate-200 bg-white">
      <div className="mx-auto grid w-full max-w-[1320px] gap-8 px-4 py-10 sm:grid-cols-2 lg:grid-cols-3">
        <div>
          <a href="/" className="flex items-center gap-2 transition hover:opacity-80">
            <img
              src={logo}
              alt="NLCC logo"
              className="h-10 w-10 rounded-full object-cover ring-1 ring-slate-200"
            />
            <span className="font-black text-slate-900">NLCC</span>
          </a>
          <p className="mt-3 max-w-xs text-sm leading-relaxed text-slate-500">
            Preserving Nepali language, culture and identity for the next
            generation.
          </p>
        </div>
        <div>
          <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">
            Contact
          </h3>
          <p className="mt-3 text-sm text-slate-600">
            <a
              href={`mailto:${data.settings.contactEmail}`}
              className="font-bold text-ink hover:underline"
            >
              {data.settings.contactEmail}
            </a>
          </p>
          <p className="mt-1 text-sm text-slate-600">
            Watling Community Centre, Edgware
          </p>
          <p className="mt-1 text-sm text-slate-600">Sundays · 10:00–12:00 (term time)</p>
          <a
            href="https://www.facebook.com/profile.php?id=100069997557202"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 transition hover:border-brand hover:text-brand"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <path d="M22 12.06C22 6.5 17.52 2 12 2S2 6.5 2 12.06c0 5 3.66 9.15 8.44 9.94v-7.03H7.9v-2.91h2.54V9.85c0-2.51 1.49-3.9 3.78-3.9 1.1 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56v1.89h2.78l-.44 2.91h-2.34V22c4.78-.79 8.44-4.94 8.44-9.94Z" />
            </svg>
            Follow on Facebook
          </a>
        </div>
        <div>
          <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">
            Explore
          </h3>
          <ul className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
            {MENU.map((item) => (
              <li key={item.href}>
                <a
                  href={item.href}
                  className="text-slate-600 transition hover:text-brand"
                >
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
          <div className="mt-4 border-t border-slate-100 pt-3">
            <h4 className="text-[0.65rem] font-black uppercase tracking-widest text-slate-400">
              Portals
            </h4>
            <div className="mt-2 flex flex-wrap gap-3 text-sm">
              <a href="/teachers" className="text-slate-600 transition hover:text-brand">
                🍎 Teacher Login
              </a>
              <a href="/students" className="text-slate-600 transition hover:text-brand">
                🎓 Student Login
              </a>
            </div>
          </div>
        </div>
      </div>
      <div className="border-t border-slate-100">
        <div className="mx-auto flex w-full max-w-[1320px] flex-col items-center justify-between gap-2 px-4 py-4 text-xs text-slate-400 sm:flex-row">
          <p>
            © {new Date().getFullYear()} Nepalese Language and Culture Centre.
            All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}

/* -------------------------------- shell ----------------------------------- */

export function AppShell({
  active,
  right,
  banner,
  children,
}: {
  active: string;
  right?: ReactNode;
  banner?: ReactNode;
  children: ReactNode;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader onMenu={() => setMenuOpen(true)} />
      <MobileNav open={menuOpen} active={active} onClose={() => setMenuOpen(false)} />
      {banner ? <div className="w-full">{banner}</div> : null}
      <main className="mx-auto w-full max-w-[1320px] flex-1 px-4 py-7 sm:py-8">
        <div
          className={`grid grid-cols-1 gap-6 ${
            right
              ? "xl:grid-cols-[220px_minmax(0,1fr)_320px]"
              : "lg:grid-cols-[220px_minmax(0,1fr)]"
          } items-start`}
        >
          <LeftMenu active={active} />
          <div className="min-w-0">{children}</div>
          {right ? <aside className="xl:sticky xl:top-28 xl:self-start">{right}</aside> : null}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
