import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";
import { ErrorBoundary } from "./components/ErrorBoundary";
import logo from "./assets/logo.svg";

// Pick the best favicon: an uploaded logo (stored in settings), otherwise the
// bundled SVG.
function resolveFavicon(): string {
  try {
    const raw = localStorage.getItem("nlccWebsiteDataV6");
    if (raw) {
      const settings = JSON.parse(raw)?.settings;
      const stored = settings?.logo;
      if (typeof stored === "string" && stored.length > 0) return stored;
    }
  } catch {
    /* ignore */
  }
  return logo;
}

// Browsers cache favicons very aggressively, so simply changing an existing
// link's href is often ignored. We remove all existing icon links and insert a
// fresh <link> element, with a cache-busting query on hosted URLs, which forces
// the browser to pick up the change on each load.
function applyFavicon(href: string) {
  document
    .querySelectorAll("link[rel='icon'], link[rel='shortcut icon']")
    .forEach((el) => el.remove());
  const link = document.createElement("link");
  link.rel = "icon";
  // Data URLs and bundled assets don't need (and break with) a query string;
  // hosted http(s) URLs get a cache-buster.
  link.href = /^https?:\/\//.test(href) ? `${href}?v=${Date.now()}` : href;
  document.head.appendChild(link);
}

applyFavicon(resolveFavicon());

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>
);
