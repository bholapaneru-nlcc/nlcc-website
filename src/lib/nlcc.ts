// NLCC data model, helpers and seed data.
//
// This module is the React/Tailwind replacement for the original Astro project's
// `public/site-data.js` (the `window.NLCC` object). It is refactored into typed,
// pure functions so the same logic can be unit-tested and reused across pages.
//
// ---------------------------------------------------------------------------
// BUG FIXES APPLIED HERE (vs. the original repo):
//
// 1. DATE STALENESS (critical). The original seeded every event with a hard-coded
//    date in mid/late-2026. `upcomingOnly()`, `nextTwoWeeks()` and `daysLeftLabel()`
//    all compare against `new Date()`, so once the real "today" drifted past those
//    dates the home sidebars and the programme ticker rendered permanently empty
//    ("No upcoming annual programmes", etc.).
//    FIX: `buildSeedData()` now derives every demo date relative to the *current*
//    day, so the site is evergreen and always demonstrates upcoming content.
//
// 2. ROBUST FILTERING. `upcomingOnly`/`nextTwoWeeks` now also keep events that are
//    still ongoing (endDate in the future) instead of dropping them the moment the
//    start date passes.
// ---------------------------------------------------------------------------

export type EventMode = "day" | "class" | "holiday";

export interface NlccItem {
  id: string;
  title: string;
  startDate: string;
  endDate?: string;
  time?: string;
  location?: string;
  eventMode?: EventMode;
  classMode?: string;
  statusLabel?: string;
  color?: string;
  tithi?: string;
  category?: string;
}

export interface Article {
  id: string;
  type: string;
  title: string;
  startDate: string;
  endDate?: string;
  category: string;
  eventMode?: EventMode;
  statusLabel?: string;
  classMode?: string;
  featureImage?: string;
  galleryImages?: string[];
  homepageSummary: string;
  body: string;
  contentBlocks?: unknown[];
  featured?: boolean;
  showOnHomepage?: boolean;
  layout?: string;
  status: string;
}

export interface CommitteeMember {
  id: string;
  name: string;
  post: string;
  photo?: string;
  order: string;
}

export interface ContactMessage {
  id: string;
  createdAt: string;
  name?: string;
  phone?: string;
  email?: string;
  subject?: string;
  message?: string;
}

export interface Slide {
  id: string;
  title: string;
  summary?: string;
  image?: string;
  link?: string;
}

export interface NlccSettings {
  siteTitle: string;
  tagline: string;
  homepageArticleLimit: number;
  contactEmail: string;
  /** Optional uploaded logo URL; falls back to the bundled SVG when empty. */
  logo?: string;
}

export interface NlccData {
  settings: NlccSettings;
  articles: Article[];
  weeklySchedule: NlccItem[];
  annualProgrammes: NlccItem[];
  hinduDates: NlccItem[];
  committeeMembers: CommitteeMember[];
  contactMessages: ContactMessage[];
  slides: Slide[];
}

/* ----------------------------- date utilities ----------------------------- */

const DAY_MS = 86_400_000;

