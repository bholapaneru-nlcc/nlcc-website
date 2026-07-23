import {
  doc,
  getDoc,
  onSnapshot,
  setDoc,
} from "firebase/firestore";
import { db, isFirebaseConfigured } from "./firebase";

/* ----------------------------- teacher store ------------------------------ */
//
// Separate from the main site store. Teacher accounts + each teacher's content
// live in ONE Firestore document `content/teachers`, which the ADMIN manages
// (creating accounts) and teachers read/write (their own content). Falls back
// to localStorage when Firebase isn't configured so it still works locally.
//
// Note on auth: teacher logins are checked against a SHA-256 hash of the
// password stored in the doc (NOT plain text). For a small community org this
// is appropriate; a future upgrade can move teachers to Firebase Auth.

export type ContentType = "lesson-plan" | "question" | "quiz";

export interface TeacherBlock {
  type: string;
  text?: string;
  src?: string;
  caption?: string;
  link?: string;
  level?: string | number;
  fontSize?: string;
  align?: string;
  color?: string;
  background?: string;
  items?: string[];
  question?: string;
  options?: string[];
  correctIndex?: number;
  shape?: string;
  position?: "top" | "bottom" | "left" | "right" | "centre";
  shapeColor?: string;
  shapeWidth?: number;
  shapeHeight?: number;
  shapes?: Array<{
    kind?: string;
    fillColor?: string;
    outlineColor?: string;
    filled?: boolean;
    text?: string;
    textColor?: string;
    textBold?: boolean;
    textItalic?: boolean;
    textUnderline?: boolean;
    textSize?: number;
  }>;
  shapeGap?: number;
  imgWidth?: number;
  youtubeId?: string;
  youtubeWidth?: number;
  imageSide?: string;
  left?: string;
  right?: string;
  cols?: number;
  [key: string]: unknown;
}

export interface TeacherItem {
  id: string;
  type: ContentType;
  title: string;
  blocks: TeacherBlock[];
  createdAt: string;
  updatedAt: string;
}

export interface TeacherAccount {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  createdAt: string;
  orgId?: string; // linked organisation
  status?: "active" | "disabled";
}

export interface TeacherDoc {
  accounts: TeacherAccount[];
  content: Record<string, TeacherItem[]>; // teacherId -> items
}

const EMPTY: TeacherDoc = { accounts: [], content: {} };
const DOC_PATH = { collection: "content", id: "teachers" };
const LS_KEY = "nlccTeachersV1";
const SESSION_KEY = "nlccTeacherSessionV1";

/* -------------------------------- hashing --------------------------------- */

export async function hashPassword(pw: string): Promise<string> {
  try {
    const data = new TextEncoder().encode("nlcc-teacher::" + pw);
    const buf = await crypto.subtle.digest("SHA-256", data);
    return Array.from(new Uint8Array(buf))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  } catch {
    // Fallback (non-secure context): simple obfuscation.
    return "fx_" + btoa(unescape(encodeURIComponent(pw)));
  }
}

/* --------------------------- in-memory cache ------------------------------ */

let cache: TeacherDoc = { ...EMPTY };
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((l) => l());
}

/* ------------------------------ persistence ------------------------------- */

function readLocal(): TeacherDoc {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as TeacherDoc;
      if (parsed && Array.isArray(parsed.accounts)) return parsed;
    }
  } catch {
    /* ignore */
  }
  return { ...EMPTY };
}

function writeLocal(doc: TeacherDoc) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(doc));
  } catch {
    /* ignore */
  }
}

let initialised = false;

export function initTeacherStore(onData?: (d: TeacherDoc) => void): () => void {
  // Seed once from Firestore/localStorage into the cache.
  if (!initialised) {
    initialised = true;
    if (isFirebaseConfigured && db) {
      const ref = doc(db, DOC_PATH.collection, DOC_PATH.id);
      getDoc(ref)
        .then((snap) => {
          if (snap.exists()) {
            const d = snap.data() as unknown as TeacherDoc;
            cache = normalise(d);
            onData?.(cache);
            notify();
          } else {
            cache = { ...EMPTY };
            writeLocal(cache);
          }
        })
        .catch(() => {
          cache = readLocal();
          onData?.(cache);
          notify();
        });
    } else {
      cache = readLocal();
      onData?.(cache);
      notify();
    }
  }

  // Real-time Firestore subscription.
  let unsub = () => {};
  if (isFirebaseConfigured && db) {
    const ref = doc(db, DOC_PATH.collection, DOC_PATH.id);
    unsub = onSnapshot(ref, (snap) => {
      if (snap.exists()) {
        cache = normalise(snap.data() as unknown as TeacherDoc);
        onData?.(cache);
        notify();
      }
    });
  }

  // Local subscription.
  const localListener = () => onData?.(cache);
  listeners.add(localListener);

  // Cross-tab sync in local mode (see schoolStore for details).
  if (typeof window !== "undefined") {
    const onStorage = (e: StorageEvent) => {
      if (e.key === LS_KEY) {
        cache = readLocal();
        onData?.(cache);
        notify();
      }
    };
    window.addEventListener("storage", onStorage);
    return () => {
      listeners.delete(localListener);
      unsub();
      window.removeEventListener("storage", onStorage);
    };
  }

  return () => {
    listeners.delete(localListener);
    unsub();
  };
}

