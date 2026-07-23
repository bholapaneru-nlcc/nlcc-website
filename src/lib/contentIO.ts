import type { NlccData } from "./nlcc";

/* ----------------------- commit-based content I/O ------------------------- */
//
// Lets you persist admin content through Git/GitHub instead of (or as well as)
// the browser's localStorage:
//
//   1. Edit content in the admin (kept in localStorage for instant preview).
//   2. Click "Export content"  -> downloads `site-content.json`.
//   3. Save that file into the repo at  src/data/site-content.json  (overwrite).
//   4. git add / commit / push.
//   5. The committed file becomes the durable source of truth: the app loads
//      it at build time, so the live site has the new content, with no storage
//      limits and no "disappeared on refresh" problems.

/**
 * Export the current site data as a downloadable JSON file.
 * `exportedAt` is stamped so the app can detect when committed content changes.
 */
export function exportContent(data: NlccData): void {
  const payload = { ...data, exportedAt: new Date().toISOString() };
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "site-content.json";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/** Validate that a parsed object looks like site data. */
function isSiteData(value: unknown): value is NlccData {
  return (
    !!value &&
    typeof value === "object" &&
    Array.isArray((value as NlccData).articles) &&
    !!(value as NlccData).settings
  );
}

/** Read an exported JSON file and return validated site data (or null). */
export function importContent(file: File): Promise<NlccData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read the file."));
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result as string);
        if (!isSiteData(parsed)) {
          reject(new Error("That file doesn't look like valid NLCC content."));
          return;
        }
        resolve(parsed);
      } catch {
        reject(new Error("That file is not valid JSON."));
      }
    };
    reader.readAsText(file);
  });
}
