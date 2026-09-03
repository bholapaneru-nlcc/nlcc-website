import { useEffect, useRef, useState } from "react";
import {
  deleteTeacherItem,
  getTeacherDoc,
  getTeacherItems,
  initTeacherStore,
  saveTeacherItem,
} from "../lib/teacherStore";
import type { TeacherAccount, TeacherItem } from "../lib/teacherStore";
import {
  deleteHomework,
  getSchool,
  initSchoolStore,
  saveAttendance,
  saveHomework,
  saveResource,
  setProgress,
  setSubmissionStatus,
} from "../lib/schoolStore";
import type { AttendanceStatus, ProgressLevel, Resource } from "../lib/schoolStore";
import { TeacherBuilder } from "../components/teacher/TeacherBuilder";
import { TeacherRenderer } from "../components/teacher/TeacherRenderer";
import { exportPDF, exportWord } from "../lib/teacherExport";
import { getOrgById, initOrgStore } from "../lib/orgStore";
import { isImageFile } from "../lib/upload";
import { useGoogleAuth } from "../lib/googleAuth";
import { PortalLogin } from "../components/GoogleLogin";

const inputCls =
  "w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/30";

const TYPE_LABEL: Record<string, string> = {
  "lesson-plan": "Lesson Plan",
  lesson: "Lesson",
  question: "Question",
  quiz: "Quiz",
  "question-paper": "Question Paper",
};

const PROGRESS_LEVELS: ProgressLevel[] = ["poor", "improving", "good", "excellent"];

/* --------------------------------- login ---------------------------------- */

function Login() {
  return <PortalLogin portalName="Teacher Portal" portalIcon="🍎" role="teacher" gradient="from-slate-900 via-brand-700 to-brand" onSuccess={() => {}} />;
}

/* ------------------------------- my content ------------------------------- */

