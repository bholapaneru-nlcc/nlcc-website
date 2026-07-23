import {
  doc,
  getDoc,
  onSnapshot,
  setDoc,
} from "firebase/firestore";
import { db } from "./firebase";
import { buildSeedData, type NlccData } from "./nlcc";

/* --------------------------- firestore content ---------------------------- */
//
// The whole site's content lives in ONE Firestore document: `content/main`.
// (Each article is a distinct entry inside the `articles` array — visible and
// editable in the Firebase console.) This keeps edits atomic and gives us a
// single real-time stream for the whole site.
//
// Images are NOT stored here — they go to Firebase Storage (see upload.ts), so
// this document stays small (text only), well within Firestore's 1 MB limit.

const CONTENT_DOC = { collection: "content", id: "main" };

/** True when a parsed object looks like real site data. */
function isSiteData(value: unknown): value is NlccData {
  return (
    !!value &&
    typeof value === "object" &&
    !!(value as NlccData).settings &&
    Array.isArray((value as NlccData).articles)
  );
}

/**
 * Subscribe to the live site document. Seeds the demo data on first ever load,
 * then calls `onData` whenever the content changes in the database (real-time,
 * across all browsers/devices). Returns an unsubscribe function.
 */
export function subscribeToContent(onData: (data: NlccData) => void): () => void {
  if (!db) return () => {};

  const ref = doc(db, CONTENT_DOC.collection, CONTENT_DOC.id);

  // Seed once if the document has never been created.
  getDoc(ref)
    .then((snap) => {
      if (!snap.exists()) {
        void setDoc(ref, buildSeedData() as unknown as Record<string, unknown>).catch(
          () => {
            /* permissions/offline — ignore; app still works from seed */
          },
        );
      }
    })
    .catch(() => {
      /* ignore */
    });

  // Real-time listener.
  return onSnapshot(ref, (snap) => {
    if (snap.exists()) {
      const data = snap.data() as unknown;
      if (isSiteData(data)) onData(data);
    }
  });
}

/** Save the full site content to Firestore. */
export async function saveContent(data: NlccData): Promise<void> {
  if (!db) throw new Error("Firestore is not configured.");
  await setDoc(
    doc(db, CONTENT_DOC.collection, CONTENT_DOC.id),
    data as unknown as Record<string, unknown>,
  );
}
