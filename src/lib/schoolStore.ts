import {
  doc,
  getDoc,
  onSnapshot,
  setDoc,
} from "firebase/firestore";
import { db, isFirebaseConfigured } from "./firebase";
import { hashPassword } from "./teacherStore";
import { cleanForFirestore } from "./firestoreUtils";

/* ------------------------------ school store ------------------------------ */
//
// All school data lives in ONE Firestore document `content/school` (with a
// localStorage fallback when Firebase isn't configured). This keeps edits atomic
// and gives a single real-time stream for the whole school.
//
//   • classes        — admin creates; assigned to a teacher
//   • students       — admin creates; belong to a class; parents emailed
//   • resources      — teacher-created lessons/quizzes/papers, assigned to classes
//   • homework       — assignments attached to a resource, students submit work
//   • attendance     — per class + date, present/absent/authorised-absent
//   • progress       — per student: Poor / Improving / Good / Excellent

export type ResourceType = "lesson" | "quiz" | "question-paper";
export type AttendanceStatus = "present" | "absent" | "authorised-absent";
export type ProgressLevel = "poor" | "improving" | "good" | "excellent";

export interface SchoolClass {
  id: string;
  name: string;
  teacherId: string;
  orgId: string;
  createdAt: string;
  status?: "active" | "disabled";
}

export interface Student {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  classId: string;
  parentName: string;
  parentEmail: string;
  createdAt: string;
  orgId: string;
  status?: "active" | "disabled";
}

export interface Resource {
  id: string;
  teacherId: string;
  title: string;
  type: ResourceType;
  blocks: unknown[];
  classIds: string[];
  createdAt: string;
}

export interface Homework {
  id: string;
  resourceId: string;
  title: string;
  instructions: string;
  classIds: string[];
  studentIds: string[];
  dueDate: string;
  createdAt: string;
  category?: "homework" | "classwork";
}

export interface HomeworkSubmission {
  id: string; // homeworkId + studentId
  homeworkId: string;
  studentId: string;
  fileName: string;
  fileUrl: string; // Firebase Storage / data URL
  notes: string;
  submittedAt: string;
  status: "submitted" | "complete";
  feedback?: string;
}

export interface AttendanceEntry {
  studentId: string;
  studentName: string;
  status: AttendanceStatus;
}

export interface AttendanceRecord {
  id: string; // classId + date
  classId: string;
  className: string;
  date: string; // YYYY-MM-DD
  entries: AttendanceEntry[];
}

export interface ProgressRecord {
  studentId: string;
  level: ProgressLevel;
  note: string;
  updatedAt: string;
}

export interface SchoolData {
  classes: SchoolClass[];
  students: Student[];
  resources: Resource[];
  homework: Homework[];
  submissions: HomeworkSubmission[];
  attendance: AttendanceRecord[];
  progress: ProgressRecord[];
  progressLabels: ProgressLevel[];
}

const EMPTY: SchoolData = {
  classes: [],
  students: [],
  resources: [],
  homework: [],
  submissions: [],
  attendance: [],
  progress: [],
  progressLabels: ["poor", "improving", "good", "excellent"],
};

const DOC_PATH = { collection: "content", id: "school" };
const LS_KEY = "nlccSchoolV1";
const SESSION_KEY = "nlccStudentSessionV1";

let cache: SchoolData = { ...EMPTY };
const listeners = new Set<() => void>();
let initialised = false;

function notify() {
  listeners.forEach((l) => l());
}

function normalise(d: Partial<SchoolData> | null | undefined): SchoolData {
  return {
    classes: Array.isArray(d?.classes) ? d!.classes : [],
    students: Array.isArray(d?.students) ? d!.students : [],
    resources: Array.isArray(d?.resources) ? d!.resources : [],
    homework: Array.isArray(d?.homework) ? d!.homework : [],
    submissions: Array.isArray(d?.submissions) ? d!.submissions : [],
    attendance: Array.isArray(d?.attendance) ? d!.attendance : [],
    progress: Array.isArray(d?.progress) ? d!.progress : [],
    progressLabels: Array.isArray(d?.progressLabels) && d!.progressLabels.length ? d!.progressLabels : ["poor", "improving", "good", "excellent"],
  };
}

function readLocal(): SchoolData {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as SchoolData;
      return normalise(parsed);
    }
  } catch {
    /* ignore */
  }
  return { ...EMPTY };
}

function writeLocal(d: SchoolData) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(d));
  } catch {
    /* ignore */
  }
}

