import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { buildSeedData, type NlccData } from "./nlcc";
import logoFile from "../assets/logo.svg";
import committedContent from "../data/site-content.json";
import { isFirebaseConfigured } from "./firebase";
import { saveContent, subscribeToContent } from "./db";

/* ------------------------------ data store -------------------------------- */
//
// Content can come from two places:
//   1. The committed file `src/data/site-content.json` (exported from Admin and
//      pushed via Git) — this is the DURABLE source of truth.
//   2. localStorage — a per-browser working/preview copy, plus the evergreen
//      demo seed for brand-new visitors who haven't exported anything yet.
//
// On load, if the committed file has newer content (a fresh `exportedAt`),
// the app adopts it, resetting localStorage so your pushed edits always win.

const DATA_KEY = "nlccWebsiteDataV6";
const SEED_KEY = "nlccWebsiteSeedVersion";
const SEED_VERSION = "7.0.0"; // bumped for the Version 7 page-builder + admin
const COMMITTED_AT_KEY = "nlccCommittedAt";

/* The committed content from src/data/site-content.json (null = not yet
   exported/committed, so we fall back to the built-in demo seed). */
const COMMITTED_RAW = committedContent as unknown as {
  articles?: unknown;
  settings?: unknown;
  exportedAt?: string | null;
};
const COMMITTED: NlccData | null =
  COMMITTED_RAW && Array.isArray(COMMITTED_RAW.articles) && COMMITTED_RAW.settings
    ? (COMMITTED_RAW as unknown as NlccData)
    : null;
const COMMITTED_AT: string | null =
  typeof COMMITTED_RAW?.exportedAt === "string" ? COMMITTED_RAW.exportedAt : null;

/* --------------------------------- logo ----------------------------------- */
// Brand logo. Imported as a local asset so it is inlined into the single-file
// build (no dependence on any external/temporary hosting URL).
//
// TO REPLACE WITH THE REAL LOGO: drop a file at `src/assets/logo.svg`
// (or .png — update the import) and rebuild.
export const LOGO_URL = logoFile;

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function loadData(): NlccData {
  // NEVER throw from here: this runs inside a React useState initializer, so an
  // uncaught error (e.g. QuotaExceededError from large base64 image uploads, or
  // corrupt storage in private mode) would crash the whole app on load.
  if (typeof window === "undefined") return clone(buildSeedData());

  const readStored = (): NlccData | null => {
    try {
      const raw = window.localStorage.getItem(DATA_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as NlccData;
      if (!parsed?.settings || !Array.isArray(parsed.articles)) return null;
      return parsed;
    } catch {
      return null;
    }
  };

  const writeStored = (value: NlccData): boolean => {
    try {
      window.localStorage.setItem(DATA_KEY, JSON.stringify(value));
      return true;
    } catch {
      // Storage full or unavailable — clear and retry once, else give up
      // (we still return the data in-memory so the site keeps working).
      try {
        window.localStorage.removeItem(DATA_KEY);
        window.localStorage.setItem(DATA_KEY, JSON.stringify(value));
        return true;
      } catch {
        return false;
      }
    }
  };

  try {
    // FIRST — if there is committed content (exported from Admin and committed
    // to src/data/site-content.json) and it changed since this browser last saw
    // it, adopt it as the fresh base. This makes a Git push the source of truth.
    if (COMMITTED && COMMITTED_AT) {
      let knownAt = "";
      try {
        knownAt = window.localStorage.getItem(COMMITTED_AT_KEY) || "";
      } catch {
        /* ignore */
      }
      if (knownAt !== COMMITTED_AT) {
        const base = clone(COMMITTED);
        writeStored(base);
        try {
          window.localStorage.setItem(COMMITTED_AT_KEY, COMMITTED_AT);
        } catch {
          /* ignore */
        }
        return base;
      }
    }

    const stored = readStored();
    const marker = window.localStorage.getItem(SEED_KEY);

    // CASE 1 — brand new visitor (no stored data and never seen before):
    // seed the defaults once.
    if (!stored && marker === null) {
      const fresh = clone(buildSeedData());
      writeStored(fresh);
      try {
        window.localStorage.setItem(SEED_KEY, SEED_VERSION);
      } catch {
        /* ignore marker write failures */
      }
      return fresh;
    }

    // CASE 2 — we already have saved data: ALWAYS use it, and NEVER overwrite
    // the user's content (articles, committee, settings, etc.) just because
    // the shipped seed version changed. This is what keeps your edits across
    // refreshes/redeploys.
    if (stored) {
      // (Keep the marker current so future logic still knows we've visited.)
      if (marker !== SEED_VERSION) {
        try {
          window.localStorage.setItem(SEED_KEY, SEED_VERSION);
        } catch {
          /* ignore */
        }
      }
      return stored;
    }

    // CASE 3 — a marker exists but the stored data is missing/corrupt: reseed
    // defaults so the site still loads.
    const fresh = clone(buildSeedData());
    writeStored(fresh);
    try {
      window.localStorage.setItem(SEED_KEY, SEED_VERSION);
    } catch {
      /* ignore */
    }
    return fresh;
  } catch {
    // Absolute last resort — always return usable data.
    return clone(buildSeedData());
  }
}

interface StoreValue {
  data: NlccData;
  save: (next: NlccData) => void;
  reset: () => void;
  /** Set when the last save could not be persisted to storage (e.g. quota full). */
  persistError: string | null;
  clearPersistError: () => void;
}

const StoreContext = createContext<StoreValue | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  // Optimistic initial data (localStorage / committed JSON / seed) renders the
  // site instantly. If Firebase is configured, a real-time Firestore listener
  // then overrides this with the canonical database content.
  const [data, setData] = useState<NlccData>(() => loadData());
  const [persistError, setPersistError] = useState<string | null>(null);
  const useFirebase = isFirebaseConfigured;

  // Subscribe to Firestore content (real-time) when configured.
  useEffect(() => {
    if (!useFirebase) return;
    const unsub = subscribeToContent((next) => setData(next));
    return () => unsub();
  }, [useFirebase]);

  // Keep the browser favicon in sync with the chosen logo (uploaded or default),
  // so uploading a logo in admin updates the favicon without a reload.
  useEffect(() => {
    const href = data.settings.logo || logoFile;
    if (typeof document === "undefined") return;
    document
      .querySelectorAll("link[rel='icon'], link[rel='shortcut icon']")
      .forEach((el) => el.remove());
    const link = document.createElement("link");
    link.rel = "icon";
    link.href = /^https?:\/\//.test(href) ? `${href}?v=${Date.now()}` : href;
    document.head.appendChild(link);
  }, [data.settings.logo]);

  const save = useCallback(
    (next: NlccData) => {
      setData(next); // instant in-memory update so the UI stays responsive
      if (useFirebase) {
        // Persist to Firestore (the database). The real-time listener reflects
        // it back across all browsers/devices. Errors surface as a banner.
        saveContent(next).catch(() =>
          setPersistError(
            "This change could not be saved to the database. Check your Firebase setup and that you are signed in, then try again.",
          ),
        );
        return;
      }
      // Local fallback (no Firebase configured) — write to browser storage.
      try {
        window.localStorage.setItem(DATA_KEY, JSON.stringify(next));
        setPersistError(null);
      } catch {
        setPersistError(
          "This change could not be saved to your browser storage (it's full or unavailable). It will disappear when you refresh. Add Firebase credentials in .env to use a proper database.",
        );
      }
    },
    [useFirebase],
  );

  const clearPersistError = useCallback(() => setPersistError(null), []);

  const reset = useCallback(() => {
    const fresh = buildSeedData();
    if (useFirebase) {
      saveContent(fresh).catch(() => {
        /* ignore */
      });
    } else {
      try {
        window.localStorage.setItem(DATA_KEY, JSON.stringify(fresh));
        window.localStorage.setItem(SEED_KEY, SEED_VERSION);
      } catch {
        /* ignore */
      }
    }
    setData(fresh);
  }, [useFirebase]);

  return (
    <StoreContext.Provider value={{ data, save, reset, persistError, clearPersistError }}>
      {children}
    </StoreContext.Provider>
  );
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used within a StoreProvider");
  return ctx;
}