function MyContent({ teacher }: { teacher: TeacherAccount }) {
  const [, setTick] = useState(0);
  const refresh = () => setTick((t) => t + 1);
  const items = getTeacherItems(teacher.id);
  const [editing, setEditing] = useState<TeacherItem | null>(null);
  const [viewing, setViewing] = useState<TeacherItem | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const persist = (item: TeacherItem) => {
    void saveTeacherItem(teacher.id, item);
    void saveResource({
      id: item.id, teacherId: teacher.id, title: item.title || "Untitled",
      type: "lesson", blocks: item.blocks, classIds: [], createdAt: item.createdAt || new Date().toISOString(),
    });
    setEditing(null); refresh();
  };
  const remove = (id: string) => { if (confirm("Delete?")) { void deleteTeacherItem(teacher.id, id); refresh(); } };

  if (editing) return <TeacherBuilder item={editing} onSave={persist} onCancel={() => setEditing(null)} />;
  if (viewing) return (
    <div className="space-y-4">
      <div className="flex justify-between gap-2">
        <button onClick={() => setViewing(null)} className="text-sm font-black text-brand hover:underline">← Back</button>
        <div className="flex gap-2">
          <button onClick={() => exportWord(viewing)} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-black text-slate-700 hover:bg-slate-50">📄 Word</button>
          <button onClick={() => exportPDF(viewing)} className="rounded-lg bg-brand px-4 py-2 text-xs font-black text-white hover:bg-brand-700">⬇ PDF</button>
        </div>
      </div>
      <div className="card-panel"><div className="mb-4"><span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-black uppercase text-brand">{TYPE_LABEL[viewing.type]}</span><h1 className="mt-2 text-2xl font-extrabold text-slate-900">{viewing.title}</h1></div><TeacherRenderer blocks={viewing.blocks} /></div>
    </div>
  );

  // Group items by Year → Month (latest first)
  const sorted = [...items].sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
  const byYear: Record<string, Record<string, TeacherItem[]>> = {};
  sorted.forEach((it) => {
    const d = new Date(it.createdAt || it.updatedAt || new Date().toISOString());
    const y = String(d.getFullYear());
    const m = String(d.getMonth() + 1).padStart(2, "0");
    if (!byYear[y]) byYear[y] = {};
    if (!byYear[y][m]) byYear[y][m] = [];
    byYear[y][m].push(it);
  });
  const years = Object.keys(byYear).sort().reverse();
  const monthLabel = (m: string) => new Date(2020, Number(m) - 1).toLocaleDateString("en-GB", { month: "long" });
  const toggle = (key: string) => setExpanded((prev) => { const n = new Set(prev); if (n.has(key)) n.delete(key); else n.add(key); return n; });

  const blank: TeacherItem = { id: "", type: "lesson-plan", title: "", blocks: [], createdAt: "", updatedAt: "" };
  return (
    <div>
      <div className="mb-5 flex items-center justify-between gap-4">
        <div><span className="text-xs font-black uppercase tracking-widest text-brand-600">My Content</span><h1 className="text-2xl font-extrabold text-slate-900">Saved content</h1></div>
        <button onClick={() => setEditing({ ...blank })} className="rounded-lg bg-brand px-4 py-2 text-sm font-black text-white hover:bg-brand-700">+ New content</button>
      </div>
      {items.length === 0 && <p className="card-panel text-slate-500">Nothing yet — click <strong>+ New content</strong>.</p>}
      {/* Year/Month expandable grouping */}
      {years.map((y) => (
        <div key={y} className="mb-4">
          <button onClick={() => toggle(`y-${y}`)} className="flex w-full items-center gap-2 rounded-xl bg-slate-800 px-4 py-3 text-sm font-black text-white shadow-sm hover:bg-slate-700">
            <span>{expanded.has(`y-${y}`) ? "▼" : "▶"}</span> {y}
            <span className="ml-auto rounded-full bg-white/20 px-2 py-0.5 text-xs">{Object.values(byYear[y]).reduce((n, arr) => n + arr.length, 0)}</span>
          </button>
          {expanded.has(`y-${y}`) ? (
            <div className="mt-2 ml-2 space-y-2">
              {Object.keys(byYear[y]).sort().reverse().map((m) => (
                <div key={m}>
                  <button onClick={() => toggle(`ym-${y}-${m}`)} className="flex w-full items-center gap-2 rounded-lg bg-slate-100 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-200">
                    <span>{expanded.has(`ym-${y}-${m}`) ? "▼" : "▶"}</span> {monthLabel(m)}
                    <span className="ml-auto rounded-full bg-slate-300 px-2 py-0.5 text-[0.65rem]">{byYear[y][m].length}</span>
                  </button>
                  {expanded.has(`ym-${y}-${m}`) ? (
                    <div className="mt-2 space-y-2">
                      {byYear[y][m].map((it) => (
                        <div key={it.id} className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                          <div className="min-w-0"><span className="rounded-full bg-slate-100 px-2 py-0.5 text-[0.65rem] font-black uppercase text-slate-500">{TYPE_LABEL[it.type]}</span><strong className="mt-1 block truncate text-slate-900">{it.title || "(untitled)"}</strong><span className="text-sm text-slate-500">{it.blocks.length} blocks</span></div>
                          <div className="flex shrink-0 gap-2">
                            <button onClick={() => setViewing(it)} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">View</button>
                            <button onClick={() => setEditing(it)} className="rounded-full bg-sky-100 px-3 py-1 text-xs font-bold text-sky-800">Edit</button>
                            <button onClick={() => remove(it.id)} className="rounded-full bg-rose-100 px-3 py-1 text-xs font-bold text-rose-700">Delete</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}

/* ------------------------------- resources -------------------------------- */
// Teacher creates lessons/quizzes/papers (reusing the full block builder) and
// assigns them to classes. Assigned resources appear in the student portal.

function ResourcesManager({ teacher }: { teacher: TeacherAccount }) {
  const [, setTick] = useState(0);
  const refresh = () => setTick((t) => t + 1);
  const school = getSchool();
  const myClasses = school.classes.filter((c) => c.orgId === teacher.orgId && c.teacherId === teacher.id);
  const allResources = school.resources;
  const [editing, setEditing] = useState<Resource | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => initSchoolStore(refresh), []);

  if (editing) return <ResourceEditor resource={editing} classes={myClasses} onSave={async (r) => { await saveResource(r); setEditing(null); refresh(); }} onCancel={() => setEditing(null)} />;

  // Dynamic search filter
  const filtered = search.trim()
    ? allResources.filter((r) => (r.title || "").toLowerCase().includes(search.toLowerCase().trim()))
    : allResources;

  return (
    <div>
      <div className="mb-5">
        <span className="text-xs font-black uppercase tracking-widest text-brand-600">Resources</span>
        <h1 className="text-2xl font-extrabold text-slate-900">Class resources</h1>
        <p className="mt-1 text-sm text-slate-500">Resources are created in My Content and appear here automatically.</p>
      </div>

      {/* Search bar */}
      {allResources.length > 0 ? (
        <input className={`${inputCls} mb-4`} placeholder="🔍 Search resources…" value={search} onChange={(e) => setSearch(e.target.value)} />
      ) : null}

      <div className="space-y-3">
        {filtered.length === 0 && <p className="card-panel text-slate-500">{search.trim() ? "No resources match your search." : "No resources yet. Create content in My Content to see it here."}</p>}
        {filtered.map((r) => {
          const classNames = r.classIds.map((id) => school.classes.find((c) => c.id === id)?.name).filter(Boolean);
          const isMine = r.teacherId === teacher.id;
          return (
            <div key={r.id} className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="min-w-0"><span className="rounded-full bg-brand-50 px-2 py-0.5 text-[0.65rem] font-black uppercase text-brand">{r.type}</span><strong className="mt-1 block truncate text-slate-900">{r.title || "(untitled)"}</strong><span className="text-sm text-slate-500">{classNames.length ? `Assigned to: ${classNames.join(", ")}` : "Not assigned"}{!isMine ? " · shared" : ""}</span></div>
              <div className="flex shrink-0 gap-2">
                {isMine ? <button onClick={() => setEditing({ ...r })} className="rounded-full bg-sky-100 px-3 py-1 text-xs font-bold text-sky-800">Edit</button> : null}
                {/* Resources are global — only admin can delete. Teachers cannot. */}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ResourceEditor({ resource, classes, onSave, onCancel }: { resource: Resource; classes: { id: string; name: string }[]; onSave: (r: Resource) => void; onCancel: () => void }) {
  const [draft, setDraft] = useState<Resource>({ ...resource, blocks: Array.isArray(resource.blocks) ? resource.blocks : [] });
  const [blocks, setBlocks] = useState(resource.blocks as Parameters<typeof TeacherBuilder>[0]["item"]["blocks"]);
  // Bridge: the TeacherBuilder works on a TeacherItem; we reuse its block editor.
  const proxy = { id: draft.id, title: draft.title, type: "lesson-plan", blocks, createdAt: draft.createdAt, updatedAt: draft.createdAt } as TeacherItem;

  const toggleClass = (id: string) => setDraft((d) => ({ ...d, classIds: d.classIds.includes(id) ? d.classIds.filter((x) => x !== id) : [...d.classIds, id] }));

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-extrabold text-slate-900">{resource.id ? "Edit resource" : "New resource"}</h1>
        <div className="flex gap-2">
          <button onClick={onCancel} className="rounded-lg bg-slate-200 px-4 py-2 text-sm font-black text-slate-700 hover:bg-slate-300">Cancel</button>
          <button onClick={() => onSave({ ...draft, blocks })} className="rounded-lg bg-brand px-5 py-2 text-sm font-black text-white hover:bg-brand-700">Save</button>
        </div>
      </div>
      <section className="card-panel grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2"><label className="text-sm font-bold text-slate-700">Title</label><input className={inputCls} value={draft.title} onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))} /></div>
        <label className="text-sm font-bold text-slate-700">Type<select className={inputCls} value={draft.type} onChange={(e) => setDraft((d) => ({ ...d, type: e.target.value as Resource["type"] }))}><option value="lesson">Lesson</option><option value="quiz">Quiz</option><option value="question-paper">Question Paper</option></select></label>
        <div>
          <span className="text-sm font-bold text-slate-700">Assign to classes</span>
          <div className="mt-2 flex flex-wrap gap-2">
            {classes.length === 0 ? <span className="text-xs text-slate-400">No classes assigned to you.</span> : classes.map((c) => (
              <button key={c.id} type="button" onClick={() => toggleClass(c.id)} className={`rounded-full px-3 py-1.5 text-xs font-bold transition ${draft.classIds.includes(c.id) ? "bg-brand text-white" : "bg-slate-100 text-slate-600"}`}>{c.name}</button>
            ))}
          </div>
        </div>
      </section>
      <TeacherBuilder item={proxy} onSave={(it) => { setBlocks(it.blocks); }} onCancel={() => {}} />
    </div>
  );
}

/* ----------------------------- resource search ---------------------------- */
// A searchable resource picker that filters as you type — better than a dropdown
// when there are hundreds/thousands of resources.

function ResourceSearch({ resources, value, onChange }: { resources: { id: string; title: string }[]; value: string; onChange: (id: string) => void }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const selected = resources.find((r) => r.id === value);
  const filtered = query.trim()
    ? resources.filter((r) => r.title.toLowerCase().includes(query.toLowerCase().trim())).slice(0, 20)
    : resources.slice(0, 20);
  return (
    <div className="relative">
      <div className="flex items-center gap-2">
        <input className={inputCls} placeholder={selected ? selected.title : "🔍 Search resources…"} value={query} onChange={(e) => { setQuery(e.target.value); setOpen(true); }} onFocus={() => setOpen(true)} onBlur={() => setTimeout(() => setOpen(false), 200)} />
        {selected ? <button type="button" onClick={() => { onChange(""); setQuery(""); }} className="shrink-0 rounded-lg bg-slate-200 px-2 py-2 text-xs font-bold text-slate-600">Clear</button> : null}
      </div>
      {open ? (
        <div className="absolute z-30 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-slate-300 bg-white shadow-lg">
          {filtered.length === 0 ? <p className="px-3 py-2 text-sm text-slate-400">No resources found.</p> : null}
          {filtered.map((r) => (
            <button key={r.id} type="button" onMouseDown={() => { onChange(r.id); setQuery(""); setOpen(false); }} className={`block w-full px-3 py-2 text-left text-sm hover:bg-brand-50 ${r.id === value ? "bg-brand-50 font-bold text-brand" : "text-slate-700"}`}>{r.title || "(untitled)"}</button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

/* -------------------------------- homework -------------------------------- */
// Teachers create homework assignments with a due date (calendar picker) and
// assign them to their classes. Students see and submit them in their portal.

function HomeworkManager({ teacher, category = "homework" }: { teacher: TeacherAccount; category?: "homework" | "classwork" }) {
  const cat = category;
  const label = cat === "classwork" ? "Classwork" : "Homework";
  const [, setTick] = useState(0);
  const refresh = () => setTick((t) => t + 1);
  const school = getSchool();
  const myClasses = school.classes.filter((c) => c.orgId === teacher.orgId && c.teacherId === teacher.id);
  const allResources = school.resources;
  const myHomework = school.homework.filter((h) =>
    myClasses.some((c) => h.classIds.includes(c.id)) && (h.category || "homework") === cat,
  );
  const [editing, setEditing] = useState<{ id: string; resourceId: string; title: string; instructions: string; classIds: string[]; dueDate: string } | null>(null);

  useEffect(() => initSchoolStore(refresh), []);

  const blank = () => ({ id: "", resourceId: allResources[0]?.id || "", title: "", instructions: "", classIds: [], dueDate: new Date().toISOString().slice(0, 10) });

  const save = async () => {
    if (!editing) return;
    if (!editing.title.trim()) { alert("Please enter a title."); return; }
    await saveHomework({ id: editing.id || `${cat}-${Date.now().toString(36)}`, resourceId: editing.resourceId, title: editing.title, instructions: editing.instructions, classIds: editing.classIds, studentIds: [], dueDate: editing.dueDate, createdAt: new Date().toISOString(), category: cat });
    setEditing(null);
    refresh();
  };

  const toggleClass = (id: string) => {
    if (!editing) return;
    setEditing({ ...editing, classIds: editing.classIds.includes(id) ? editing.classIds.filter((x) => x !== id) : [...editing.classIds, id] });
  };

  const className = (id: string) => school.classes.find((c) => c.id === id)?.name || "—";
  const resourceName = (id: string) => school.resources.find((r) => r.id === id)?.title || "—";

  return (
    <div>
      <div className="mb-5 flex items-center justify-between gap-4">
        <div><span className="text-xs font-black uppercase tracking-widest text-brand-600">{label}</span><h1 className="text-2xl font-extrabold text-slate-900">{label} assignments</h1></div>
        <button onClick={() => setEditing(blank())} disabled={allResources.length === 0} className="rounded-lg bg-brand px-4 py-2 text-sm font-black text-white hover:bg-brand-700 disabled:opacity-50" title={allResources.length === 0 ? "Create a resource first" : ""}>+ New {label.toLowerCase()}</button>
      </div>

      {editing ? (
        <div className="card-panel space-y-4">
          <div><label className="text-sm font-bold text-slate-700">Title</label><input className={inputCls} value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} placeholder="e.g. Homework 1 — Nepali vowels" /></div>
          <div>
            <label className="text-sm font-bold text-slate-700">Linked resource</label>
            <ResourceSearch resources={allResources} value={editing.resourceId} onChange={(id) => setEditing({ ...editing, resourceId: id })} />
          </div>
          <div><label className="text-sm font-bold text-slate-700">Instructions</label><textarea className={`${inputCls} min-h-[80px]`} value={editing.instructions} onChange={(e) => setEditing({ ...editing, instructions: e.target.value })} placeholder="What should students do?" /></div>
          <div><label className="text-sm font-bold text-slate-700">📅 Due date</label><input type="date" className={inputCls} value={editing.dueDate} onChange={(e) => setEditing({ ...editing, dueDate: e.target.value })} /></div>
          <div>
            <span className="text-sm font-bold text-slate-700">Assign to classes</span>
            <div className="mt-2 flex flex-wrap gap-2">
              {myClasses.length === 0 ? <span className="text-xs text-slate-400">No classes assigned to you.</span> : myClasses.map((c) => <button key={c.id} type="button" onClick={() => toggleClass(c.id)} className={`rounded-full px-3 py-1.5 text-xs font-bold transition ${editing.classIds.includes(c.id) ? "bg-brand text-white" : "bg-slate-100 text-slate-600"}`}>{c.name}</button>)}
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setEditing(null)} className="rounded-lg bg-slate-200 px-4 py-2 text-sm font-black text-slate-700 hover:bg-slate-300">Cancel</button>
            <button onClick={save} className="rounded-lg bg-brand px-5 py-2 text-sm font-black text-white hover:bg-brand-700">Save homework</button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {myHomework.length === 0 && <p className="card-panel text-slate-500">No homework yet.</p>}
          {myHomework.map((h) => {
            const classNames = h.classIds.map(className).filter(Boolean);
            return (
              <div key={h.id} className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="min-w-0">
                  <strong className="block truncate text-slate-900">{h.title || "(untitled)"}</strong>
                  <span className="text-sm text-slate-500">{resourceName(h.resourceId)} · Due: {h.dueDate || "No date"} {classNames.length ? ` · ${classNames.join(", ")}` : ""}</span>
                </div>
                <button onClick={() => { if (confirm("Delete homework?")) { void deleteHomework(h.id); refresh(); } }} className="rounded-full bg-rose-100 px-3 py-1 text-xs font-bold text-rose-700">Delete</button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ------------------------------- attendance ------------------------------- */

function AttendanceView({ teacher }: { teacher: TeacherAccount }) {
  const [, setTick] = useState(0);
  const refresh = () => setTick((t) => t + 1);
  const school = getSchool();
  const myClasses = school.classes.filter((c) => c.orgId === teacher.orgId && c.teacherId === teacher.id);
  const [classId, setClassId] = useState("");
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));

  useEffect(() => initSchoolStore(refresh), []);
  const cls = myClasses.find((c) => c.id === classId) || myClasses[0];
  const todayStr = new Date().toISOString().slice(0, 10);
  const isToday = selectedDate === todayStr;
  const isPast = selectedDate < todayStr;
  const students = cls ? school.students.filter((s) => s.classId === cls.id) : [];

  const recordId = cls ? `${cls.id}-${selectedDate}` : "";
  const existing = cls ? school.attendance.find((a) => a.id === recordId) : null;

  // For past dates, show the saved record (read-only).
  const displayEntries = !isToday && existing
    ? existing.entries
    : students.map((s) => {
        const saved = existing?.entries.find((e) => e.studentId === s.id);
        return { studentId: s.id, studentName: s.name, status: (saved?.status || "absent") as AttendanceStatus };
      });

  const [status, setStatus] = useState<Record<string, AttendanceStatus>>({});
  useEffect(() => {
    const map: Record<string, AttendanceStatus> = {};
    if (existing) existing.entries.forEach((e) => (map[e.studentId] = e.status));
    setStatus(map);
  }, [classId, selectedDate]); // eslint-disable-line react-hooks/exhaustive-deps

  const save = async () => {
    if (!cls) return;
    await saveAttendance({
      id: recordId, classId: cls.id, className: cls.name, date: selectedDate,
      entries: students.map((s) => ({ studentId: s.id, studentName: s.name, status: status[s.id] || "absent" })),
    });
    refresh();
    alert("Attendance saved.");
  };

  return (
    <div>
      <div className="mb-5"><span className="text-xs font-black uppercase tracking-widest text-brand-600">Attendance</span><h1 className="text-2xl font-extrabold text-slate-900">{isPast ? "View past attendance" : "Take attendance"}</h1></div>
      {myClasses.length === 0 ? <p className="card-panel text-slate-500">No classes assigned to you.</p> : (
        <>
          {/* class selector */}
          <div className="mb-4 flex flex-wrap gap-2">{myClasses.map((c) => <button key={c.id} onClick={() => setClassId(c.id)} className={`rounded-full px-4 py-2 text-sm font-bold transition ${(!cls || cls.id === c.id) ? "bg-brand text-white" : "bg-slate-100 text-slate-600"}`}>{c.name}</button>)}</div>

          {/* date selector — pick any date to view/edit */}
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <label className="text-sm font-bold text-slate-700">📅 Select date:</label>
            <input type="date" className={`${inputCls} max-w-[180px]`} value={selectedDate} max={todayStr} onChange={(e) => setSelectedDate(e.target.value)} />
            <button onClick={() => setSelectedDate(todayStr)} className="rounded-lg bg-slate-200 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-300">Today</button>
          </div>

          {cls ? (
            <>
              {/* header row: class name + selected date */}
              <div className="mb-3 overflow-hidden rounded-xl border border-slate-200">
                <div className="grid grid-cols-2 bg-slate-900 text-white">
                  <div className="px-4 py-2.5 text-sm font-black">Class: {cls.name}</div>
                  <div className="px-4 py-2.5 text-right text-sm font-black">Date: {selectedDate}{isToday ? " (Today)" : ""}</div>
                </div>
              </div>

              {isPast && !existing ? (
                <div className="card-panel text-slate-500">No attendance was recorded for this date.</div>
              ) : (
                <>
                  <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50 text-xs font-black uppercase text-slate-500"><tr><th className="px-4 py-3 text-left">Student Name</th><th className="px-4 py-3 text-center">Present</th><th className="px-4 py-3 text-center">Absent</th><th className="px-4 py-3 text-center">Late</th></tr></thead>
                      <tbody className="divide-y divide-slate-100">
                        {displayEntries.length === 0 ? <tr><td colSpan={4} className="px-4 py-6 text-center text-slate-400">No students in this class.</td></tr> : displayEntries.map((e) => (
                          <tr key={e.studentId}>
                            <td className="px-4 py-3 font-bold text-slate-900">{e.studentName}</td>
                            {(["present", "absent", "authorised-absent"] as AttendanceStatus[]).map((st) => (
                              <td key={st} className="px-4 py-3 text-center">
                                {isToday ? (
                                  <input type="radio" name={`att-${e.studentId}`} checked={status[e.studentId] === st} onChange={() => setStatus((m) => ({ ...m, [e.studentId]: st }))} />
                                ) : (
                                  // Past date = read-only view (a static check mark if selected)
                                  e.status === st ? <span className="text-brand">●</span> : <span className="text-slate-200">○</span>
                                )}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* summary of attendance for past dates */}
                  {!isToday && existing ? (
                    <div className="mt-3 flex flex-wrap gap-3 text-sm">
                      <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">Present: {existing.entries.filter((e) => e.status === "present").length}</span>
                      <span className="rounded-full bg-rose-100 px-3 py-1 text-xs font-bold text-rose-700">Absent: {existing.entries.filter((e) => e.status === "absent").length}</span>
                      <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-700">Late: {existing.entries.filter((e) => e.status === "authorised-absent").length}</span>
                    </div>
                  ) : null}

                  {isToday ? (
                    <button onClick={save} className="mt-3 rounded-lg bg-brand px-5 py-2 text-sm font-black text-white hover:bg-brand-700">Save attendance</button>
                  ) : null}
                </>
              )}
            </>
          ) : null}
        </>
      )}
    </div>
  );
}

/* -------------------------------- classes --------------------------------- */

function MyClasses({ teacher }: { teacher: TeacherAccount }) {
  const [, setTick] = useState(0);
  const refresh = () => setTick((t) => t + 1);
  const school = getSchool();
  const myClasses = school.classes.filter((c) => c.orgId === teacher.orgId && c.teacherId === teacher.id);
  const [classId, setClassId] = useState("");
  const [openStudent, setOpenStudent] = useState<string | null>(null);

  useEffect(() => initSchoolStore(refresh), []);
  const cls = myClasses.find((c) => c.id === classId) || myClasses[0];
  const students = cls ? school.students.filter((s) => s.classId === cls.id) : [];

  if (myClasses.length === 0) return <p className="card-panel text-slate-500">No classes assigned to you.</p>;

  // Student detail view
  if (openStudent) {
    return <StudentDetail studentId={openStudent} className={cls?.name || ""} onHome={() => setOpenStudent(null)} />;
  }

  return (
    <div>
      {/* Class tabs + Reset button */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {myClasses.map((c) => (
          <button key={c.id} onClick={() => setClassId(c.id)} className={`rounded-full px-5 py-2.5 text-sm font-black transition ${(!cls || cls.id === c.id) ? "bg-brand text-white shadow-sm" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
            {c.name}
          </button>
        ))}
      </div>

      {/* Student list */}
      <div className="space-y-3">
        {students.length === 0 ? <p className="card-panel text-slate-500">No students in this class.</p> : students.map((s) => {
          const prog = school.progress.find((p) => p.studentId === s.id);
          return (
            <div key={s.id} className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:shadow-md">
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-50 text-sm font-black text-brand">{s.name.split(" ").map((w) => w[0]).slice(0, 2).join("")}</span>
                <div className="min-w-0"><strong className="block truncate text-slate-900">{s.name}</strong>{prog ? <span className="text-xs font-bold uppercase text-slate-500">{prog.level}</span> : <span className="text-xs text-slate-400">progress not set</span>}</div>
              </div>
              <button onClick={() => setOpenStudent(s.id)} className="rounded-full bg-sky-100 px-4 py-1.5 text-xs font-bold text-sky-800 hover:bg-sky-200">View</button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ----------------------------- student detail ----------------------------- */

function StudentDetail({ studentId, className, onHome }: { studentId: string; className: string; onHome: () => void }) {
  const [, setTick] = useState(0);
  const refresh = () => setTick((t) => t + 1);
  const school = getSchool();
  const student = school.students.find((s) => s.id === studentId);
  const prog = school.progress.find((p) => p.studentId === studentId);
  const allResources = school.resources;
  const [level, setLevel] = useState<ProgressLevel>(prog?.level || "improving");
  const [note, setNote] = useState(prog?.note || "");
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignResId, setAssignResId] = useState("");
  const [assignTitle, setAssignTitle] = useState("");
  const [assignDue, setAssignDue] = useState(new Date().toISOString().slice(0, 10));
  const [expandedMonths, setExpandedMonths] = useState<Set<string>>(new Set());
  const [hwFilter, setHwFilter] = useState<"all" | "due" | "submitted" | "completed">("all");
  const [viewHwId, setViewHwId] = useState<string | null>(null);
  const topRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => initSchoolStore(refresh), []);
  if (!student) return null;

  // Attendance percentage
  const attRecords = school.attendance.filter((a) => a.entries.some((e) => e.studentId === studentId));
  const totalSessions = attRecords.length;
  const presentSessions = attRecords.filter((a) => a.entries.find((e) => e.studentId === studentId)?.status === "present").length;
  const attendancePct = totalSessions > 0 ? Math.round((presentSessions / totalSessions) * 100) : 0;

  // ALL homework for this student — class-level AND individually assigned.
  // Each item is merged with its submission (if any).
  const allHw = school.homework.filter((h) =>
    h.classIds.includes(student.classId) || (h.studentIds || []).includes(studentId),
  ).map((h) => {
    const sub = school.submissions.find((s) => s.id === `${h.id}-${studentId}`);
    return { hw: h, sub, status: sub ? sub.status : "due" as const };
  });

  // Homework statistics — THREE separate statuses
  const hwTotal = allHw.length;
  const hwDue = allHw.filter((x) => !x.sub).length;
  const hwSubmitted = allHw.filter((x) => x.sub && x.sub.status === "submitted").length;
  const hwCompleted = allHw.filter((x) => x.sub && x.sub.status === "complete").length;
  const hwPct = hwTotal > 0 ? Math.round((hwCompleted / hwTotal) * 100) : 0;

  // Filter
  const filteredHw = allHw.filter((x) =>
    hwFilter === "all" ? true
    : hwFilter === "due" ? !x.sub
    : hwFilter === "submitted" ? (x.sub && x.sub.status === "submitted")
    : (x.sub && x.sub.status === "complete"),
  );

  // Group filtered homework by month (by due date or created date, latest first)
  const byMonth: Record<string, typeof filteredHw> = {};
  [...filteredHw].sort((a, b) => (b.hw.dueDate || b.hw.createdAt || "").localeCompare(a.hw.dueDate || a.hw.createdAt || "")).forEach((item) => {
    const d = new Date(item.hw.dueDate || item.hw.createdAt || new Date().toISOString());
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    if (!byMonth[key]) byMonth[key] = [];
    byMonth[key].push(item);
  });
  const monthKeys = Object.keys(byMonth).sort().reverse();
  const monthLabel = (key: string) => {
    const [y, m] = key.split("-");
    return new Date(Number(y), Number(m) - 1).toLocaleDateString("en-GB", { month: "long", year: "numeric" });
  };
  const toggleMonth = (key: string) => setExpandedMonths((prev) => {
    const next = new Set(prev); if (next.has(key)) next.delete(key); else next.add(key); return next;
  });

  const assignToStudent = async () => {
    if (!assignTitle.trim()) { alert("Enter a title."); return; }
    await saveHomework({
      id: `hw-ind-${Date.now().toString(36)}`, resourceId: assignResId,
      title: assignTitle, instructions: "", classIds: [], studentIds: [studentId],
      dueDate: assignDue, createdAt: new Date().toISOString(),
    });
    setAssignOpen(false); setAssignTitle(""); setAssignResId(""); refresh();
  };

  const scrollToTop = () => topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  const navBtn = "rounded-full px-4 py-2 text-xs font-black transition shadow-sm";

  return (
    <div className="space-y-4" ref={topRef}>
      {/* Sticky navigation — two buttons */}
      <div className="sticky top-0 z-20 -mx-4 flex gap-2 bg-slate-100/90 px-4 py-2 backdrop-blur sm:-mx-7 sm:px-7">
        <button onClick={onHome} className={`${navBtn} bg-brand text-white hover:bg-brand-700`}>🏠 Home</button>
        <button onClick={scrollToTop} className={`${navBtn} bg-indigo-600 text-white hover:bg-indigo-700`}>🎓 {student.name.split(" ")[0]}</button>
      </div>

      {/* Section 1: Student info + attendance (indigo) */}
      <div className="rounded-2xl border border-indigo-200 bg-gradient-to-br from-indigo-50 to-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center gap-4">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-indigo-600 text-lg font-black text-white">{student.name.split(" ").map((w) => w[0]).slice(0, 2).join("")}</span>
          <div className="flex-1"><h2 className="text-xl font-extrabold text-slate-900">{student.name}</h2><p className="text-sm font-bold text-indigo-600">{className}</p></div>
          <div className="text-center"><div className="text-3xl font-black text-indigo-600">{attendancePct}%</div><div className="text-[0.65rem] font-black uppercase tracking-wide text-slate-400">Attendance</div><div className="text-[0.6rem] text-slate-400">{presentSessions}/{totalSessions} sessions</div></div>
        </div>
      </div>

      {/* Section 2: Progress (emerald) */}
      <div className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-5 shadow-sm">
        <h3 className="mb-3 text-sm font-black uppercase tracking-wide text-emerald-700">📊 Set Progress</h3>
        <div className="mb-3 flex flex-wrap gap-2">{PROGRESS_LEVELS.map((l) => <button key={l} onClick={() => setLevel(l)} className={`rounded-full px-4 py-1.5 text-xs font-black uppercase transition ${level === l ? "bg-emerald-600 text-white" : "bg-white text-slate-600 border border-slate-200"}`}>{l}</button>)}</div>
        <textarea className={`${inputCls} min-h-[60px]`} placeholder="Note for the student/parent" value={note} onChange={(e) => setNote(e.target.value)} />
        <button onClick={async () => { await setProgress(studentId, level, note); refresh(); }} className="mt-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-black text-white hover:bg-emerald-700">Save progress</button>
      </div>

      {/* Section 3: Assign individual homework (amber) */}
      <div className="rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-white p-5 shadow-sm">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-black uppercase tracking-wide text-amber-700">📝 Assign Homework to this student</h3>
          <button onClick={() => setAssignOpen((o) => !o)} className="rounded-full bg-amber-500 px-3 py-1 text-xs font-black text-white hover:bg-amber-600">{assignOpen ? "Close" : "+ Assign"}</button>
        </div>
        {assignOpen ? (
          <div className="mt-3 space-y-3">
            <input className={inputCls} placeholder="Homework title" value={assignTitle} onChange={(e) => setAssignTitle(e.target.value)} />
            <ResourceSearch resources={allResources} value={assignResId} onChange={setAssignResId} />
            <input type="date" className={inputCls} value={assignDue} onChange={(e) => setAssignDue(e.target.value)} />
            <button onClick={assignToStudent} className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-black text-white hover:bg-amber-700">Assign to {student.name.split(" ")[0]}</button>
          </div>
        ) : null}
      </div>

      {/* Section 4: Homework with statistics (rose) */}
      <div className="rounded-2xl border border-rose-200 bg-gradient-to-br from-rose-50 to-white p-5 shadow-sm">
        <h3 className="mb-3 text-sm font-black uppercase tracking-wide text-rose-700">📒 Homework</h3>

        {/* Statistics row — like attendance */}
        {hwTotal > 0 ? (
          <div className="mb-4 flex flex-wrap items-center gap-4">
            <div className="text-center">
              <div className="text-3xl font-black text-rose-600">{hwPct}%</div>
              <div className="text-[0.65rem] font-black uppercase tracking-wide text-slate-400">Completion</div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => setHwFilter(hwFilter === "due" ? "all" : "due")} className={`rounded-full px-4 py-2 text-xs font-black transition ${hwFilter === "due" ? "bg-amber-500 text-white" : "bg-amber-100 text-amber-700 hover:bg-amber-200"}`}>📋 Due: {hwDue}</button>
              <button onClick={() => setHwFilter(hwFilter === "submitted" ? "all" : "submitted")} className={`rounded-full px-4 py-2 text-xs font-black transition ${hwFilter === "submitted" ? "bg-sky-500 text-white" : "bg-sky-100 text-sky-700 hover:bg-sky-200"}`}>📤 Submitted: {hwSubmitted}</button>
              <button onClick={() => setHwFilter(hwFilter === "completed" ? "all" : "completed")} className={`rounded-full px-4 py-2 text-xs font-black transition ${hwFilter === "completed" ? "bg-emerald-600 text-white" : "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"}`}>✓ Completed: {hwCompleted}</button>
              {hwFilter !== "all" ? <button onClick={() => setHwFilter("all")} className="rounded-full bg-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-300">Show all ({hwTotal})</button> : null}
            </div>
          </div>
        ) : null}

        {/* Homework grouped by month — includes DUE (not yet submitted) items */}
        {monthKeys.length === 0 ? <p className="text-sm text-slate-400">{hwFilter === "due" ? "No due homework." : hwFilter === "submitted" ? "No submitted homework." : hwFilter === "completed" ? "No completed homework yet." : "No homework assigned yet."}</p> : monthKeys.map((mk) => (
          <div key={mk} className="mb-2">
            <button onClick={() => toggleMonth(mk)} className="flex w-full items-center justify-between gap-2 rounded-lg bg-white px-3 py-2 text-sm font-bold text-slate-700 shadow-sm hover:bg-slate-50">
              <span>{expandedMonths.has(mk) ? "▼" : "▶"} {monthLabel(mk)}</span>
              <span className="rounded-full bg-rose-100 px-2 py-0.5 text-xs text-rose-600">{byMonth[mk].length}</span>
            </button>
            {expandedMonths.has(mk) ? (
              <div className="mt-2 space-y-2">
                {byMonth[mk].map(({ hw, sub }) => {
                  const resource = school.resources.find((r) => r.id === hw.resourceId);
                  return (
                    <div key={hw.id} className="rounded-lg border border-slate-200 bg-white p-3">
                      <div className="flex items-center justify-between gap-2">
                        <div><strong className="text-slate-900">{hw.title || "Homework"}</strong>{hw.dueDate ? <span className="ml-2 text-xs text-slate-400">Due: {hw.dueDate}</span> : null}</div>
                        <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-bold ${!sub ? "bg-amber-100 text-amber-700" : sub.status === "complete" ? "bg-emerald-100 text-emerald-700" : "bg-sky-100 text-sky-700"}`}>{!sub ? "Due" : sub.status === "complete" ? "Complete" : "Submitted"}</span>
                      </div>

                      {/* View the homework content (the linked resource) */}
                      {resource ? (
                        <div className="mt-2">
                          <button onClick={() => setViewHwId(viewHwId === hw.id ? null : hw.id)} className="inline-flex items-center gap-1 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-black text-white hover:bg-slate-700">
                            {viewHwId === hw.id ? "▼ Hide content" : "▶ View content"}
                          </button>
                          {viewHwId === hw.id ? (
                            <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
                              <div className="mb-2 flex gap-2">
                                <button onClick={() => exportWord({ id: resource.id, title: resource.title, type: resource.type as never, blocks: resource.blocks as never, createdAt: resource.createdAt, updatedAt: resource.createdAt } as never)} className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-black text-slate-700 hover:bg-slate-50">📄 Word</button>
                                <button onClick={() => exportPDF({ id: resource.id, title: resource.title, type: resource.type as never, blocks: resource.blocks as never, createdAt: resource.createdAt, updatedAt: resource.createdAt } as never)} className="rounded-lg bg-brand px-3 py-1.5 text-xs font-black text-white hover:bg-brand-700">⬇ PDF</button>
                              </div>
                              <TeacherRenderer blocks={resource.blocks as never} />
                            </div>
                          ) : null}
                        </div>
                      ) : null}

                      {sub?.notes ? <p className="mt-1 text-sm text-slate-600">"{sub.notes}"</p> : null}
                      {sub?.fileUrl ? (
                        <div className="mt-2">
                          {isImageFile(sub.fileUrl, sub.fileName) ? <img src={sub.fileUrl} alt={sub.fileName || "work"} className="max-h-48 rounded-lg border border-slate-200" /> : null}
                          <a href={sub.fileUrl} download={sub.fileName || "homework"} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50">⬇ {sub.fileName || "Download"}</a>
                        </div>
                      ) : null}
                      {/* Mark / Unmark */}
                      {sub ? (sub.status === "complete" ? (
                        <button onClick={async () => { await setSubmissionStatus(sub.id, "submitted"); refresh(); }} className="mt-2 rounded-lg bg-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-300">↩ Unmark</button>
                      ) : (
                        <button onClick={async () => { await setSubmissionStatus(sub.id, "complete"); refresh(); }} className="mt-2 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700">Mark as complete</button>
                      )) : (
                        <p className="mt-1 text-xs italic text-slate-400">Not yet submitted by student</p>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}

/* --------------------------------- shell ---------------------------------- */

type Tab = "content" | "resources" | "classwork" | "homework" | "attendance" | "classes";

export default function Teachers() {
  const { user, loading, signOut } = useGoogleAuth();
  const [ready, setReady] = useState(false);
  const [tab, setTab] = useState<Tab>("content");
  const [, setTick] = useState(0);

  useEffect(() => {
    const unsub1 = initTeacherStore(() => { setReady(true); setTick((t) => t + 1); });
    const unsub2 = initOrgStore(() => setTick((t) => t + 1));
    const unsub3 = initSchoolStore(() => setTick((t) => t + 1));
    return () => { unsub1(); unsub2(); unsub3(); };
  }, []);

  if (loading || !ready) return <div className="flex min-h-screen items-center justify-center bg-slate-900"><span className="text-sm font-bold text-white/70">Loading…</span></div>;

  // Find teacher record by Google email
  const teacher = user ? getTeacherDoc().accounts.find((a) => a.email.toLowerCase() === user.email.toLowerCase()) : null;

  // Guard: check disabled + org status
  if (teacher) {
    let blocked = false;
    if (teacher.status === "disabled") blocked = true;
    if (!blocked && teacher.orgId) {
      const org = getOrgById(teacher.orgId);
      if (org && (org.status === "suspended" || (org.subscriptionEnd && new Date(org.subscriptionEnd) < new Date()))) blocked = true;
    }
    if (blocked) {
      void signOut();
      return <Login />;
    }
  }

  if (!user || !teacher) return <Login />;

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: "content", label: "My Content", icon: "📝" },
    { id: "resources", label: "Resources", icon: "📚" },
    { id: "classwork", label: "Classwork", icon: "📖" },
    { id: "homework", label: "Homework", icon: "📋" },
    { id: "attendance", label: "Attendance", icon: "📅" },
    { id: "classes", label: "My Classes", icon: "👥" },
  ];

  const org = teacher.orgId ? getOrgById(teacher.orgId) : undefined;

  return (
    <div className="min-h-screen bg-slate-100">
      {/* Organisation banner */}
      {org ? (
        <div className="flex items-center justify-center gap-3 bg-brand px-4 py-2 text-white">
          {org.logo ? <img src={org.logo} alt="" className="h-7 w-7 rounded object-cover" /> : <span className="text-lg">🏢</span>}
          <span className="text-sm font-black tracking-wide">{org.name}</span>
        </div>
      ) : null}
      <header className="sticky top-0 z-40 border-b border-white/10 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 shadow-lg">
        <div className="mx-auto flex w-full max-w-[1100px] items-center gap-3 px-4 py-3">
          <span className="text-2xl">🍎</span>
          <div className="leading-tight"><span className="block text-sm font-black text-white">Teacher Portal</span><span className="block text-[0.7rem] text-white/60">{teacher.name}{org ? ` · ${org.name}` : ""}</span></div>
          <div className="ml-auto flex items-center gap-2">
            <a href="/" className="rounded-lg bg-white/10 px-3 py-1.5 text-xs font-bold text-white ring-1 ring-white/20 hover:bg-white/20">Website</a>
            <button onClick={() => void signOut()} className="rounded-lg bg-brand px-3 py-1.5 text-xs font-bold text-white hover:bg-brand-700">Logout</button>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-[1100px] p-4 sm:p-7">
        <nav className="mb-6 flex flex-wrap gap-2">
          {tabs.map((t) => <button key={t.id} onClick={() => setTab(t.id)} className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-bold transition ${tab === t.id ? "bg-brand text-white" : "text-slate-600 hover:bg-slate-100"}`}><span>{t.icon}</span> {t.label}</button>)}
        </nav>
        {tab === "content" && <MyContent teacher={teacher} />}
        {tab === "resources" && <ResourcesManager teacher={teacher} />}
        {tab === "classwork" && <HomeworkManager teacher={teacher} category="classwork" />}
        {tab === "homework" && <HomeworkManager teacher={teacher} />}
        {tab === "attendance" && <AttendanceView teacher={teacher} />}
        {tab === "classes" && <MyClasses teacher={teacher} />}
      </main>
    </div>
  );
}