export function initSchoolStore(onData?: (d: SchoolData) => void): () => void {
  if (!initialised) {
    initialised = true;
    if (isFirebaseConfigured && db) {
      getDoc(doc(db, DOC_PATH.collection, DOC_PATH.id))
        .then((snap) => {
          if (snap.exists()) {
            cache = normalise(snap.data() as unknown as SchoolData);
          }
          onData?.(cache);
          notify();
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

  let unsub = () => {};
  if (isFirebaseConfigured && db) {
    unsub = onSnapshot(doc(db, DOC_PATH.collection, DOC_PATH.id), (snap) => {
      if (snap.exists()) {
        cache = normalise(snap.data() as unknown as SchoolData);
        onData?.(cache);
        notify();
      }
    });
  }
  const local = () => onData?.(cache);
  listeners.add(local);

  // Cross-tab sync in local mode: when ANOTHER tab writes to localStorage
  // (e.g. the teacher assigns homework), this tab's in-memory cache is stale.
  // The 'storage' event fires in other tabs on write, so reload + notify.
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
      listeners.delete(local);
      unsub();
      window.removeEventListener("storage", onStorage);
    };
  }

  return () => {
    listeners.delete(local);
    unsub();
  };
}

export function getSchool(): SchoolData {
  return cache;
}

/** Force-reload the cache from localStorage (used after login to ensure the
 *  latest data is shown, e.g. homework assigned in another tab). */
export function refreshSchool(): void {
  cache = readLocal();
  notify();
}

let lastPersistError = "";
export function getPersistError(): string { return lastPersistError; }

async function persist(next: SchoolData): Promise<void> {
  cache = next;
  notify();
  writeLocal(next);
  if (isFirebaseConfigured && db) {
    try {
      await setDoc(doc(db, DOC_PATH.collection, DOC_PATH.id), cleanForFirestore(next) as unknown as Record<string, unknown>);
      lastPersistError = "";
    } catch (e) {
      lastPersistError = e instanceof Error ? e.message : "Firestore write failed. Check your security rules.";
      console.error("[schoolStore] Firestore write failed:", lastPersistError);
    }
  }
}

const uid = (p: string) => `${p}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
const today = () => new Date().toISOString();

/* ------------------------------- classes ---------------------------------- */

export async function createClass(name: string, teacherId: string, orgId: string): Promise<void> {
  const c: SchoolClass = { id: uid("c"), name: name.trim(), teacherId, orgId, createdAt: today(), status: "active" };
  await persist({ ...cache, classes: [...cache.classes, c] });
}

export async function deleteClass(id: string): Promise<void> {
  await persist({
    ...cache,
    classes: cache.classes.filter((c) => c.id !== id),
    students: cache.students.map((s) => (s.classId === id ? { ...s, classId: "" } : s)),
    resources: cache.resources.map((r) => ({ ...r, classIds: r.classIds.filter((cid) => cid !== id) })),
    homework: cache.homework.map((h) => ({ ...h, classIds: h.classIds.filter((cid) => cid !== id) })),
  });
}

export async function setClassStatus(id: string, status: "active" | "disabled"): Promise<void> {
  const classes = cache.classes.map((c) => (c.id === id ? { ...c, status } : c));
  await persist({ ...cache, classes });
}

/** Master reset — wipes ALL homework, submissions, attendance, progress for ALL classes. */
export async function resetAllClasses(): Promise<void> {
  await persist({
    ...cache,
    homework: [],
    submissions: [],
    attendance: [],
    progress: [],
  });
}

/* ------------------------------- students --------------------------------- */

export async function createStudent(
  name: string, email: string, password: string, classId: string,
  parentName: string, parentEmail: string, orgId: string,
): Promise<Student> {
  const e = email.trim().toLowerCase();
  if (cache.students.some((s) => s.email.toLowerCase() === e)) {
    throw new Error("A student with that email already exists.");
  }
  const s: Student = {
    id: uid("s"), name: name.trim(), email: e,
    passwordHash: await hashPassword(password), classId,
    parentName: parentName.trim(), parentEmail: parentEmail.trim(),
    createdAt: today(), orgId,
  };
  await persist({ ...cache, students: [...cache.students, s] });
  return s;
}

export async function updateStudent(id: string, patch: Partial<Student>): Promise<void> {
  await persist({ ...cache, students: cache.students.map((s) => (s.id === id ? { ...s, ...patch } : s)) });
}

export async function deleteStudent(id: string): Promise<void> {
  await persist({
    ...cache,
    students: cache.students.filter((s) => s.id !== id),
    submissions: cache.submissions.filter((sub) => sub.studentId !== id),
    progress: cache.progress.filter((p) => p.studentId !== id),
  });
}

export async function resetStudentPassword(id: string, password: string): Promise<void> {
  const passwordHash = await hashPassword(password);
  const students = cache.students.map((s) => (s.id === id ? { ...s, passwordHash } : s));
  await persist({ ...cache, students });
}

export async function setStudentStatus(id: string, status: "active" | "disabled"): Promise<void> {
  const students = cache.students.map((s) => (s.id === id ? { ...s, status } : s));
  await persist({ ...cache, students });
}

export async function loginStudent(email: string, password: string): Promise<{ student: Student | null; error?: string }> {
  const e = email.trim().toLowerCase();
  const hash = await hashPassword(password);
  const s = cache.students.find((x) => x.email.toLowerCase() === e && x.passwordHash === hash);
  if (!s) return { student: null, error: "Incorrect email or password." };
  if (s.status === "disabled") return { student: null, error: "ACCOUNT_DISABLED" };
  try { sessionStorage.setItem(SESSION_KEY, s.id); } catch { /* ignore */ }
  return { student: s };
}

export function getStudentSession(): Student | null {
  try {
    const id = sessionStorage.getItem(SESSION_KEY);
    return cache.students.find((s) => s.id === id) || null;
  } catch {
    return null;
  }
}

export function logoutStudent(): void {
  try { sessionStorage.removeItem(SESSION_KEY); } catch { /* ignore */ }
}

/* ------------------------------ resources --------------------------------- */

export async function saveResource(r: Resource): Promise<void> {
  const exists = cache.resources.some((x) => x.id === r.id);
  const resources = exists ? cache.resources.map((x) => (x.id === r.id ? r : x)) : [...cache.resources, r];
  await persist({ ...cache, resources });
}

export async function deleteResource(id: string): Promise<void> {
  await persist({
    ...cache,
    resources: cache.resources.filter((r) => r.id !== id),
    homework: cache.homework.filter((h) => h.resourceId !== id),
  });
}

/* ------------------------------- homework --------------------------------- */

export async function saveHomework(h: Homework): Promise<void> {
  const exists = cache.homework.some((x) => x.id === h.id);
  const homework = exists ? cache.homework.map((x) => (x.id === h.id ? h : x)) : [...cache.homework, h];
  await persist({ ...cache, homework });
}

export async function deleteHomework(id: string): Promise<void> {
  await persist({
    ...cache,
    homework: cache.homework.filter((h) => h.id !== id),
    submissions: cache.submissions.filter((s) => s.homeworkId !== id),
  });
}

/* ----------------------------- submissions -------------------------------- */

export async function submitHomework(sub: HomeworkSubmission): Promise<void> {
  const exists = cache.submissions.some((x) => x.id === sub.id);
  const submissions = exists ? cache.submissions.map((x) => (x.id === sub.id ? sub : x)) : [...cache.submissions, sub];
  await persist({ ...cache, submissions });
}

/** Change a submission status (e.g. mark complete or unmark back to submitted). */
export async function setSubmissionStatus(subId: string, status: "submitted" | "complete"): Promise<void> {
  const submissions = cache.submissions.map((s) => (s.id === subId ? { ...s, status } : s));
  await persist({ ...cache, submissions });
}

/* ------------------------------ attendance -------------------------------- */

export async function saveAttendance(rec: AttendanceRecord): Promise<void> {
  const exists = cache.attendance.some((x) => x.id === rec.id);
  const attendance = exists ? cache.attendance.map((x) => (x.id === rec.id ? rec : x)) : [...cache.attendance, rec];
  await persist({ ...cache, attendance });
}

/* ------------------------------- progress --------------------------------- */

export async function setProgress(studentId: string, level: ProgressLevel, note: string): Promise<void> {
  const exists = cache.progress.some((p) => p.studentId === studentId);
  const rec: ProgressRecord = { studentId, level, note, updatedAt: today() };
  const progress = exists ? cache.progress.map((p) => (p.studentId === studentId ? rec : p)) : [...cache.progress, rec];
  await persist({ ...cache, progress });
}

export async function setProgressLabels(labels: ProgressLevel[]): Promise<void> {
  await persist({ ...cache, progressLabels: labels });
}

export const newResource = (teacherId: string): Resource => ({
  id: uid("r"), teacherId, title: "", type: "lesson", blocks: [], classIds: [], createdAt: today(),
});
export const newHomework = (resourceId: string): Homework => ({
  id: uid("h"), resourceId, title: "", instructions: "", classIds: [], studentIds: [], dueDate: "", createdAt: today(),
});

/* --------------------------- reset class data ----------------------------- */
//
// Clears ALL accumulated records for one class — used at end of school year:
//   • homework assigned to that class (or individually to its students)
//   • all student submissions for that class
//   • attendance records for that class
//   • progress for students in that class
// Students, the class itself, and resources are preserved.

export async function resetClassData(classId: string): Promise<void> {
  const studentIds = cache.students.filter((s) => s.classId === classId).map((s) => s.id);
  const sidSet = new Set(studentIds);

  await persist({
    ...cache,
    // Remove homework assigned to this class OR individually to its students
    homework: cache.homework.filter((h) =>
      !h.classIds.includes(classId) &&
      !(h.studentIds || []).some((sid) => sidSet.has(sid)),
    ),
    // Remove submissions from students in this class
    submissions: cache.submissions.filter((sub) => !sidSet.has(sub.studentId)),
    // Remove attendance records for this class
    attendance: cache.attendance.filter((a) => a.classId !== classId),
    // Remove progress for students in this class
    progress: cache.progress.filter((p) => !sidSet.has(p.studentId)),
  });
}
