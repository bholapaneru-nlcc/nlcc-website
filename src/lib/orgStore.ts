import {
  doc,
  getDoc,
  onSnapshot,
  setDoc,
} from "firebase/firestore";
import { db, isFirebaseConfigured } from "./firebase";
import { cleanForFirestore } from "./firestoreUtils";

/* ----------------------------- organisation store ------------------------- */
//
// Multi-organisation support. Each organisation has its own name, logo and
// contact details. Teachers and students are linked to an org, and only see
// their own org's data. Resources (lessons/quizzes) are GLOBAL — shared across
// all organisations.

export interface Organisation {
  id: string;
  name: string;
  logo?: string;
  contactName: string;
  contactMobile: string;
  contactEmail: string;
  address: string;
  status: "active" | "suspended";
  createdAt: string;
  subscriptionStart?: string;
  subscriptionEnd?: string;
}

export interface AccessRequest {
  id: string;
  orgName: string;
  contactName: string;
  contactMobile: string;
  contactEmail: string;
  address: string;
  message: string;
  createdAt: string;
}

export interface PortalSettings {
  renewalEmailSubject: string;
  renewalEmailBody: string;
  subscriptionExpiredMessage: string;
}

interface OrgData {
  organisations: Organisation[];
  requests: AccessRequest[];
  portalSettings?: PortalSettings;
}

const DEFAULT_SETTINGS: PortalSettings = {
  renewalEmailSubject: "Your NLCC Portal subscription has been renewed",
  renewalEmailBody: "Hello {contactName},\n\nYour organisation \"{orgName}\" subscription to the NLCC Portal has been renewed for one full year.\n\nNew subscription period: {start} to {end}\n\nThank you for your continued partnership.\n\n— Nepalese Language and Culture Centre",
  subscriptionExpiredMessage: "Your organisation's subscription has expired. Please contact your organisation administrator to renew.",
};

export function getSettings(): PortalSettings {
  return cache.portalSettings || DEFAULT_SETTINGS;
}

export async function saveSettings(settings: PortalSettings): Promise<void> {
  await persist({ ...cache, portalSettings: settings });
}

const EMPTY: OrgData = { organisations: [], requests: [] };
const DOC_PATH = { collection: "content", id: "organisations" };
const LS_KEY = "nlccOrgsV1";

let cache: OrgData = { ...EMPTY };
const listeners = new Set<() => void>();
let initialised = false;

function notify() {
  listeners.forEach((l) => l());
}

function normalise(d: Partial<OrgData> | null | undefined): OrgData {
  return {
    organisations: Array.isArray(d?.organisations) ? d!.organisations : [],
    requests: Array.isArray(d?.requests) ? d!.requests : [],
    portalSettings: d?.portalSettings || DEFAULT_SETTINGS,
  };
}

function readLocal(): OrgData {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) return normalise(JSON.parse(raw) as OrgData);
  } catch { /* ignore */ }
  return { ...EMPTY };
}

function writeLocal(d: OrgData) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(d)); } catch { /* ignore */ }
}

export function initOrgStore(onData?: (d: OrgData) => void): () => void {
  if (!initialised) {
    initialised = true;
    if (isFirebaseConfigured && db) {
      getDoc(doc(db, DOC_PATH.collection, DOC_PATH.id))
        .then((snap) => {
          if (snap.exists()) cache = normalise(snap.data() as unknown as OrgData);
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
      if (snap.exists()) { cache = normalise(snap.data() as unknown as OrgData); onData?.(cache); notify(); }
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

export function getOrgs(): OrgData {
  return cache;
}

export function getOrgById(id: string): Organisation | undefined {
  return cache.organisations.find((o) => o.id === id);
}

async function persist(next: OrgData): Promise<void> {
  cache = next;
  notify();
  writeLocal(next);
  if (isFirebaseConfigured && db) {
    try {
      await setDoc(doc(db, DOC_PATH.collection, DOC_PATH.id), cleanForFirestore(next) as unknown as Record<string, unknown>);
    } catch (e) {
      console.error("[orgStore] Firestore write failed:", e instanceof Error ? e.message : e);
    }
  }
}

const uid = (p: string) => `${p}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

/* --------------------------- access requests ------------------------------ */

export async function submitAccessRequest(req: Omit<AccessRequest, "id" | "createdAt">): Promise<void> {
  const request: AccessRequest = { ...req, id: uid("req"), createdAt: new Date().toISOString() };
  await persist({ ...cache, requests: [...cache.requests, request] });
}

export async function deleteAccessRequest(id: string): Promise<void> {
  await persist({ ...cache, requests: cache.requests.filter((r) => r.id !== id) });
}

/* ----------------------------- organisations ------------------------------ */

export async function createOrganisation(org: Omit<Organisation, "id" | "createdAt" | "status">): Promise<Organisation> {
  const o: Organisation = { ...org, id: uid("org"), status: "active", createdAt: new Date().toISOString() };
  await persist({ ...cache, organisations: [...cache.organisations, o] });
  return o;
}

/** Create an org directly from an approved access request. */
export async function createOrgFromRequest(requestId: string): Promise<Organisation | null> {
  const req = cache.requests.find((r) => r.id === requestId);
  if (!req) return null;
  const org = await createOrganisation({
    name: req.orgName,
    contactName: req.contactName,
    contactMobile: req.contactMobile,
    contactEmail: req.contactEmail,
    address: req.address,
  });
  await deleteAccessRequest(requestId);
  return org;
}

export async function updateOrganisation(id: string, patch: Partial<Organisation>): Promise<void> {
  await persist({
    ...cache,
    organisations: cache.organisations.map((o) => (o.id === id ? { ...o, ...patch } : o)),
  });
}

export async function deleteOrganisation(id: string): Promise<void> {
  await persist({ ...cache, organisations: cache.organisations.filter((o) => o.id !== id) });
}

/** Renew subscription for 1 full calendar year from today. */
export async function renewOrganisation(id: string): Promise<Organisation | null> {
  const now = new Date();
  const end = new Date(now);
  end.setFullYear(end.getFullYear() + 1);
  const org = cache.organisations.find((o) => o.id === id);
  if (!org) return null;
  const updated = { ...org, subscriptionStart: now.toISOString(), subscriptionEnd: end.toISOString() };
  await updateOrganisation(id, { subscriptionStart: updated.subscriptionStart, subscriptionEnd: updated.subscriptionEnd });
  return updated;
}

/** Build the renewal email body from the template. */
export function buildRenewalEmail(org: Organisation): { subject: string; body: string } {
  const s = getSettings();
  const start = new Date(org.subscriptionStart || new Date()).toLocaleDateString("en-GB");
  const end = new Date(org.subscriptionEnd || new Date()).toLocaleDateString("en-GB");
  const body = s.renewalEmailBody
    .replace(/\{contactName\}/g, org.contactName)
    .replace(/\{orgName\}/g, org.name)
    .replace(/\{start\}/g, start)
    .replace(/\{end\}/g, end);
  return { subject: s.renewalEmailSubject, body };
}

export function refreshOrgStore(): void {
  cache = readLocal();
  notify();
}
