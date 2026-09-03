import { doc, getDoc, onSnapshot, setDoc } from "firebase/firestore";
import { db, isFirebaseConfigured } from "./firebase";
import { cleanForFirestore } from "./firestoreUtils";

/* ------------------------------ admin store -------------------------------- */
//
// Admin users are authorised by email. The default admin is
// bhola.paneru@nlccuk.com. Admins can add/remove other @nlccuk.com emails.
// Stored in Firestore document content/admins.

const DEFAULT_ADMINS = ["bhola.paneru@nlccuk.com"];
const DOC_PATH = { collection: "content", id: "admins" };
const LS_KEY = "nlccAdminsV1";

interface AdminDoc {
  emails: string[];
}

let cache: AdminDoc = { emails: [...DEFAULT_ADMINS] };
const listeners = new Set<() => void>();
let initialised = false;

function notify() { listeners.forEach((l) => l()); }

function readLocal(): AdminDoc {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return { emails: [...DEFAULT_ADMINS] };
}

function writeLocal(d: AdminDoc) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(d)); } catch { /* ignore */ }
}

export function initAdminStore(onData?: (d: AdminDoc) => void): () => void {
  if (!initialised) {
    initialised = true;
    if (isFirebaseConfigured && db) {
      getDoc(doc(db, DOC_PATH.collection, DOC_PATH.id))
        .then((snap) => {
          if (snap.exists()) {
            cache = snap.data() as unknown as AdminDoc;
            if (!cache.emails?.length) cache.emails = [...DEFAULT_ADMINS];
          }
          onData?.(cache); notify();
        })
        .catch(() => { cache = readLocal(); onData?.(cache); notify(); });
    } else {
      cache = readLocal(); onData?.(cache); notify();
    }
  }

  let unsub = () => {};
  if (isFirebaseConfigured && db) {
    unsub = onSnapshot(doc(db, DOC_PATH.collection, DOC_PATH.id), (snap) => {
      if (snap.exists()) {
        cache = snap.data() as unknown as AdminDoc;
        if (!cache.emails?.length) cache.emails = [...DEFAULT_ADMINS];
        onData?.(cache); notify();
      }
    });
  }

  const local = () => onData?.(cache);
  listeners.add(local);

  if (typeof window !== "undefined") {
    const onStorage = (e: StorageEvent) => {
      if (e.key === LS_KEY) { cache = readLocal(); onData?.(cache); notify(); }
    };
    window.addEventListener("storage", onStorage);
    return () => { listeners.delete(local); unsub(); window.removeEventListener("storage", onStorage); };
  }
  return () => { listeners.delete(local); unsub(); };
}

export function getAdminEmails(): string[] {
  return cache.emails || [...DEFAULT_ADMINS];
}

export async function addAdminEmail(email: string): Promise<void> {
  const e = email.trim().toLowerCase();
  if (!e.endsWith("@nlccuk.com")) throw new Error("Only @nlccuk.com emails are allowed.");
  if (cache.emails.includes(e)) return;
  const next = { emails: [...cache.emails, e] };
  cache = next; notify(); writeLocal(next);
  if (isFirebaseConfigured && db) {
    try { await setDoc(doc(db, DOC_PATH.collection, DOC_PATH.id), cleanForFirestore(next)); } catch (e) { console.error("[adminStore] write failed:", e); }
  }
}

export async function removeAdminEmail(email: string): Promise<void> {
  const e = email.trim().toLowerCase();
  if (e === "bhola.paneru@nlccuk.com") throw new Error("Cannot remove the default admin.");
  const next = { emails: cache.emails.filter((a) => a !== e) };
  cache = next; notify(); writeLocal(next);
  if (isFirebaseConfigured && db) {
    try { await setDoc(doc(db, DOC_PATH.collection, DOC_PATH.id), cleanForFirestore(next)); } catch (e) { console.error("[adminStore] write failed:", e); }
  }
}
