import { useEffect, useState } from "react";
import {
  getSchool,
  getStudentSession,
  initSchoolStore,
  loginStudent,
  logoutStudent,
  refreshSchool,
  submitHomework,
} from "../lib/schoolStore";
import type { Student } from "../lib/schoolStore";
import { TeacherRenderer } from "../components/teacher/TeacherRenderer";
import { exportPDF, exportWord } from "../lib/teacherExport";
import { uploadFile } from "../lib/upload";
import { getOrgById, initOrgStore } from "../lib/orgStore";

const ACCESS_DENIED = "We're having trouble signing you in to your account. If this problem persists, please contact your administrator for assistance.";

const inputCls =
  "w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/30";


function Login({ onDone, initialError }: { onDone: (s: Student) => void; initialError?: string }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(initialError || "");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setError("");
    const result = await loginStudent(email, password);
    setBusy(false);
    if (result.student) {
      // Check class disabled
      const cls = getSchool().classes.find((c) => c.id === result.student!.classId);
      if (cls && cls.status === "disabled") { setError(ACCESS_DENIED); return; }
      // Check org disabled/expired
      if (result.student.orgId) {
        const org = getOrgById(result.student.orgId);
        if (org && (org.status === "suspended" || (org.subscriptionEnd && new Date(org.subscriptionEnd) < new Date()))) {
          setError(ACCESS_DENIED);
          return;
        }
      }
      onDone(result.student);
    } else {
      setError(result.error === "Incorrect email or password." ? result.error : ACCESS_DENIED);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 via-brand-700 to-brand p-6">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <span className="text-4xl">🎓</span>
          <h1 className="mt-3 text-2xl font-black text-white">Student Portal</h1>
        </div>
        <form onSubmit={submit} className="space-y-4 rounded-2xl bg-white p-6 shadow-2xl">
          <label className="block"><span className="text-sm font-bold text-slate-700">Email</span><input className={inputCls} type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="off" /></label>
          <label className="block"><span className="text-sm font-bold text-slate-700">Password</span><input className={inputCls} type="password" required value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="off" /></label>
          {error ? <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm font-bold text-rose-700">{error}</p> : null}
          <button type="submit" disabled={busy} className="w-full rounded-lg bg-brand px-4 py-2.5 text-sm font-black text-white hover:bg-brand-700 disabled:opacity-60">{busy ? "Signing in…" : "Login"}</button>
        </form>
        <p className="mt-4 text-center"><a href="/" className="text-sm font-bold text-white/80 hover:underline">← Back to website</a></p>
      </div>
    </div>
  );
}

function StudentApp({ student, onLogout }: { student: Student; onLogout: () => void }) {
  const [tab, setTab] = useState<"work" | "homework">("work");
  const [, setTick] = useState(0);
  // Refresh from storage on mount (picks up homework assigned in another tab),
  // then subscribe to live updates.
  useEffect(() => {
    refreshSchool();
    initOrgStore(() => setTick((t) => t + 1));
    setTick((t) => t + 1);
    return initSchoolStore(() => setTick((t) => t + 1));
  }, []);
  const school = getSchool();
  const org = student.orgId ? getOrgById(student.orgId) : undefined;

  const cls = school.classes.find((c) => c.id === student.classId);
  const className = cls?.name || "Unassigned";
  const allAssignments = school.homework.filter((h) => h.classIds.includes(student.classId) || (h.studentIds || []).includes(student.id));
  const myClasswork = allAssignments.filter((h) => (h.category || "homework") === "classwork");
  const myHomework = allAssignments.filter((h) => (h.category || "homework") === "homework");
  // Attendance and Progress removed from student portal per request

  const navBtn = (id: typeof tab, label: string, icon: string) => (
    <button onClick={() => setTab(id)} className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-bold transition ${tab === id ? "bg-brand text-white" : "text-slate-600 hover:bg-slate-100"}`}>
      <span>{icon}</span> {label}
    </button>
  );

  return (
    <div className="min-h-screen bg-slate-100">
      {org ? (
        <div className="flex items-center justify-center gap-3 bg-brand px-4 py-2 text-white">
          {org.logo ? <img src={org.logo} alt="" className="h-7 w-7 rounded object-cover" /> : <span className="text-lg">🏢</span>}
          <span className="text-sm font-black tracking-wide">{org.name}</span>
        </div>
      ) : null}
      <header className="sticky top-0 z-40 border-b border-white/10 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 shadow-lg">
        <div className="mx-auto flex w-full max-w-[1100px] items-center gap-3 px-4 py-3">
          <span className="text-2xl">🎓</span>
          <div className="leading-tight"><span className="block text-sm font-black text-white">Student Portal</span><span className="block text-[0.7rem] text-white/60">{student.name} · {className}</span></div>
          <div className="ml-auto"><button onClick={onLogout} className="rounded-lg bg-brand px-3 py-1.5 text-xs font-bold text-white hover:bg-brand-700">Logout</button></div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-[1100px] p-4 sm:p-7">
        <nav className="mb-6 flex flex-wrap gap-2">{navBtn("work", "Classwork", "📚")}{navBtn("homework", "Homework", "📝")}</nav>

        {tab === "work" && (
          <div className="space-y-4">
            <h1 className="text-2xl font-extrabold text-slate-900">Classwork</h1>
            {myClasswork.length === 0 ? <p className="card-panel text-slate-500">No classwork assigned to your class yet.</p> : null}
            {myClasswork.map((c) => {
              const r = school.resources.find((res) => res.id === c.resourceId);
              return (
              <div key={c.id} className="card-panel">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <div><span className="rounded-full bg-brand-50 px-2.5 py-0.5 text-[0.65rem] font-black uppercase text-brand">Classwork</span><h2 className="mt-1 text-lg font-extrabold text-slate-900">{c.title}</h2>{c.dueDate ? <span className="text-xs text-slate-400">Due: {c.dueDate}</span> : null}</div>
                  {r ? <div className="flex gap-2">
                    <button onClick={() => exportWord({ id: r.id, title: r.title, type: r.type as never, blocks: r.blocks as never, createdAt: r.createdAt, updatedAt: r.createdAt } as never)} className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-black text-slate-700 hover:bg-slate-50">📄 Word</button>
                    <button onClick={() => exportPDF({ id: r.id, title: r.title, type: r.type as never, blocks: r.blocks as never, createdAt: r.createdAt, updatedAt: r.createdAt } as never)} className="rounded-lg bg-brand px-3 py-1.5 text-xs font-black text-white hover:bg-brand-700">⬇ PDF</button>
                  </div> : null}
                </div>
                {c.instructions ? <p className="mb-2 text-sm text-slate-600">{c.instructions}</p> : null}
                {r ? <TeacherRenderer blocks={r.blocks as never} /> : null}
              </div>
              );
            })}
          </div>
        )}

        {tab === "homework" && (
          <div className="space-y-4">
            <h1 className="text-2xl font-extrabold text-slate-900">Homework</h1>
            {myHomework.length === 0 ? (
              <p className="card-panel text-slate-500">
                {!student.classId
                  ? "You are not assigned to a class yet. Please ask your teacher to assign you to a class."
                  : `No homework has been assigned to your class (${className}) yet.`}
              </p>
            ) : null}
            {myHomework.map((h) => <HomeworkCard key={h.id} homeworkId={h.id} title={h.title} instructions={h.instructions} dueDate={h.dueDate} resourceId={h.resourceId} studentId={student.id} />)}
          </div>
        )}

      </main>
    </div>
  );
}

function HomeworkCard({ homeworkId, title, instructions, dueDate, resourceId, studentId }: { homeworkId: string; title: string; instructions: string; dueDate: string; resourceId: string; studentId: string }) {
  const [, setTick] = useState(0);
  const refresh = () => setTick((t) => t + 1);
  const school = getSchool();
  const sub = school.submissions.find((s) => s.id === `${homeworkId}-${studentId}`);
  const resource = school.resources.find((r) => r.id === resourceId);
  const [showResource, setShowResource] = useState(false);
  const [notes, setNotes] = useState(sub?.notes || "");
  const [fileName, setFileName] = useState(sub?.fileName || "");
  const [fileUrl, setFileUrl] = useState(sub?.fileUrl || "");
  const [busy, setBusy] = useState(false);

  const upload = async (file?: File) => {
    if (!file) return;
    setBusy(true);
    try {
      const res = await uploadFile(file);
      setFileUrl(res.url);
      setFileName(file.name);
    } catch { /* ignore */ }
    setBusy(false);
  };

  // Submit — attachment is OPTIONAL (some homework is just reading).
  const submit = async () => {
    await submitHomework({
      id: `${homeworkId}-${studentId}`, homeworkId, studentId,
      fileName, fileUrl, notes,
      submittedAt: new Date().toISOString(), status: "submitted",
    });
    refresh();
  };

  // Mark as done — no attachment needed at all.
  const markDone = async () => {
    await submitHomework({
      id: `${homeworkId}-${studentId}`, homeworkId, studentId,
      fileName: "", fileUrl: "", notes: notes || "Marked as done",
      submittedAt: new Date().toISOString(), status: "submitted",
    });
    refresh();
  };

  const done = sub?.status === "complete" || sub?.status === "submitted";

  return (
    <div className="card-panel">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h2 className="text-lg font-extrabold text-slate-900">{title}</h2>
        {sub ? <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${sub.status === "complete" ? "bg-emerald-100 text-emerald-700" : "bg-sky-100 text-sky-700"}`}>{sub.status === "complete" ? "✓ Complete" : "✓ Done"}</span> : null}
      </div>
      {dueDate ? <p className="text-xs font-bold text-slate-400">Due: {dueDate}</p> : null}
      {instructions ? <p className="mt-2 text-sm text-slate-600">{instructions}</p> : null}

      {/* View the linked resource (story / lesson / quiz) */}
      {resource ? (
        <div className="mt-3">
          <button onClick={() => setShowResource((s) => !s)} className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-xs font-black text-white hover:bg-slate-700">
            {showResource ? "▼ Hide" : "▶ Open"} {resource.title || "resource"}
          </button>
          {showResource ? (
            <div className="mt-3 rounded-lg border border-slate-200 bg-white p-4">
              <div className="mb-3 flex gap-2">
                <button onClick={() => exportWord({ id: resource.id, title: resource.title, type: resource.type as never, blocks: resource.blocks as never, createdAt: resource.createdAt, updatedAt: resource.createdAt } as never)} className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-black text-slate-700 hover:bg-slate-50">📄 Word</button>
                <button onClick={() => exportPDF({ id: resource.id, title: resource.title, type: resource.type as never, blocks: resource.blocks as never, createdAt: resource.createdAt, updatedAt: resource.createdAt } as never)} className="rounded-lg bg-brand px-3 py-1.5 text-xs font-black text-white hover:bg-brand-700">⬇ PDF</button>
              </div>
              <TeacherRenderer blocks={resource.blocks as never} />
            </div>
          ) : null}
        </div>
      ) : null}

      {sub?.feedback ? <p className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">Teacher feedback: {sub.feedback}</p> : null}

      {/* Submission area — attachment is OPTIONAL */}
      {!done ? (
        <div className="mt-3 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50">
              📎 {fileName || "Attach work (optional)"}
              <input type="file" className="hidden" disabled={busy} onChange={(e) => upload(e.target.files?.[0])} />
            </label>
            {busy ? <span className="text-xs text-slate-400">Uploading…</span> : null}
          </div>
          <textarea className={`${inputCls} min-h-[50px]`} placeholder="Notes for your teacher (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} />
          <div className="flex flex-wrap gap-2">
            <button onClick={submit} className="rounded-lg bg-brand px-4 py-2 text-xs font-black text-white hover:bg-brand-700">Submit work</button>
            <button onClick={markDone} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-black text-slate-700 hover:bg-slate-50">Mark as done</button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default function Students() {
  const [student, setStudent] = useState<Student | null>(null);
  const [ready, setReady] = useState(false);
  const [, setTick] = useState(0);

  useEffect(() => {
    const unsub = initSchoolStore(() => { setReady(true); setTick((t) => t + 1); });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (ready && !student) {
      const s = getStudentSession();
      if (s) setStudent(s);
    }
  }, [ready, student]);

  if (!ready) return <div className="flex min-h-screen items-center justify-center bg-slate-900"><span className="text-sm font-bold text-white/70">Loading…</span></div>;

  // Guard: check account + class + org status on every render.
  // One standard message for ALL blocked cases.
  if (student) {
    let blocked = false;
    if (student.status === "disabled") blocked = true;
    if (!blocked) {
      const cls = getSchool().classes.find((c) => c.id === student.classId);
      if (cls && cls.status === "disabled") blocked = true;
    }
    if (!blocked && student.orgId) {
      const org = getOrgById(student.orgId);
      if (org && (org.status === "suspended" || (org.subscriptionEnd && new Date(org.subscriptionEnd) < new Date()))) blocked = true;
    }
    if (blocked) {
      logoutStudent();
      setStudent(null);
      return <Login onDone={setStudent} initialError={ACCESS_DENIED} />;
    }
  }

  if (!student) return <Login onDone={setStudent} />;
  return <StudentApp student={student} onLogout={() => { logoutStudent(); setStudent(null); }} />;
}
