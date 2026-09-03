import { useEffect, useState, type ReactNode } from "react";
import { useLogo, useStore } from "../lib/store";
import { useGoogleAuth } from "../lib/googleAuth";
import { PortalLogin } from "../components/GoogleLogin";
import { getAdminEmails, initAdminStore } from "../lib/adminStore";
import { type Article, type NlccData } from "../lib/nlcc";
import ArticleBuilder from "../components/admin/ArticleBuilder";
import { ImageUploader } from "../components/ImageUploader";
import { Counter } from "../components/motion";
import { exportContent, importContent } from "../lib/contentIO";
import {
  createTeacher,
  getTeacherDoc,
  getTeacherItems,
  initTeacherStore,
} from "../lib/teacherStore";
import {
  createClass,
  createStudent,
  deleteClass,
  deleteResource,
  deleteStudent,
  getSchool,
  initSchoolStore,
  resetAllClasses,
  resetClassData,
  resetStudentPassword,
  setClassStatus,
  setStudentStatus,
  updateStudent,
} from "../lib/schoolStore";
import { sendStudentLoginEmail } from "../lib/email";
import {
  createOrgFromRequest,
  createOrganisation,
  deleteAccessRequest,
  deleteOrganisation,
  getOrgs,
  initOrgStore,
  renewOrganisation,
  updateOrganisation,
} from "../lib/orgStore";
import { resetTeacherPassword, setTeacherStatus } from "../lib/teacherStore";

/* ----------------------------- shared field UI ---------------------------- */

const labelCls = "block text-[0.7rem] font-black uppercase tracking-wide text-slate-500 mb-1";
const inputCls =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/25";

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className={labelCls}>{label}</span>
      {children}
    </label>
  );
}

interface Row { id: string; [k: string]: string | undefined }

interface FieldDef { name: string; label: string; type: "text" | "date" | "textarea" | "select" | "image"; options?: string[] }

const COLORS = ["blue", "red", "green", "pink", "orange", "purple"];

const COLLECTION_CONFIG: Record<string, { key: keyof NlccData; title: string; kicker: string; fields: FieldDef[] }> = {
  schedule: {
    key: "weeklySchedule", title: "Weekly Schedule", kicker: "Classes",
    fields: [
      { name: "title", label: "Title", type: "text" },
      { name: "startDate", label: "Start Date", type: "date" },
      { name: "endDate", label: "End Date", type: "date" },
      { name: "time", label: "Time", type: "text" },
      { name: "location", label: "Location", type: "text" },
      { name: "eventMode", label: "Mode", type: "select", options: ["class", "holiday", "day"] },
      { name: "classMode", label: "Class Mode", type: "select", options: ["", "Online", "Physical"] },
      { name: "statusLabel", label: "Status Label", type: "text" },
      { name: "color", label: "Colour", type: "select", options: COLORS },
    ],
  },
  annual: {
    key: "annualProgrammes", title: "Annual Programmes", kicker: "Events",
    fields: [
      { name: "title", label: "Title", type: "text" },
      { name: "startDate", label: "Start Date", type: "date" },
      { name: "endDate", label: "End Date", type: "date" },
      { name: "time", label: "Time", type: "text" },
      { name: "location", label: "Location", type: "text" },
      { name: "eventMode", label: "Mode", type: "select", options: ["day", "holiday"] },
      { name: "statusLabel", label: "Status Label", type: "text" },
      { name: "color", label: "Colour", type: "select", options: COLORS },
    ],
  },
  hindu: {
    key: "hinduDates", title: "Hindu Calendar", kicker: "Festivals",
    fields: [
      { name: "title", label: "Title", type: "text" },
      { name: "startDate", label: "Start Date", type: "date" },
      { name: "endDate", label: "End Date", type: "date" },
      { name: "eventMode", label: "Mode", type: "select", options: ["day", "holiday"] },
      { name: "statusLabel", label: "Status Label", type: "text" },
      { name: "tithi", label: "Tithi", type: "text" },
      { name: "color", label: "Colour", type: "select", options: COLORS },
    ],
  },
  slider: {
    key: "slides", title: "Photo Slider", kicker: "Banner",
    fields: [
      { name: "title", label: "Title", type: "text" },
      { name: "summary", label: "Summary", type: "textarea" },
      { name: "image", label: "Image", type: "image" },
      { name: "link", label: "Link", type: "text" },
    ],
  },
};

/* -------------------------------- login ----------------------------------- */

function LoginScreen() {
  return <PortalLogin portalName="NLCC Admin" portalIcon="⚙️" role="admin" gradient="from-slate-900 via-brand-700 to-brand" onSuccess={() => {}} />;
}

/* ----------------------------- generic editor ----------------------------- */