function normalise(d: Partial<TeacherDoc> | null | undefined): TeacherDoc {
  return {
    accounts: Array.isArray(d?.accounts) ? d!.accounts : [],
    content: d?.content && typeof d.content === "object" ? d.content : {},
  };
}

export function getTeacherDoc(): TeacherDoc {
  return cache;
}

async function persist(next: TeacherDoc): Promise<void> {
  cache = next;
  notify();
  writeLocal(next);
  if (isFirebaseConfigured && db) {
    await setDoc(doc(db, DOC_PATH.collection, DOC_PATH.id), next as unknown as Record<string, unknown>);
  }
}

/* ------------------------------ account mgmt ------------------------------ */

export async function createTeacher(name: string, email: string, password: string, orgId?: string): Promise<void> {
  const e = email.trim().toLowerCase();
  if (cache.accounts.some((a) => a.email.toLowerCase() === e)) {
    throw new Error("A teacher with that email already exists.");
  }
  const account: TeacherAccount = {
    id: `t-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    name: name.trim(),
    email: e,
    passwordHash: await hashPassword(password),
    createdAt: new Date().toISOString(),
    orgId: orgId || "",
    status: "active",
  };
  const next: TeacherDoc = {
    ...cache,
    accounts: [...cache.accounts, account],
    content: { ...cache.content, [account.id]: [] },
  };
  await persist(next);
}

export async function deleteTeacher(id: string): Promise<void> {
  const accounts = cache.accounts.filter((a) => a.id !== id);
  const content = { ...cache.content };
  delete content[id];
  await persist({ accounts, content });
}

export async function resetTeacherPassword(id: string, newPassword: string): Promise<void> {
  const passwordHash = await hashPassword(newPassword);
  const accounts = cache.accounts.map((a) => (a.id === id ? { ...a, passwordHash } : a));
  await persist({ ...cache, accounts });
}

export async function setTeacherStatus(id: string, status: "active" | "disabled"): Promise<void> {
  const accounts = cache.accounts.map((a) => (a.id === id ? { ...a, status } : a));
  await persist({ ...cache, accounts });
}

export async function loginTeacher(email: string, password: string): Promise<{ account: TeacherAccount; error?: string }> {
  const e = email.trim().toLowerCase();
  const hash = await hashPassword(password);
  const account = cache.accounts.find(
    (a) => a.email.toLowerCase() === e && a.passwordHash === hash,
  );
  if (!account) return { account: null as never, error: "Incorrect email or password." };
  if (account.status === "disabled") return { account: null as never, error: "ACCOUNT_DISABLED" };
  try {
    sessionStorage.setItem(SESSION_KEY, account.id);
  } catch {
    /* ignore */
  }
  return { account };
}

export function getTeacherSession(): TeacherAccount | null {
  try {
    const id = sessionStorage.getItem(SESSION_KEY);
    if (!id) return null;
    return cache.accounts.find((a) => a.id === id) || null;
  } catch {
    return null;
  }
}

export function logoutTeacher(): void {
  try {
    sessionStorage.removeItem(SESSION_KEY);
  } catch {
    /* ignore */
  }
}

/* --------------------------- teacher content ------------------------------ */

export function getTeacherItems(teacherId: string): TeacherItem[] {
  return cache.content[teacherId] || [];
}

export async function saveTeacherItem(teacherId: string, item: TeacherItem): Promise<void> {
  const items = getTeacherItems(teacherId);
  const exists = items.some((it) => it.id === item.id);
  const nextItems = exists
    ? items.map((it) => (it.id === item.id ? item : it))
    : [...items, item];
  await persist({
    ...cache,
    content: { ...cache.content, [teacherId]: nextItems },
  });
}

export async function deleteTeacherItem(teacherId: string, itemId: string): Promise<void> {
  const items = getTeacherItems(teacherId).filter((it) => it.id !== itemId);
  await persist({ ...cache, content: { ...cache.content, [teacherId]: items } });
}