/** Resolves the site logo: an uploaded logo URL, else the bundled SVG. */
export function useLogo(): string {
  const { data } = useStore();
  return data.settings.logo || logoFile;
}

/* ------------------------------- routing ---------------------------------- */
//
// Clean (History API) routing — URLs like "/about" with no "#" in the address
// bar. Internal links are written as normal hrefs (e.g. href="/about"); a
// delegated click handler (useLinkInterceptor) intercepts same-origin clicks
// and does a client-side pushState navigation instead of a full page reload.
//
// Deep-linking / refresh works because the host serves index.html for every
// path (Vite dev/preview do this by default; Netlify via the redirect rule in
// netlify.toml).

export interface Route {
  /** e.g. ["articles", "some-id"] for /articles/some-id */
  segments: string[];
  query: URLSearchParams;
  /** normalised path, e.g. "/articles/some-id" */
  path: string;
}

function parseLocation(): Route {
  if (typeof window === "undefined") {
    return { segments: [], query: new URLSearchParams(), path: "/" };
  }
  const path = window.location.pathname.replace(/\/+$/, "") || "/";
  const segments = path.split("/").map((s) => s.trim()).filter(Boolean);
  return {
    segments,
    query: new URLSearchParams(window.location.search),
    path,
  };
}

export function navigate(to: string) {
  const target = to.startsWith("/") ? to : "/" + to;
  if (window.location.pathname === target) {
    window.scrollTo({ top: 0, behavior: "smooth" });
    return;
  }
  window.history.pushState({}, "", target);
  window.dispatchEvent(new PopStateEvent("popstate"));
}

export function useRoute(): Route {
  const [route, setRoute] = useState<Route>(() => parseLocation());

  useEffect(() => {
    const onChange = () => {
      setRoute(parseLocation());
      window.scrollTo({ top: 0, behavior: "smooth" });
    };
    window.addEventListener("popstate", onChange);
    return () => window.removeEventListener("popstate", onChange);
  }, []);

  return route;
}

/** Intercepts clicks on internal `<a href="/...">` links for client-side nav. */
export function useLinkInterceptor() {
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return; // open-in-new-tab etc.
      const a = (e.target as HTMLElement | null)?.closest?.("a");
      if (!a) return;
      const href = a.getAttribute("href");
      if (!href || !href.startsWith("/")) return; // only internal paths
      if (a.target === "_blank" || a.hasAttribute("download")) return;
      e.preventDefault();
      navigate(href);
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);
}

/* ------------------------------- clock hook ------------------------------- */
//
// Original bug #2: the live clock did not tick every second. This hook owns a
// single interval and always clears it on unmount (no leaked timers).
export function useNow(intervalMs = 1000): Date {
  const [now, setNow] = useState<Date>(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);
  return now;
}