function CollectionEditor({ tab }: { tab: string }) {
  const { data, save } = useStore();
  const cfg = COLLECTION_CONFIG[tab];
  const [editing, setEditing] = useState<Row | null>(null);

  const rows = (data[cfg.key] as unknown as Row[]) || [];

  const startNew = () => {
    const blank: Row = { id: "" };
    cfg.fields.forEach((f) => (blank[f.name] = ""));
    setEditing(blank);
  };

  const persist = (row: Row) => {
    // EDIT an existing item → keep its id so it updates IN PLACE (no duplicate).
    // NEW item → generate a GUARANTEED-UNIQUE id, so two events that share a
    //   title (e.g. "Online Class" on 11 Jul AND on 18 Jul) don't collide and
    //   overwrite each other. We must NOT derive the id from the title (slug),
    //   because identical titles produce identical ids and the second save
    //   would replace the first.
    const id =
      row.id || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    const exists = rows.some((r) => r.id === id);
    const next = exists
      ? rows.map((r) => (r.id === id ? { ...row, id } : r))
      : [...rows, { ...row, id }];
    save({ ...data, [cfg.key]: next } as unknown as NlccData);
    setEditing(null);
  };

  const remove = (id: string) => {
    if (!confirm("Delete this item?")) return;
    save({ ...data, [cfg.key]: rows.filter((r) => r.id !== id) } as unknown as NlccData);
  };

  if (editing) {
    return (
      <RowForm
        title={editing.id ? `Edit ${cfg.title}` : `Add ${cfg.title}`}
        fields={cfg.fields}
        row={editing}
        onCancel={() => setEditing(null)}
        onSave={persist}
      />
    );
  }

  return (
    <div>
      <div className="mb-5 flex items-center justify-between gap-4">
        <div>
          <span className="text-xs font-black uppercase tracking-widest text-brand-600">{cfg.kicker}</span>
          <h1 className="text-2xl font-extrabold text-slate-900">{cfg.title}</h1>
        </div>
        <button onClick={startNew} className="rounded-lg bg-brand px-4 py-2 text-sm font-black text-white transition hover:bg-brand-700">+ Add</button>
      </div>
      <div className="space-y-3">
        {rows.length === 0 && <p className="card-panel text-slate-500">No items yet.</p>}
        {rows.map((row) => (
          <div key={row.id} className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="min-w-0">
              <strong className="block truncate text-slate-900">{row.title || "(untitled)"}</strong>
              <span className="text-sm text-slate-500">
                {[row.startDate, row.endDate, row.time, row.location].filter(Boolean).join(" · ")}
              </span>
            </div>
            <div className="flex shrink-0 gap-2">
              {row.color ? <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold capitalize text-slate-600">{row.color}</span> : null}
              <button onClick={() => setEditing(row)} className="rounded-full bg-sky-100 px-3 py-1 text-xs font-bold text-sky-800">Edit</button>
              <button onClick={() => remove(row.id)} className="rounded-full bg-rose-100 px-3 py-1 text-xs font-bold text-rose-700">Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function RowForm({
  title, fields, row, onSave, onCancel,
}: {
  title: string; fields: FieldDef[]; row: Row; onSave: (r: Row) => void; onCancel: () => void;
}) {
  const [draft, setDraft] = useState<Row>({ ...row });
  const set = (name: string, value: string) => setDraft((d) => ({ ...d, [name]: value }));

  return (
    <div>
      <div className="mb-5 flex items-center justify-between gap-4">
        <h1 className="text-2xl font-extrabold text-slate-900">{title}</h1>
        <div className="flex gap-2">
          <button onClick={onCancel} className="rounded-lg bg-slate-200 px-4 py-2 text-sm font-black text-slate-700 hover:bg-slate-300">Cancel</button>
          <button onClick={() => onSave(draft)} className="rounded-lg bg-brand px-5 py-2 text-sm font-black text-white hover:bg-brand-700">Save</button>
        </div>
      </div>
      <div className="card-panel grid gap-4 sm:grid-cols-2">
        {fields.map((f) => {
          const wide = f.type === "textarea" || f.type === "image";
          return (
            <div key={f.name} className={wide ? "sm:col-span-2" : ""}>
              {f.type === "image" ? (
                <ImageUploader label={f.label} value={draft[f.name]} onChange={(url) => set(f.name, url)} />
              ) : (
                <Field label={f.label}>
                  {f.type === "textarea" ? (
                    <textarea className={`${inputCls} min-h-[90px]`} value={draft[f.name] || ""} onChange={(e) => set(f.name, e.target.value)} />
                  ) : f.type === "select" ? (
                    <select className={inputCls} value={draft[f.name] || ""} onChange={(e) => set(f.name, e.target.value)}>
                      {(f.options || []).map((o) => <option key={o} value={o}>{o || "None"}</option>)}
                    </select>
                  ) : (
                    <input className={inputCls} type={f.type} value={draft[f.name] || ""} onChange={(e) => set(f.name, e.target.value)} />
                  )}
                </Field>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ------------------------------- committee -------------------------------- */

function CommitteeEditor() {
  const { data, save } = useStore();
  const [editing, setEditing] = useState<Row | null>(null);

  const rows = (data.committeeMembers as unknown as Row[]) || [];
  const fields: FieldDef[] = [
    { name: "name", label: "Name", type: "text" },
    { name: "post", label: "Post / Role", type: "text" },
    { name: "photo", label: "Photo", type: "image" },
    { name: "order", label: "Display Order", type: "text" },
  ];

  const persist = (row: Row) => {
    // EDIT an existing member → keep its id so it updates IN PLACE (no duplicate).
    // NEW member → generate a GUARANTEED-UNIQUE id, so two members who share a
    //   name don't collide and overwrite each other. We must NOT derive the id
    //   from the name (slug), because identical names produce identical ids and
    //   the second save would replace the first.
    const id =
      row.id || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    const exists = rows.some((r) => r.id === id);
    const next = exists
      ? rows.map((r) => (r.id === id ? { ...row, id } : r))
      : [...rows, { ...row, id }];
    save({ ...data, committeeMembers: next } as unknown as NlccData);
    setEditing(null);
  };

  const remove = (id: string) => {
    if (!confirm("Remove this committee member?")) return;
    save({ ...data, committeeMembers: rows.filter((r) => r.id !== id) } as unknown as NlccData);
  };

  if (editing) return <RowForm title={editing.id ? "Edit Member" : "Add Member"} fields={fields} row={editing} onSave={persist} onCancel={() => setEditing(null)} />;

  return (
    <div>
      <div className="mb-5 flex items-center justify-between gap-4">
        <div><span className="text-xs font-black uppercase tracking-widest text-brand-600">Team</span><h1 className="text-2xl font-extrabold text-slate-900">Committee Members</h1></div>
        <button onClick={() => setEditing({ id: "", name: "", post: "", photo: "", order: String(rows.length + 1) })} className="rounded-lg bg-brand px-4 py-2 text-sm font-black text-white hover:bg-brand-700">+ Add</button>
      </div>
      <div className="space-y-3">
        {rows.map((row) => (
          <div key={row.id} className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div><strong className="block text-slate-900">{row.name}</strong><span className="text-sm text-slate-500">{row.post}</span></div>
            <div className="flex gap-2">
              <button onClick={() => setEditing(row)} className="rounded-full bg-sky-100 px-3 py-1 text-xs font-bold text-sky-800">Edit</button>
              <button onClick={() => remove(row.id)} className="rounded-full bg-rose-100 px-3 py-1 text-xs font-bold text-rose-700">Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* -------------------------------- messages -------------------------------- */

function MessagesView() {
  const { data, save } = useStore();
  const messages = data.contactMessages || [];

  const remove = (id: string) => {
    save({ ...data, contactMessages: messages.filter((m) => m.id !== id) });
  };

  return (
    <div>
      <div className="mb-5"><span className="text-xs font-black uppercase tracking-widest text-brand-600">Inbox</span><h1 className="text-2xl font-extrabold text-slate-900">Contact Messages</h1></div>
      <div className="space-y-3">
        {messages.length === 0 && <p className="card-panel text-slate-500">No messages yet.</p>}
        {messages.map((m) => (
          <div key={m.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <strong className="text-slate-900">{m.name || "Anonymous"}</strong>
              <span className="text-xs text-slate-400">{new Date(m.createdAt).toLocaleString("en-GB")}</span>
            </div>
            <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-sm text-slate-500">
              {m.email ? <span>✉️ {m.email}</span> : null}
              {m.phone ? <span>📞 {m.phone}</span> : null}
              {m.subject ? <span>🏷 {m.subject}</span> : null}
            </div>
            {m.message ? <p className="mt-2 text-sm leading-relaxed text-slate-700">{m.message}</p> : null}
            <div className="mt-2"><button onClick={() => remove(m.id)} className="rounded-full bg-rose-100 px-3 py-1 text-xs font-bold text-rose-700">Delete</button></div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* -------------------------------- settings -------------------------------- */

function SettingsEditor() {
  const { data, save } = useStore();
  const [s, setS] = useState(data.settings);
  const [importMsg, setImportMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const handleImport = async (file?: File) => {
    if (!file) return;
    try {
      const imported = await importContent(file);
      save(imported);
      setS(imported.settings);
      setImportMsg({ ok: true, text: "Content imported and applied." });
    } catch (e) {
      setImportMsg({ ok: false, text: e instanceof Error ? e.message : "Import failed." });
    }
  };

  return (
    <div>
      <div className="mb-5"><span className="text-xs font-black uppercase tracking-widest text-brand-600">Configuration</span><h1 className="text-2xl font-extrabold text-slate-900">Settings</h1></div>
      <div className="card-panel grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2"><Field label="Site Title"><input className={inputCls} value={s.siteTitle} onChange={(e) => setS({ ...s, siteTitle: e.target.value })} /></Field></div>
        <div className="sm:col-span-2"><Field label="Tagline"><input className={inputCls} value={s.tagline} onChange={(e) => setS({ ...s, tagline: e.target.value })} /></Field></div>
        <Field label="Homepage Article Limit"><input className={inputCls} type="number" value={s.homepageArticleLimit} onChange={(e) => setS({ ...s, homepageArticleLimit: Number(e.target.value) || 6 })} /></Field>
        <Field label="Contact Email"><input className={inputCls} type="email" value={s.contactEmail} onChange={(e) => setS({ ...s, contactEmail: e.target.value })} /></Field>
        <div className="sm:col-span-2">
          <span className={labelCls}>Site Logo</span>
          <ImageUploader label="Logo (used in header, hero, footer & favicon on reload)" value={s.logo} onChange={(url) => setS({ ...s, logo: url })} />
          <p className="mt-1.5 text-xs text-slate-400">Leave empty to use the bundled default logo.</p>
        </div>
        <div className="sm:col-span-2"><button onClick={() => { save({ ...data, settings: s }); }} className="rounded-lg bg-brand px-5 py-2 text-sm font-black text-white hover:bg-brand-700">Save Settings</button></div>
      </div>

      {/* Commit-based content: export to push via Git, or import a saved file. */}
      <div className="card-panel mt-5">
        <h2 className="text-lg font-extrabold text-slate-900">Content (Git workflow)</h2>
        <p className="mt-1 text-sm leading-relaxed text-slate-500">
          Export your content to a file, then commit it to GitHub so it becomes permanent on the live site
          (no storage limits). To resume editing later, import a previously saved file.
        </p>
        <div className="mt-3 flex flex-wrap gap-3">
          <button onClick={() => exportContent(data)} className="rounded-lg bg-slate-900 px-5 py-2 text-sm font-black text-white hover:bg-slate-700">⬇ Export content</button>
          <label className="inline-flex cursor-pointer items-center justify-center rounded-lg border border-slate-300 bg-white px-5 py-2 text-sm font-black text-slate-700 hover:bg-slate-50">
            ⬆ Import content
            <input type="file" accept="application/json,.json" className="hidden" onChange={(e) => handleImport(e.target.files?.[0])} />
          </label>
        </div>
        <ol className="mt-3 list-decimal space-y-1 pl-5 text-xs leading-relaxed text-slate-500">
          <li>Click <strong>Export content</strong> — downloads <code className="font-mono">site-content.json</code>.</li>
          <li>Save it in the repo, replacing <code className="font-mono">src/data/site-content.json</code>.</li>
          <li>Run <code className="font-mono">git add . && git commit -m "content" && git push</code>.</li>
          <li>Netlify rebuilds — your content is now permanent on the live site.</li>
        </ol>
        {importMsg ? (
          <p className={`mt-3 rounded-lg px-3 py-2 text-sm font-bold ${importMsg.ok ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>
            {importMsg.text}
          </p>
        ) : null}
      </div>
    </div>
  );
}

/* ----------------------------- article manager ---------------------------- */

function ArticleManager() {
  const { data, save } = useStore();
  const [editing, setEditing] = useState<Article | null>(null);

  const rows = data.articles.filter((a) => a.type !== "schedule").sort((a, b) => (a.startDate < b.startDate ? 1 : -1));

  const blank: Article = {
    id: "", type: "news", title: "", startDate: new Date().toISOString().slice(0, 10), endDate: "",
    category: "News", eventMode: "day", statusLabel: "Published", classMode: "",
    featureImage: "classes", galleryImages: [], homepageSummary: "", body: "", contentBlocks: [],
    featured: false, showOnHomepage: true, layout: "small", status: "published",
  };

  const persist = (article: Article) => {
    const exists = data.articles.some((a) => a.id === article.id);
    const next = exists ? data.articles.map((a) => (a.id === article.id ? article : a)) : [...data.articles, article];
    save({ ...data, articles: next });
    setEditing(null);
  };

  const remove = (id: string) => {
    if (!confirm("Delete this article?")) return;
    save({ ...data, articles: data.articles.filter((a) => a.id !== id) });
  };

  if (editing) return <ArticleBuilder article={editing} onSave={persist} onCancel={() => setEditing(null)} />;

  return (
    <div>
      <div className="mb-5 flex items-center justify-between gap-4">
        <div><span className="text-xs font-black uppercase tracking-widest text-brand-600">Content</span><h1 className="text-2xl font-extrabold text-slate-900">News / Events</h1></div>
        <button onClick={() => setEditing({ ...blank })} className="rounded-lg bg-brand px-4 py-2 text-sm font-black text-white hover:bg-brand-700">+ Add</button>
      </div>
      <div className="space-y-3">
        {rows.map((a) => (
          <div key={a.id} className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="min-w-0">
              <strong className="block truncate text-slate-900">{a.title || "(untitled)"}</strong>
              <span className="text-sm text-slate-500">{a.startDate} · {a.category}{a.status === "draft" ? " · Draft" : ""}</span>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {a.featured ? <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-700">Featured</span> : null}
              <button onClick={() => setEditing({ ...a })} className="rounded-full bg-sky-100 px-3 py-1 text-xs font-bold text-sky-800">Edit</button>
              <button onClick={() => remove(a.id)} className="rounded-full bg-rose-100 px-3 py-1 text-xs font-bold text-rose-700">Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* --------------------------- organisations manager ------------------------- */

function OrganisationsManager() {
  const [, setTick] = useState(0);
  const refresh = () => setTick((t) => t + 1);
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ name: "", contactName: "", contactMobile: "", contactEmail: "", address: "", logo: "" });

  useEffect(() => {
    const unsub = initOrgStore(refresh);
    return () => unsub();
  }, []);

  const orgs = getOrgs();

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { setError("Enter an organisation name."); return; }
    setBusy(true); setError("");
    try {
      await createOrganisation({ name: form.name, contactName: form.contactName, contactMobile: form.contactMobile, contactEmail: form.contactEmail, address: form.address, logo: form.logo });
      setForm({ name: "", contactName: "", contactMobile: "", contactEmail: "", address: "", logo: "" });
      setAdding(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create organisation.");
    } finally { setBusy(false); }
  };

  const approve = async (reqId: string) => {
    const org = await createOrgFromRequest(reqId);
    if (org) alert(`Organisation "${org.name}" created.`);
    refresh();
  };

  return (
    <div>
      <div className="mb-5 flex items-center justify-between gap-4">
        <div><span className="text-xs font-black uppercase tracking-widest text-brand-600">Organisations</span><h1 className="text-2xl font-extrabold text-slate-900">Organisations</h1></div>
        <button onClick={() => setAdding((a) => !a)} className="rounded-lg bg-brand px-4 py-2 text-sm font-black text-white hover:bg-brand-700">{adding ? "Close" : "+ Add Organisation"}</button>
      </div>

      {adding ? (
        <form onSubmit={add} className="card-panel mb-5 grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2"><Field label="Organisation Name"><input className={inputCls} value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. Nepalese Society of London" /></Field></div>
          <div className="sm:col-span-2"><span className={labelCls}>Logo</span><ImageUploader label="Organisation logo" value={form.logo} onChange={(url) => setForm((f) => ({ ...f, logo: url }))} /></div>
          <Field label="Contact Person"><input className={inputCls} value={form.contactName} onChange={(e) => setForm((f) => ({ ...f, contactName: e.target.value }))} /></Field>
          <Field label="Mobile"><input className={inputCls} value={form.contactMobile} onChange={(e) => setForm((f) => ({ ...f, contactMobile: e.target.value }))} /></Field>
          <Field label="Email"><input className={inputCls} type="email" value={form.contactEmail} onChange={(e) => setForm((f) => ({ ...f, contactEmail: e.target.value }))} /></Field>
          <Field label="Address"><input className={inputCls} value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} /></Field>
          {error ? <p className="sm:col-span-2 text-sm font-bold text-rose-600">{error}</p> : null}
          <div className="sm:col-span-2"><button type="submit" disabled={busy} className="rounded-lg bg-brand px-5 py-2 text-sm font-black text-white hover:bg-brand-700 disabled:opacity-60">{busy ? "Creating…" : "Create Organisation"}</button></div>
        </form>
      ) : null}

      {/* Access requests */}
      {orgs.requests.length > 0 ? (
        <div className="mb-5">
          <h2 className="mb-2 text-sm font-black uppercase text-slate-500">Access Requests ({orgs.requests.length})</h2>
          <div className="space-y-3">
            {orgs.requests.map((r) => (
              <div key={r.id} className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                <div className="flex items-center justify-between gap-2"><strong className="text-slate-900">{r.orgName}</strong><span className="text-xs text-slate-400">{new Date(r.createdAt).toLocaleDateString("en-GB")}</span></div>
                <p className="mt-1 text-sm text-slate-600">{r.contactName} · {r.contactMobile} · {r.contactEmail}</p>
                {r.address ? <p className="text-sm text-slate-500">{r.address}</p> : null}
                {r.message ? <p className="mt-1 text-sm italic text-slate-500">"{r.message}"</p> : null}
                <div className="mt-2 flex gap-2">
                  <button onClick={() => approve(r.id)} className="rounded-lg bg-brand px-3 py-1.5 text-xs font-black text-white hover:bg-brand-700">Approve &amp; create</button>
                  <button onClick={() => deleteAccessRequest(r.id)} className="rounded-lg bg-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-300">Decline</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {/* Organisations list */}
      <div className="space-y-3">
        {orgs.organisations.length === 0 && <p className="card-panel text-slate-500">No organisations yet.</p>}
        {orgs.organisations.map((o) => {
          const teacherCount = getTeacherDoc().accounts.filter((t) => t.orgId === o.id).length;
          const studentCount = getSchool().students.filter((s) => s.orgId === o.id).length;
          const expired = o.subscriptionEnd ? new Date(o.subscriptionEnd) < new Date() : !o.subscriptionStart;
          const subEnd = o.subscriptionEnd ? new Date(o.subscriptionEnd).toLocaleDateString("en-GB") : "—";
          return (
            <div key={o.id} className={`rounded-xl border p-4 shadow-sm ${expired ? "border-rose-200 bg-rose-50/30" : "border-slate-200 bg-white"}`}>
              <div className="flex flex-wrap items-center gap-4">
                {o.logo ? <img src={o.logo} alt="" className="h-12 w-12 shrink-0 rounded-lg object-cover" /> : <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-2xl">🏢</span>}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2"><strong className="truncate text-slate-900">{o.name}</strong>{o.status === "suspended" ? <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[0.65rem] font-black text-rose-600">DISABLED</span> : expired ? <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[0.65rem] font-black text-rose-600">EXPIRED</span> : o.subscriptionEnd ? <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[0.65rem] font-black text-emerald-600">ACTIVE</span> : <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[0.65rem] font-black text-amber-600">NO SUB</span>}</div>
                  <span className="text-sm text-slate-500">{o.contactName} · {o.contactEmail} · {teacherCount}t/{studentCount}s{o.subscriptionEnd ? ` · Until: ${subEnd}` : ""}</span>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  <button onClick={async () => { const updated = await renewOrganisation(o.id); if (updated) { alert(`Renewed until ${new Date(updated.subscriptionEnd!).toLocaleDateString("en-GB")}`); } setTick((t) => t + 1); }} className="rounded-full bg-emerald-600 px-3 py-1 text-xs font-black text-white hover:bg-emerald-700">🔄 Renew 1yr</button>
                  <button onClick={async () => { await updateOrganisation(o.id, { status: o.status === "suspended" ? "active" : "suspended" }); setTick((t) => t + 1); }} className={`rounded-full px-3 py-1 text-xs font-bold ${o.status === "suspended" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>{o.status === "suspended" ? "Enable" : "Disable"}</button>
                  <button onClick={() => { if (confirm(`Delete organisation "${o.name}"?`)) { deleteOrganisation(o.id); setTick((t) => t + 1); } }} className="rounded-full bg-rose-100 px-3 py-1 text-xs font-bold text-rose-700 hover:bg-rose-200">Delete</button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ----------------------------- resources admin ---------------------------- */
// Admin can browse all resources globally, search them, and delete any.

function ResourcesAdmin() {
  const [, setTick] = useState(0);
  const refresh = () => setTick((t) => t + 1);
  const [search, setSearch] = useState("");
  useEffect(() => {
    const unsub = initSchoolStore(refresh);
    return () => unsub();
  }, []);

  const school = getSchool();
  const teachers = getTeacherDoc().accounts;
  const teacherName = (id: string) => teachers.find((t) => t.id === id)?.name || "—";

  const filtered = search.trim()
    ? school.resources.filter((r) => (r.title || "").toLowerCase().includes(search.toLowerCase().trim()))
    : school.resources;

  const remove = async (id: string) => {
    if (!confirm("Delete this resource globally? It will be removed from all classes and homework.")) return;
    await deleteResource(id);
    refresh();
  };

  return (
    <div>
      <div className="mb-5"><span className="text-xs font-black uppercase tracking-widest text-brand-600">Resources</span><h1 className="text-2xl font-extrabold text-slate-900">All Resources</h1><p className="mt-1 text-sm text-slate-500">All teacher-created resources. Deleting removes them globally.</p></div>
      <input className={`${inputCls} mb-4`} placeholder="🔍 Search resources…" value={search} onChange={(e) => setSearch(e.target.value)} />
      <div className="space-y-3">
        {filtered.length === 0 && <p className="card-panel text-slate-500">{search.trim() ? "No resources match your search." : "No resources yet."}</p>}
        {filtered.map((r) => {
          const classNames = r.classIds.map((id) => school.classes.find((c) => c.id === id)?.name).filter(Boolean);
          return (
            <div key={r.id} className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="min-w-0">
                <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[0.65rem] font-black uppercase text-brand">{r.type}</span>
                <strong className="mt-1 block truncate text-slate-900">{r.title || "(untitled)"}</strong>
                <span className="text-sm text-slate-500">By {teacherName(r.teacherId)} · {r.blocks?.length || 0} blocks{classNames.length ? ` · Assigned: ${classNames.join(", ")}` : ""}</span>
              </div>
              <button onClick={() => remove(r.id)} className="shrink-0 rounded-full bg-rose-100 px-3 py-1 text-xs font-bold text-rose-700 hover:bg-rose-200">Delete</button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ------------------------------ classes manager --------------------------- */

function ClassesManager() {
  const [, setTick] = useState(0);
  const refresh = () => setTick((t) => t + 1);
  const [name, setName] = useState("");
  const [teacherId, setTeacherId] = useState("");
  const [orgId, setOrgId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const unsub1 = initSchoolStore(refresh);
    const unsub2 = initOrgStore(refresh);
    const unsub3 = initTeacherStore(refresh);
    return () => { unsub1(); unsub2(); unsub3(); };
  }, []);

  const school = getSchool();
  const teachers = getTeacherDoc().accounts;
  const orgs = getOrgs().organisations;

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { setError("Enter a class name."); return; }
    if (!orgId) { setError("Please select an organisation."); return; }
    setBusy(true); setError("");
    try {
      await createClass(name, teacherId, orgId);
      setName(""); setTeacherId(""); setOrgId("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create class.");
    } finally { setBusy(false); }
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this class? Students in it will become unassigned.")) return;
    await deleteClass(id);
  };

  const teacherName = (id: string) => teachers.find((t) => t.id === id)?.name || "—";

  return (
    <div>
      <div className="mb-5"><span className="text-xs font-black uppercase tracking-widest text-brand-600">School</span><h1 className="text-2xl font-extrabold text-slate-900">Classes</h1></div>
      <form onSubmit={add} className="card-panel mb-5 grid gap-4 sm:grid-cols-4">
        <Field label="Organisation"><select className={inputCls} value={orgId} onChange={(e) => setOrgId(e.target.value)}><option value="">— Select —</option>{orgs.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}</select></Field>
        <Field label="Class Name"><input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="Class 3 — Beginners" /></Field>
        <Field label="Assign Teacher"><select className={inputCls} value={teacherId} onChange={(e) => setTeacherId(e.target.value)}><option value="">— None —</option>{teachers.filter((t) => !orgId || t.orgId === orgId).map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select></Field>
        <div className="flex items-end gap-2">
          <button type="submit" disabled={busy} className="rounded-lg bg-brand px-5 py-2 text-sm font-black text-white hover:bg-brand-700 disabled:opacity-60">{busy ? "…" : "+ Add Class"}</button>
          {school.classes.length > 0 ? (
            <button type="button" onClick={() => { if (confirm("⚠️ MASTER RESET — This will permanently delete ALL homework, submissions, attendance and progress for EVERY class. Students, classes and resources are kept. This CANNOT be undone. Continue?")) { void resetAllClasses().then(() => { alert("All class data has been reset."); refresh(); }); } }} className="rounded-lg bg-rose-600 px-4 py-2 text-xs font-black text-white hover:bg-rose-700">🔄 Reset ALL Classes</button>
          ) : null}
        </div>
        {error ? <p className="sm:col-span-3 text-sm font-bold text-rose-600">{error}</p> : null}
      </form>
      <div className="space-y-3">
        {school.classes.length === 0 && <p className="card-panel text-slate-500">No classes yet.</p>}
        {school.classes.map((c) => {
          const count = school.students.filter((s) => s.classId === c.id).length;
          const disabled = c.status === "disabled";
          return (
            <div key={c.id} className={`flex items-center justify-between gap-4 rounded-xl border p-4 shadow-sm ${disabled ? "border-rose-200 bg-rose-50/30" : "border-slate-200 bg-white"}`}>
              <div className="min-w-0">
                <div className="flex items-center gap-2"><strong className="truncate text-slate-900">{c.name}</strong>{disabled ? <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[0.65rem] font-black text-rose-600">DISABLED</span> : null}</div>
                <span className="text-sm text-slate-500">{teacherName(c.teacherId)} · {count} students</span>
              </div>
              <div className="flex shrink-0 gap-2">
                <button onClick={async () => { await setClassStatus(c.id, disabled ? "active" : "disabled"); refresh(); }} className={`rounded-full px-3 py-1 text-xs font-bold ${disabled ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>{disabled ? "Enable" : "Disable"}</button>
                <button onClick={() => { if (confirm(`Reset ALL records for "${c.name}"?\n\nThis deletes:\n• All homework & submissions\n• All attendance records\n• All progress scores\n\nStudents and the class itself are kept.`)) { void resetClassData(c.id).then(() => { alert(`"${c.name}" has been reset.`); refresh(); }); } }} className="rounded-full bg-sky-100 px-3 py-1 text-xs font-bold text-sky-800">🔄 Reset</button>
                <button onClick={() => remove(c.id)} className="rounded-full bg-rose-100 px-3 py-1 text-xs font-bold text-rose-700">Delete</button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ----------------------------- students manager --------------------------- */

function StudentsManager() {
  const [, setTick] = useState(0);
  const refresh = () => setTick((t) => t + 1);
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");
  const [form, setForm] = useState({ name: "", email: "", password: "", classId: "", parentName: "", parentEmail: "", orgId: "" });
  const [pwStudent, setPwStudent] = useState<{ id: string; name: string } | null>(null);
  const [newStudentPw, setNewStudentPw] = useState("");

  useEffect(() => {
    const unsub = initSchoolStore(refresh);
    return () => unsub();
  }, []);

  const school = getSchool();
  const className = (id: string) => school.classes.find((c) => c.id === id)?.name || "—";

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    const { name, email, password, classId, parentName, parentEmail, orgId } = form;
    if (!name || !email || !password || !parentEmail) { setError("Please complete all fields."); return; }
    if (!orgId) { setError("Please select an organisation."); return; }
    setBusy(true); setError(""); setMsg("");
    try {
      const student = await createStudent(name, email, password, classId, parentName, parentEmail, orgId);
      const cls = className(classId);
      const emailed = await sendStudentLoginEmail({ parentName, parentEmail, studentName: student.name, studentEmail: student.email, password, className: cls });
      setMsg(emailed ? `Student added — login details emailed to ${parentEmail}.` : `Student added. Email delivery not configured, so share login details manually.`);
      setForm({ name: "", email: "", password: "", classId: "", parentName: "", parentEmail: "", orgId: "" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add student.");
    } finally { setBusy(false); }
  };

  const move = async (id: string, classId: string) => {
    await updateStudent(id, { classId });
    refresh();
  };

  return (
    <div>
      <div className="mb-5 flex items-center justify-between gap-4">
        <div><span className="text-xs font-black uppercase tracking-widest text-brand-600">School</span><h1 className="text-2xl font-extrabold text-slate-900">Students</h1></div>
        <button onClick={() => { setAdding((a) => !a); setError(""); setMsg(""); }} className="rounded-lg bg-brand px-4 py-2 text-sm font-black text-white hover:bg-brand-700">{adding ? "Close" : "+ Add Student"}</button>
      </div>

      {adding ? (
        <form onSubmit={add} className="card-panel mb-5 grid gap-4 sm:grid-cols-2">
          <Field label="Organisation"><select className={inputCls} value={form.orgId} onChange={(e) => setForm((f) => ({ ...f, orgId: e.target.value }))}><option value="">— Select —</option>{getOrgs().organisations.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}</select></Field>
          <Field label="Class (must match org)"><select className={inputCls} value={form.classId} onChange={(e) => setForm((f) => ({ ...f, classId: e.target.value }))}><option value="">— Unassigned —</option>{school.classes.filter((c) => !form.orgId || c.orgId === form.orgId).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></Field>
          <Field label="Student Name"><input className={inputCls} value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} /></Field>
          <Field label="Student Email (login)"><input className={inputCls} type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} /></Field>
          <Field label="Password"><input className={inputCls} type="password" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} /></Field>
          <Field label="Parent Name"><input className={inputCls} value={form.parentName} onChange={(e) => setForm((f) => ({ ...f, parentName: e.target.value }))} /></Field>
          <Field label="Parent Email"><input className={inputCls} type="email" value={form.parentEmail} onChange={(e) => setForm((f) => ({ ...f, parentEmail: e.target.value }))} /></Field>
          <div className="sm:col-span-2">{error ? <p className="text-sm font-bold text-rose-600">{error}</p> : msg ? <p className="text-sm font-bold text-emerald-700">{msg}</p> : null}</div>
          <div className="sm:col-span-2"><button type="submit" disabled={busy} className="rounded-lg bg-brand px-5 py-2 text-sm font-black text-white hover:bg-brand-700 disabled:opacity-60">{busy ? "Adding…" : "Add Student"}</button></div>
        </form>
      ) : null}

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs font-black uppercase text-slate-500">
            <tr><th className="px-4 py-3">Student Name</th><th className="px-4 py-3">Parent</th><th className="px-4 py-3">Class</th><th className="px-4 py-3"></th></tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {school.students.length === 0 ? (
              <tr><td colSpan={4} className="px-4 py-6 text-center text-slate-400">No students yet.</td></tr>
            ) : school.students.map((s) => (
              <tr key={s.id}>
                <td className="px-4 py-3"><div className="font-bold text-slate-900">{s.name}</div><div className="text-xs text-slate-400">{s.email}</div></td>
                <td className="px-4 py-3"><div className="text-slate-700">{s.parentName || "—"}</div><div className="text-xs text-slate-400">{s.parentEmail}</div></td>
                <td className="px-4 py-3">
                  <select className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs font-bold text-slate-700" value={s.classId} onChange={(e) => move(s.id, e.target.value)}>
                    <option value="">— Unassigned —</option>
                    {school.classes.filter((c) => c.orgId === s.orgId).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex flex-wrap justify-end gap-1">
                    <button onClick={() => { setPwStudent({ id: s.id, name: s.name }); setNewStudentPw(""); }} className="rounded-full bg-sky-100 px-2.5 py-1 text-xs font-bold text-sky-800">🔑</button>
                    <button onClick={async () => { await setStudentStatus(s.id, s.status === "disabled" ? "active" : "disabled"); refresh(); }} className={`rounded-full px-2.5 py-1 text-xs font-bold ${s.status === "disabled" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>{s.status === "disabled" ? "Enable" : "Disable"}</button>
                    <button onClick={() => { if (confirm("Delete this student?")) { void deleteStudent(s.id); refresh(); } }} className="rounded-full bg-rose-100 px-2.5 py-1 text-xs font-bold text-rose-700">Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-xs text-slate-400">Changing the Class dropdown instantly moves the student to that class. 🔑 = Reset password.</p>
      {pwStudent ? (
        <div className="card-panel mt-4">
          <h3 className="mb-3 text-sm font-black uppercase text-slate-500">Change password — {pwStudent.name}</h3>
          <div className="flex flex-wrap gap-3">
            <input type="password" className={inputCls} placeholder="New password" value={newStudentPw} onChange={(e) => setNewStudentPw(e.target.value)} />
            <button onClick={async () => { if (!newStudentPw.trim()) { alert("Enter a password."); return; } await resetStudentPassword(pwStudent.id, newStudentPw); setPwStudent(null); alert("Password changed."); }} className="rounded-lg bg-brand px-5 py-2 text-sm font-black text-white hover:bg-brand-700">Save</button>
            <button onClick={() => setPwStudent(null)} className="rounded-lg bg-slate-200 px-5 py-2 text-sm font-black text-slate-700 hover:bg-slate-300">Cancel</button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

/* ------------------------------ teacher manager --------------------------- */
// Admin creates/removes teacher accounts and can browse each teacher's content.
// Created accounts log in at /teachers.

function TeacherManager() {
  const [, setTick] = useState(0);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [orgId, setOrgId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [viewing, setViewing] = useState<string | null>(null); // teacher id
  const [pwChange, setPwChange] = useState<{ id: string; name: string } | null>(null);
  const [newPw, setNewPw] = useState("");

  useEffect(() => {
    const unsub1 = initTeacherStore(() => setTick((t) => t + 1));
    const unsub2 = initOrgStore(() => setTick((t) => t + 1));
    return () => { unsub1(); unsub2(); };
  }, []);

  const accounts = getTeacherDoc().accounts;
  const orgs = getOrgs().organisations;
  const orgName = (id: string) => orgs.find((o) => o.id === id)?.name || "—";

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !password) {
      setError("Please fill in name, email and password.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await createTeacher(name, email, password, orgId);
      setName(""); setEmail(""); setPassword(""); setOrgId("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create teacher.");
    } finally {
      setBusy(false);
    }
  };

  // remove is no longer used — teachers are disabled, not deleted

  if (viewing) {
    const teacher = accounts.find((a) => a.id === viewing);
    const items = teacher ? getTeacherItems(viewing) : [];
    return (
      <div>
        <div className="mb-5 flex items-center justify-between gap-4">
          <div>
            <span className="text-xs font-black uppercase tracking-widest text-brand-600">Teachers</span>
            <h1 className="text-2xl font-extrabold text-slate-900">{teacher?.name}'s content</h1>
          </div>
          <button onClick={() => setViewing(null)} className="rounded-lg bg-slate-200 px-4 py-2 text-sm font-black text-slate-700 hover:bg-slate-300">← Back</button>
        </div>
        <div className="space-y-3">
          {items.length === 0 && <p className="card-panel text-slate-500">No content yet.</p>}
          {items.map((it) => (
            <div key={it.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[0.65rem] font-black uppercase text-slate-500">{it.type}</span>
              <strong className="mt-1 block text-slate-900">{it.title || "(untitled)"}</strong>
              <span className="text-sm text-slate-500">{it.blocks.length} blocks · {new Date(it.updatedAt || it.createdAt).toLocaleDateString("en-GB")}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-5"><span className="text-xs font-black uppercase tracking-widest text-brand-600">Teachers</span><h1 className="text-2xl font-extrabold text-slate-900">Teacher Accounts</h1><p className="mt-1 text-sm text-slate-500">Create accounts here. Teachers log in at <code className="font-mono">/teachers</code> and their content stays in their own profile.</p></div>

      <form onSubmit={add} className="card-panel mb-5 grid gap-4 sm:grid-cols-2">
        <Field label="Teacher Name"><input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="Rita Sharma" /></Field>
        <Field label="Email (login)"><input className={inputCls} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="rita@nlccuk.com" /></Field>
        <Field label="Password"><input className={inputCls} type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Set a password" /></Field>
        <Field label="Organisation"><select className={inputCls} value={orgId} onChange={(e) => setOrgId(e.target.value)}><option value="">— Select —</option>{orgs.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}</select></Field>
        <div className="flex items-end">{error ? <p className="text-sm font-bold text-rose-600">{error}</p> : null}</div>
        <div className="sm:col-span-2"><button type="submit" disabled={busy} className="rounded-lg bg-brand px-5 py-2 text-sm font-black text-white hover:bg-brand-700 disabled:opacity-60">{busy ? "Creating…" : "+ Create teacher account"}</button></div>
      </form>

      <div className="space-y-3">
        {accounts.length === 0 && <p className="card-panel text-slate-500">No teacher accounts yet.</p>}
        {accounts.map((a) => {
          const count = getTeacherItems(a.id).length;
          const disabled = a.status === "disabled";
          return (
            <div key={a.id} className={`flex items-center justify-between gap-4 rounded-xl border p-4 shadow-sm ${disabled ? "border-rose-200 bg-rose-50/40" : "border-slate-200 bg-white"}`}>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <strong className="truncate text-slate-900">{a.name}</strong>
                  {disabled ? <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[0.65rem] font-black text-rose-600">DISABLED</span> : null}
                </div>
                <span className="text-sm text-slate-500">{a.email} · {orgName(a.orgId || "")} · {count} content {count === 1 ? "item" : "items"}</span>
              </div>
              <div className="flex shrink-0 flex-wrap gap-2">
                <button onClick={() => setViewing(a.id)} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">View content</button>
                <button onClick={() => { setPwChange({ id: a.id, name: a.name }); setNewPw(""); }} className="rounded-full bg-sky-100 px-3 py-1 text-xs font-bold text-sky-800">🔑 Password</button>
                <button onClick={async () => { await setTeacherStatus(a.id, disabled ? "active" : "disabled"); setTick((t) => t + 1); }} className={`rounded-full px-3 py-1 text-xs font-bold ${disabled ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>{disabled ? "Enable" : "Disable"}</button>
              </div>
            </div>
          );
        })}
        {/* Change password dialog */}
        {pwChange ? (
          <div className="card-panel mt-4">
            <h3 className="mb-3 text-sm font-black uppercase text-slate-500">Change password — {pwChange.name}</h3>
            <div className="flex flex-wrap gap-3">
              <input type="password" className={inputCls} placeholder="New password" value={newPw} onChange={(e) => setNewPw(e.target.value)} />
              <button onClick={async () => { if (!newPw.trim()) { alert("Enter a password."); return; } await resetTeacherPassword(pwChange.id, newPw); setPwChange(null); alert("Password changed."); }} className="rounded-lg bg-brand px-5 py-2 text-sm font-black text-white hover:bg-brand-700">Save</button>
              <button onClick={() => setPwChange(null)} className="rounded-lg bg-slate-200 px-5 py-2 text-sm font-black text-slate-700 hover:bg-slate-300">Cancel</button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

/* -------------------------------- dashboard ------------------------------- */

function Dashboard({ go }: { go: (tab: string) => void }) {
  const { data } = useStore();
  const stats = [
    { label: "Articles", value: data.articles.filter((a) => a.type !== "schedule").length, tab: "articles" },
    { label: "Schedule", value: data.weeklySchedule.length, tab: "schedule" },
    { label: "Annual Programmes", value: data.annualProgrammes.length, tab: "annual" },
    { label: "Hindu Dates", value: data.hinduDates.length, tab: "hindu" },
    { label: "Committee", value: data.committeeMembers.length, tab: "committee" },
    { label: "Messages", value: data.contactMessages.length, tab: "messages" },
    { label: "Slides", value: data.slides.length, tab: "slider" },
  ];
  return (
    <div>
      <div className="mb-5"><span className="text-xs font-black uppercase tracking-widest text-brand-600">Overview</span><h1 className="text-2xl font-extrabold text-slate-900">Dashboard</h1></div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {stats.map((s) => (
          <button key={s.label} onClick={() => go(s.tab)} className="rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
            <strong className="block text-3xl font-black text-brand"><Counter to={s.value} /></strong>
            <span className="text-sm font-bold text-slate-500">{s.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

/* --------------------------------- shell ---------------------------------- */

const TABS = [
  { id: "dashboard", label: "Dashboard", icon: "📊" },
  { id: "articles", label: "News / Events", icon: "📰" },
  { id: "schedule", label: "Weekly Schedule", icon: "📅" },
  { id: "annual", label: "Annual Programmes", icon: "🎉" },
  { id: "hindu", label: "Hindu Calendar", icon: "🪔" },
  { id: "slider", label: "Photo Slider", icon: "🖼" },
  { id: "committee", label: "Committee", icon: "👥" },
  { id: "messages", label: "Contact Messages", icon: "✉️" },
  { id: "teachers", label: "Teachers", icon: "🍎" },
  { id: "classes", label: "Classes", icon: "🏫" },
  { id: "students", label: "Students", icon: "🎓" },
  { id: "resources", label: "Resources", icon: "📚" },
  { id: "orgs", label: "Organisations", icon: "🏢" },
  { id: "settings", label: "Settings", icon: "⚙️" },
];

export default function Admin() {
  const { user, loading, signOut } = useGoogleAuth();
  const { persistError, clearPersistError } = useStore();
  const logo = useLogo();
  const [tab, setTab] = useState("dashboard");
  const [, setTick] = useState(0);

  useEffect(() => {
    const unsub = initAdminStore(() => setTick((t) => t + 1));
    return () => unsub();
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-900">
        <span className="text-sm font-bold text-white/70">Loading admin…</span>
      </div>
    );
  }

  // Check if the Google-authenticated user is an authorised admin
  const adminEmails = getAdminEmails();
  const isAdmin = user && adminEmails.some((e) => e.toLowerCase() === user.email.toLowerCase());

  if (!user || !isAdmin) return <LoginScreen />;

  const go = (next: string) => setTab(next);

  const content = (() => {
    switch (tab) {
      case "dashboard": return <Dashboard go={go} />;
      case "articles": return <ArticleManager />;
      case "committee": return <CommitteeEditor />;
      case "messages": return <MessagesView />;
      case "teachers": return <TeacherManager />;
      case "classes": return <ClassesManager />;
      case "students": return <StudentsManager />;
      case "resources": return <ResourcesAdmin />;
      case "orgs": return <OrganisationsManager />;
      case "settings": return <SettingsEditor />;
      default:
        return COLLECTION_CONFIG[tab] ? <CollectionEditor tab={tab} /> : <Dashboard go={go} />;
    }
  })();

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 shadow-lg">
        <div className="mx-auto flex w-full max-w-[1320px] items-center gap-3 px-4 py-3">
          <img src={logo} alt="NLCC" className="h-10 w-10 rounded-lg bg-white/10 p-0.5 ring-1 ring-white/20" />
          <div className="leading-tight">
            <span className="block text-sm font-black text-white">NLCC Admin</span>
            <span className="block text-[0.7rem] text-white/60">Content management</span>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <span className="hidden text-xs font-semibold text-white/60 sm:inline">{user.email}</span>
            <a href="/" className="rounded-lg bg-white/10 px-3 py-1.5 text-xs font-bold text-white ring-1 ring-white/20 transition hover:bg-white/20">View Website</a>
            <button onClick={() => signOut()} className="rounded-lg bg-brand px-3 py-1.5 text-xs font-bold text-white transition hover:bg-brand-700">Logout</button>
          </div>
        </div>
      </header>

      <div className="mx-auto grid w-full max-w-[1320px] gap-0 lg:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="border-b border-slate-200 bg-slate-900 p-4 lg:sticky lg:top-[68px] lg:h-[calc(100vh-68px)] lg:overflow-auto">
          <nav className="flex gap-2 overflow-x-auto lg:flex-col lg:overflow-visible">
            {TABS.map((t) => (
              <button key={t.id} onClick={() => go(t.id)} className={`flex shrink-0 items-center gap-2.5 rounded-lg px-3.5 py-2.5 text-sm font-bold transition lg:w-full ${tab === t.id ? "bg-brand text-white" : "text-slate-300 hover:bg-white/10 hover:text-white"}`}>
                <span>{t.icon}</span> {t.label}
              </button>
            ))}
          </nav>
        </aside>

        <main className="min-w-0 bg-slate-100 p-4 sm:p-7">
          {persistError ? (
            <div className="mb-4 flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-amber-800">
              <span className="text-lg leading-none">⚠️</span>
              <div className="text-sm leading-relaxed">
                <strong className="font-black">Heads up — this change wasn't saved.</strong>
                <p className="mt-0.5">{persistError}</p>
              </div>
              <button
                type="button"
                onClick={clearPersistError}
                className="ml-auto shrink-0 text-xs font-bold text-amber-700 hover:underline"
              >
                Dismiss
              </button>
            </div>
          ) : null}
          {content}
        </main>
      </div>
    </div>
  );
}