/** Parse a "YYYY-MM-DD" string as a LOCAL date (avoids UTC off-by-one). */
export function parseDate(value?: string): Date | null {
  if (!value) return null;
  const parts = value.split("-").map(Number);
  if (parts.length < 3 || parts.some((n) => Number.isNaN(n))) return null;
  const d = new Date(parts[0], parts[1] - 1, parts[2]);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function toDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function dayDiff(a: Date, b: Date): number {
  return Math.round((startOfDay(a).getTime() - startOfDay(b).getTime()) / DAY_MS);
}

export function addDaysStr(base: Date, n: number): string {
  const d = new Date(base);
  d.setDate(d.getDate() + n);
  return toDateStr(d);
}

/** "5 Sep 2026" */
export function formatDate(value?: string): string {
  const d = parseDate(value);
  if (!d) return "";
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** "5 Sep" */
export function shortDate(value?: string): string {
  const d = parseDate(value);
  if (!d) return "";
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

/** "Sat 5 Sep 2026" */
export function longDate(value?: string): string {
  const d = parseDate(value);
  if (!d) return "";
  return d.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** "05 September 2026" — zero-padded day, full month name. */
export function fullDate(value?: string): string {
  const d = parseDate(value);
  if (!d) return "";
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

/** Whole days from today until the start date. Negative means past; null if unparseable. */
export function daysUntil(startDate?: string): number | null {
  const d = parseDate(startDate);
  if (!d) return null;
  return dayDiff(d, new Date());
}

/**
 * Friendly "days left" label for tickers/cards:
 * null if the date is in the past (so callers can exclude it),
 * "Today" if the date is today, otherwise "N Days Left".
 */
export function daysLeftText(startDate?: string): string | null {
  const n = daysUntil(startDate);
  if (n === null || n < 0) return null;
  if (n === 0) return "Today";
  return `${n} Days Left`;
}

/* --------------------------- NLCC-style helpers --------------------------- */

export function durationWeeks(startDate: string, endDate?: string): number {
  const start = parseDate(startDate);
  if (!start) return 1;
  const end = parseDate(endDate) ?? start;
  const diffDays = Math.max(1, dayDiff(end, start) + 1);
  return Math.max(1, Math.ceil(diffDays / 7));
}

export function durationLabel(item: NlccItem): string {
  if (!item.startDate) return "";
  const end = item.endDate || item.startDate;

  if (item.eventMode === "class") {
    return `${item.statusLabel || "Scheduled"}${
      item.classMode ? "/" + item.classMode : ""
    }`;
  }

  if (item.eventMode === "holiday") {
    const weeks = durationWeeks(item.startDate, end);
    return `${item.statusLabel || item.title || "Holiday"} for ${weeks} ${
      weeks === 1 ? "Week" : "Weeks"
    }`;
  }

  if (!item.endDate || item.endDate === item.startDate)
    return item.statusLabel || "Day Programme";

  const weeks = durationWeeks(item.startDate, end);
  return `${item.statusLabel || item.title} for ${weeks} ${
    weeks === 1 ? "Week" : "Weeks"
  }`;
}

/** "5 Sep 2026 – 13 Sep 2026" or single date. */
export function dateRange(item: { startDate?: string; endDate?: string }): string {
  if (!item.startDate) return "";
  if (item.endDate && item.endDate !== item.startDate) {
    return `${formatDate(item.startDate)} – ${formatDate(item.endDate)}`;
  }
  return formatDate(item.startDate);
}

/** Returns null for past dates; otherwise a friendly "in X days/weeks" label. */
export function daysLeftLabel(startDate?: string): string | null {
  const start = parseDate(startDate);
  if (!start) return null;
  const diff = dayDiff(start, new Date());
  if (diff < 0) return null;
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  if (diff < 7) return `in ${diff} days`;
  if (diff < 14) return "in 1 week";
  const weeks = Math.round(diff / 7);
  return `in ${weeks} weeks`;
}

/** Events whose start date is today or later, OR which are still ongoing. */
export function upcomingOnly<T extends NlccItem>(list: T[]): T[] {
  const today = startOfDay(new Date());
  return list
    .filter((item) => {
      const start = parseDate(item.startDate);
      if (!start) return false;
      const end = parseDate(item.endDate) ?? start;
      // upcoming start, or currently in progress
      return start.getTime() >= today.getTime() || end.getTime() >= today.getTime();
    })
    .sort((a, b) => {
      const da = parseDate(a.startDate)?.getTime() ?? 0;
      const db = parseDate(b.startDate)?.getTime() ?? 0;
      return da - db;
    });
}

/** Events starting within the next 14 days (used by the weekly class schedule). */
export function nextTwoWeeks<T extends NlccItem>(list: T[]): T[] {
  const today = startOfDay(new Date());
  const horizon = new Date(today);
  horizon.setDate(horizon.getDate() + 14);
  return list
    .filter((item) => {
      const start = parseDate(item.startDate);
      if (!start) return false;
      return start.getTime() >= today.getTime() && start.getTime() <= horizon.getTime();
    })
    .sort((a, b) => {
      const da = parseDate(a.startDate)?.getTime() ?? 0;
      const db = parseDate(b.startDate)?.getTime() ?? 0;
      return da - db;
    });
}

export function publishedArticles(data: NlccData): Article[] {
  return (data.articles || [])
    .filter((a) => a.status === "published" && a.type !== "schedule")
    .sort((a, b) => {
      const da = parseDate(a.startDate)?.getTime() ?? 0;
      const db = parseDate(b.startDate)?.getTime() ?? 0;
      return db - da; // newest first
    });
}

/** Articles whose start date has passed (Archive view). */
export function pastArticles(data: NlccData): Article[] {
  const today = startOfDay(new Date());
  return publishedArticles(data).filter((a) => {
    const start = parseDate(a.startDate);
    return start ? start.getTime() < today.getTime() : true;
  });
}

/** The "smart" 3-column span algorithm (see README v6.4). */
export function smartSpanClass(index: number, total: number): "span-1" | "span-2" | "span-3" {
  const remainder = total % 3;
  if (remainder === 0) return "span-1";
  if (remainder === 1) return index === 0 ? "span-3" : "span-1";
  // remainder === 2
  if (index === 0) return "span-2";
  return "span-1";
}

export function slug(text: string): string {
  return (
    text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") || Date.now().toString()
  );
}

/* ------------------------------- seed data -------------------------------- */

const SETTINGS: NlccSettings = {
  siteTitle: "Nepalese Language and Culture Centre",
  tagline: "Preserving Nepali Language, Culture & Identity",
  homepageArticleLimit: 6,
  contactEmail: "enquiry@nlccuk.com",
};

/**
 * Build evergreen demo data. Every date is an offset from TODAY so the
 * "upcoming" / "next two weeks" sections always have content to show.
 */
export function buildSeedData(now = new Date()): NlccData {
  // Next Saturday / Sunday from `now`.
  const nextWeekday = (target: number): string => {
    const d = new Date(now);
    const cur = d.getDay();
    let shift = (target - cur + 7) % 7;
    if (shift === 0) shift = 7; // always the *next* occurrence
    d.setDate(d.getDate() + shift);
    return toDateStr(d);
  };

  return {
    settings: SETTINGS,
    articles: [
      {
        id: "oral-health-programme",
        type: "news",
        title: "Health and Wellbeing Hub Delivers Oral Health Programme",
        startDate: addDaysStr(now, -18),
        category: "Health & Wellbeing",
        eventMode: "day",
        statusLabel: "Completed",
        featureImage: "health",
        galleryImages: ["health", "classes"],
        homepageSummary:
          "Children learned about brushing, healthy eating habits and the importance of regular dental care.",
        body: "The Health and Wellbeing Hub recently organised an engaging Oral Health awareness programme for children attending NLCC. The session was designed to help children understand the importance of maintaining good oral hygiene from an early age.\n\nChildren learned about correct brushing techniques, healthy food choices and the importance of regular dental check-ups. The session was interactive and encouraged children to ask questions and share their own experiences.\n\nParents also received practical advice on supporting children's oral health at home. The programme was well received by both children and parents.",
        contentBlocks: [],
        featured: true,
        showOnHomepage: true,
        layout: "large",
        status: "published",
      },
      {
        id: "family-cultural-day",
        type: "news",
        title: "NLCC Celebrates Successful Family Cultural Day",
        startDate: addDaysStr(now, -8),
        category: "Community News",
        eventMode: "day",
        statusLabel: "Completed",
        featureImage: "community",
        galleryImages: ["community"],
        homepageSummary:
          "Families came together for a vibrant day of language, culture, food and community celebration.",
        body: "NLCC recently hosted a vibrant Family Cultural Day, bringing together children, parents, volunteers and community members for a day of learning, celebration and cultural exchange.\n\nChildren participated in Nepali language games, cultural quizzes, storytelling sessions and traditional arts and crafts.\n\nNLCC thanks all volunteers, teachers, parents and supporters who helped make the event a success.",
        contentBlocks: [],
        featured: false,
        showOnHomepage: true,
        layout: "medium",
        status: "published",
      },
      {
        id: "sports-day-update",
        type: "news",
        title: "Annual Sports Day Preparation Update",
        startDate: addDaysStr(now, -3),
        category: "Events",
        eventMode: "day",
        statusLabel: "Published",
        featureImage: "sports-day",
        galleryImages: [],
        homepageSummary:
          "NLCC is preparing for the annual sports day and family picnic with activities for children and parents.",
        body: "Preparations are underway for the NLCC Annual Sports Day and Picnic. The event will bring families together for sports, food, friendship and community celebration.\n\nFamilies are invited to join us for a full day of games, races and a shared community picnic. Please bring a dish to share if you can.",
        contentBlocks: [],
        featured: false,
        showOnHomepage: true,
        layout: "small",
        status: "published",
      },
      {
        id: "language-club-launch",
        type: "news",
        title: "New Saturday Language Club Launches",
        startDate: addDaysStr(now, -1),
        category: "Classes",
        eventMode: "day",
        statusLabel: "Published",
        featureImage: "classes",
        galleryImages: [],
        homepageSummary:
          "Our refreshed Saturday Nepali language club welcomes new learners with songs, stories and games.",
        body: "We are delighted to announce the launch of our refreshed Saturday Nepali Language Club. The club offers a fun, friendly environment where children learn through songs, stories, games and creative activities.\n\nSessions are tailored to different age groups and run during term time. New members are always welcome — please contact us to register your child.",
        contentBlocks: [],
        featured: false,
        showOnHomepage: true,
        layout: "small",
        status: "published",
      },
    ],
    weeklySchedule: [
      {
        id: "saturday-online",
        title: "Saturday Online Class",
        startDate: nextWeekday(6),
        time: "10:30–11:30",
        location: "Online",
        eventMode: "class",
        classMode: "Online",
        statusLabel: "Scheduled",
        color: "blue",
      },
      {
        id: "sunday-physical",
        title: "Sunday Physical Class",
        startDate: nextWeekday(0),
        time: "10:00–12:00",
        location: "Watling Community Centre",
        eventMode: "class",
        classMode: "Physical",
        statusLabel: "Scheduled",
        color: "green",
      },
      {
        id: "summer-holiday",
        title: "Summer Holiday",
        startDate: addDaysStr(now, 17),
        endDate: addDaysStr(now, 45),
        eventMode: "holiday",
        statusLabel: "Summer Holiday",
        color: "red",
      },
    ],
    annualProgrammes: [
      {
        id: "sports-day",
        title: "Sports Day & Picnic",
        startDate: addDaysStr(now, 9),
        time: "11:00–17:00",
        location: "Sudbury Hill Sports Ground",
        eventMode: "day",
        statusLabel: "Scheduled",
        color: "red",
      },
      {
        id: "teej",
        title: "Haritalika Teej",
        startDate: addDaysStr(now, 33),
        time: "11:00–17:00",
        location: "Watling Community Centre",
        eventMode: "day",
        statusLabel: "Scheduled",
        color: "pink",
      },
    ],
    hinduDates: [
      {
        id: "janai",
        title: "Janai Purnima",
        startDate: addDaysStr(now, 18),
        eventMode: "day",
        statusLabel: "Festival",
        tithi: "Purnima",
        color: "orange",
      },
      {
        id: "dashain",
        title: "Dashain Begins",
        startDate: addDaysStr(now, 55),
        endDate: addDaysStr(now, 69),
        eventMode: "holiday",
        statusLabel: "Dashain",
        color: "green",
      },
      {
        id: "tihar",
        title: "Tihar",
        startDate: addDaysStr(now, 88),
        endDate: addDaysStr(now, 94),
        eventMode: "holiday",
        statusLabel: "Tihar",
        color: "purple",
      },
    ],
    committeeMembers: [
      { id: "chairman", name: "Bhola Paneru", post: "Chairman", photo: "", order: "1" },
      { id: "secretary", name: "Umesh Khadka", post: "Secretary", photo: "", order: "2" },
      { id: "treasurer", name: "Krishna Karki", post: "Treasurer", photo: "", order: "3" },
      { id: "sports-coordinator", name: "Rupak Pant", post: "Sports Coordinator", photo: "", order: "4" },
    ],
    slides: [
      {
        id: "main-banner",
        title: "Welcome to NLCC",
        summary: "Preserving Nepali language, culture & identity for the next generation.",
        image: "",
        link: "/",
      },
    ],
    contactMessages: [],
  };
}
