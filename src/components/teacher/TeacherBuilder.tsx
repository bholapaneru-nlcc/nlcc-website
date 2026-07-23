import { useState } from "react";
import { RichText } from "../RichText";
import { ImageUploader } from "../ImageUploader";
import { uploadFile } from "../../lib/upload";
import { SHAPE_OPTIONS, Shape, type ShapeKind } from "./Shape";
import { TeacherRenderer, type TeacherBlock } from "./TeacherRenderer";
import type { ContentType, TeacherItem } from "../../lib/teacherStore";

/* ----------------------------- shared styles ------------------------------ */

const labelCls = "block text-[0.7rem] font-black uppercase tracking-wide text-slate-500 mb-1";
const inputCls =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/25";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className={labelCls}>{label}</span>
      {children}
    </label>
  );
}

function AlignField({ value, onChange }: { value?: string; onChange: (v: string) => void }) {
  return (
    <Field label="Alignment">
      <select className={inputCls} value={value || "left"} onChange={(e) => onChange(e.target.value)}>
        <option value="left">Left</option>
        <option value="centre">Centre</option>
        <option value="right">Right</option>
        <option value="justify">Justify</option>
      </select>
    </Field>
  );
}

/* ------------------------------- block list ------------------------------- */

interface PaletteEntry {
  type: string;
  label: string;
  icon: string;
  make: () => TeacherBlock;
}

const BLOCK_TYPES: PaletteEntry[] = [
  { type: "heading", label: "Heading", icon: "H", make: () => ({ type: "heading", level: 2, text: "", align: "left" }) },
  { type: "paragraph", label: "Paragraph", icon: "¶", make: () => ({ type: "paragraph", text: "", fontSize: "16px", align: "left" }) },
  { type: "list", label: "Bullet List", icon: "•", make: () => ({ type: "list", items: [""] }) },
  { type: "image", label: "Image", icon: "🖼️", make: () => ({ type: "image", src: "", caption: "" }) },
  { type: "pdf", label: "PDF Document", icon: "📄", make: () => ({ type: "pdf", src: "", caption: "" }) },
  { type: "image-text", label: "Image + Text", icon: "🪧", make: () => ({ type: "image-text", src: "", text: "", imageSide: "left", align: "left" }) },
  { type: "wrap-image", label: "Text Around Image", icon: "🔁", make: () => ({ type: "wrap-image", src: "", text: "", imageSide: "left", align: "left" }) },
  { type: "table", label: "Table", icon: "▦", make: () => ({ type: "table", text: "" }) },
  { type: "columns", label: "Columns", icon: "▭", make: () => ({ type: "columns", cols: 2, items: ["", ""], align: "left" }) },
  { type: "question", label: "Multiple Choice", icon: "❓", make: () => ({ type: "question", question: "", options: ["", ""], correctIndex: 0 }) },
  { type: "quote", label: "Quote / Highlight", icon: "❝", make: () => ({ type: "quote", text: "", align: "left" }) },
  { type: "shape", label: "Shape + Text", icon: "⬛", make: () => ({ type: "shape", position: "centre", shapeWidth: 80, shapeHeight: 80, shapeGap: 8, shapes: [{ kind: "square", fillColor: "#ffffff", outlineColor: "#000000", filled: false, text: "", textColor: "#000000" }] }) },
  { type: "button", label: "Button / Link", icon: "🔗", make: () => ({ type: "button", text: "", link: "" }) },
  { type: "youtube", label: "YouTube Video", icon: "▶️", make: () => ({ type: "youtube", youtubeId: "" }) },
  { type: "wrap-youtube", label: "Text Around YouTube", icon: "🎬", make: () => ({ type: "wrap-youtube", youtubeId: "", text: "", youtubeWidth: 400, imageSide: "left" }) },
  { type: "divider", label: "Divider", icon: "—", make: () => ({ type: "divider" }) },
];

/* ------------------------------ pdf uploader ------------------------------ */

function PdfUploader({ value, onChange }: { value?: string; onChange: (url: string) => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const handleFile = async (file?: File) => {
    if (!file) return;
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      setError("Please choose a PDF file.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const res = await uploadFile(file);
      onChange(res.url);
    } catch {
      setError("Upload failed. Try a smaller file.");
    }
    setBusy(false);
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3">
      <div className="flex flex-wrap items-center gap-3">
        <label className="inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-xs font-black text-white transition hover:bg-brand-700">
          {busy ? "Uploading…" : "📄 Upload PDF"}
          <input type="file" accept="application/pdf,.pdf" className="hidden" disabled={busy} onChange={(e) => handleFile(e.target.files?.[0])} />
        </label>
        {value ? <span className="text-xs font-bold text-emerald-600">✓ PDF uploaded</span> : null}
      </div>
      {error ? <p className="mt-1.5 text-xs font-bold text-rose-600">{error}</p> : null}
      {value ? (
        <div className="mt-3">
          <embed src={value} type="application/pdf" className="h-[20cm] w-full rounded-lg border border-slate-200" />
          <div className="mt-1 flex gap-2">
            <a href={value} download="document.pdf" target="_blank" rel="noreferrer" className="text-xs font-bold text-brand hover:underline">⬇ Download</a>
            <button type="button" onClick={() => onChange("")} className="text-xs font-bold text-rose-500 hover:underline">Remove</button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

/* --------------------------- single block editor -------------------------- */

function BlockEditor({
  block,
  index,
  total,
  onChange,
  onMove,
  onRemove,
}: {
  block: TeacherBlock;
  index: number;
  total: number;
  onChange: (next: TeacherBlock) => void;
  onMove: (dir: -1 | 1) => void;
  onRemove: () => void;
}) {
  const set = (patch: Partial<TeacherBlock>) => onChange({ ...block, ...patch });
  const t = block.type;

  // Shape helpers — manage the array of individually-customizable shapes
  const getShapes = () => {
    if (Array.isArray(block.shapes) && block.shapes.length) return block.shapes;
    // Migrate old single-shape format
    return [{ kind: block.shape || "square", fillColor: block.shapeColor || "#d71920", outlineColor: "#000000", filled: true, text: "" }];
  };
  const updateShape = (idx: number, patch: Record<string, unknown>) => {
    const shapes = getShapes().map((s, i) => (i === idx ? { ...s, ...patch } : s));
    set({ shapes });
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-3">
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black uppercase tracking-wide text-slate-600">
          {index + 1}. {BLOCK_TYPES.find((b) => b.type === t)?.label || t}
        </span>
        <div className="flex flex-wrap gap-1.5">
          <button type="button" disabled={index === 0} onClick={() => onMove(-1)} className="rounded-full bg-sky-100 px-2.5 py-1 text-xs font-bold text-sky-800 disabled:opacity-40">↑</button>
          <button type="button" disabled={index === total - 1} onClick={() => onMove(1)} className="rounded-full bg-sky-100 px-2.5 py-1 text-xs font-bold text-sky-800 disabled:opacity-40">↓</button>
          <button type="button" onClick={onRemove} className="rounded-full bg-rose-100 px-2.5 py-1 text-xs font-bold text-rose-700">Delete</button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {t === "heading" && (
          <>
            <div className="sm:col-span-2"><Field label="Text"><input className={inputCls} value={block.text} onChange={(e) => set({ text: e.target.value })} /></Field></div>
            <Field label="Level"><select className={inputCls} value={block.level} onChange={(e) => set({ level: Number(e.target.value) })}><option value={1}>H1</option><option value={2}>H2</option><option value={3}>H3</option><option value={4}>H4</option></select></Field>
            <AlignField value={block.align} onChange={(v) => set({ align: v })} />
            <Field label="Colour"><input className={inputCls} type="color" value={block.color || "#0f172a"} onChange={(e) => set({ color: e.target.value })} /></Field>
          </>
        )}

        {t === "paragraph" && (
          <>
            <div className="sm:col-span-2">
              <span className={labelCls}>Text (select words to format)</span>
              <RichText value={block.text || ""} onChange={(html) => set({ text: html })} placeholder="Write the paragraph…" minHeight={90} />
            </div>
            <Field label="Font Size"><input className={inputCls} value={block.fontSize} onChange={(e) => set({ fontSize: e.target.value })} placeholder="16px" /></Field>
            <AlignField value={block.align} onChange={(v) => set({ align: v })} />
          </>
        )}

        {t === "list" && (
          <div className="sm:col-span-2">
            <span className={labelCls}>Items (one per line)</span>
            <textarea className={`${inputCls} min-h-[90px]`} value={(block.items || []).join("\n")} onChange={(e) => set({ items: e.target.value.split("\n") })} placeholder={"First point\nSecond point"} />
          </div>
        )}

        {t === "image" && (
          <>
            <div className="sm:col-span-2"><ImageUploader label="Image" value={block.src} onChange={(url) => set({ src: url })} /></div>
            <div className="sm:col-span-2"><Field label="Caption"><input className={inputCls} value={block.caption} onChange={(e) => set({ caption: e.target.value })} /></Field></div>
          </>
        )}

        {t === "table" && (
          <div className="sm:col-span-2">
            <Field label="Table (rows separated by line breaks, cells by |)">
              <textarea className={`${inputCls} min-h-[90px] font-mono`} value={block.text} onChange={(e) => set({ text: e.target.value })} placeholder={"Day|Topic\nMonday|Vowels"} />
            </Field>
          </div>
        )}

        {t === "image-text" && (
          <>
            <div className="sm:col-span-2"><ImageUploader label="Image" value={block.src} onChange={(url) => set({ src: url })} /></div>
            <div className="sm:col-span-2"><span className={labelCls}>Text</span><RichText value={block.text || ""} onChange={(html) => set({ text: html })} placeholder="Text beside the image…" minHeight={80} /></div>
            <Field label="Image Side"><select className={inputCls} value={block.imageSide} onChange={(e) => set({ imageSide: e.target.value })}><option value="left">Left</option><option value="right">Right</option></select></Field>
            <AlignField value={block.align} onChange={(v) => set({ align: v })} />
          </>
        )}

        {t === "wrap-image" && (
          <>
            <div className="sm:col-span-2"><ImageUploader label="Image" value={block.src} onChange={(url) => set({ src: url })} /></div>
            <div className="sm:col-span-2"><span className={labelCls}>Text (wraps around the image)</span><RichText value={block.text || ""} onChange={(html) => set({ text: html })} placeholder="Text that wraps around the image…" minHeight={80} /></div>
            <Field label="Image Side"><select className={inputCls} value={block.imageSide} onChange={(e) => set({ imageSide: e.target.value })}><option value="left">Left</option><option value="right">Right</option></select></Field>
            <Field label="Image Width (px) — drag to resize"><input className={inputCls} type="range" min={60} max={600} step={10} value={block.imgWidth || 240} onChange={(e) => set({ imgWidth: Number(e.target.value) })} /></Field>
            {/* Live preview with draggable image */}
            <div className="sm:col-span-2 rounded-lg border border-dashed border-slate-300 bg-slate-50/60 p-3">
              <span className={labelCls}>Preview (drag the slider above to resize — text flows around the image)</span>
              {block.src ? (
                <div className="mt-2 text-sm text-slate-600">
                  <img src={block.src} alt="" className={`mb-2 rounded-lg ${block.imageSide === "right" ? "float-right ml-3" : "float-left mr-3"}`} style={{ width: block.imgWidth || 240, height: "auto" }} />
                  {block.text ? <div dangerouslySetInnerHTML={{ __html: block.text }} /> : <p className="text-slate-400">Your text will wrap around the image here…</p>}
                  <span className="block clear-both" />
                </div>
              ) : <p className="text-slate-400">Upload an image to see the preview.</p>}
            </div>
            <AlignField value={block.align} onChange={(v) => set({ align: v })} />
          </>
        )}

        {t === "columns" && (
          <>
            <Field label="Number of Columns"><select className={inputCls} value={block.cols || 2} onChange={(e) => { const n = Number(e.target.value); const items = [...(block.items || [])]; while (items.length < n) items.push(""); items.length = n; set({ cols: n, items }); }}><option value={2}>2</option><option value={3}>3</option><option value={4}>4</option><option value={5}>5</option><option value={6}>6</option></select></Field>
            <AlignField value={block.align} onChange={(v) => set({ align: v })} />
            <div className="sm:col-span-2 space-y-2">
              <span className={labelCls}>Column text</span>
              {(block.items || []).map((col, i) => (
                <textarea key={i} className={`${inputCls} min-h-[60px]`} value={col} onChange={(e) => { const items = [...(block.items || [])]; items[i] = e.target.value; set({ items }); }} placeholder={`Column ${i + 1}`} />
              ))}
            </div>
          </>
        )}

        {t === "quote" && (
          <>
            <div className="sm:col-span-2">
              <span className={labelCls}>Quote / Highlight text</span>
              <RichText value={block.text || ""} onChange={(html) => set({ text: html })} placeholder="Quote text…" minHeight={70} />
            </div>
            <AlignField value={block.align} onChange={(v) => set({ align: v })} />
          </>
        )}

        {t === "button" && (
          <>
            <Field label="Button Label"><input className={inputCls} value={block.text} onChange={(e) => set({ text: e.target.value })} placeholder="Click here" /></Field>
            <Field label="Link URL"><input className={inputCls} value={block.link} onChange={(e) => set({ link: e.target.value })} placeholder="https://" /></Field>
          </>
        )}

        {t === "question" && (
          <div className="sm:col-span-2 space-y-3">
            <Field label="Question"><input className={inputCls} value={block.question} onChange={(e) => set({ question: e.target.value })} /></Field>
            <span className={labelCls}>Answer options (tick the correct one)</span>
            {(block.options || []).map((opt, i) => (
              <div key={i} className="flex items-center gap-2">
                <input type="radio" checked={block.correctIndex === i} onChange={() => set({ correctIndex: i })} />
                <input className={inputCls} value={opt} onChange={(e) => { const o = [...(block.options || [])]; o[i] = e.target.value; set({ options: o }); }} placeholder={`Option ${String.fromCharCode(65 + i)}`} />
                <button type="button" onClick={() => { const o = [...(block.options || [])]; o.splice(i, 1); set({ options: o }); }} className="text-xs font-bold text-rose-500">Remove</button>
              </div>
            ))}
            <button type="button" onClick={() => set({ options: [...(block.options || []), ""] })} className="rounded-lg bg-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700">+ Add option</button>
          </div>
        )}

        {t === "shape" && (
          <>
            {/* Multi-shape editor */}
            <div className="sm:col-span-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className={labelCls}>Shapes in this block</span>
                <div className="flex gap-1.5">
                  <button type="button" onClick={() => {
                    const cur = (block.shapes || []).length || 1;
                    if (cur < 12) {
                      const shapes = [...getShapes()];
                      const last = shapes[shapes.length - 1];
                      shapes.push({
                        kind: last?.kind || "square",
                        fillColor: last?.fillColor || "#ffffff",
                        outlineColor: last?.outlineColor || "#000000",
                        filled: last?.filled ?? false,
                        text: "",
                        textColor: last?.textColor || "#000000",
                        textBold: last?.textBold || false,
                        textItalic: last?.textItalic || false,
                        textUnderline: last?.textUnderline || false,
                      });
                      set({ shapes });
                    }
                  }} className="rounded-lg bg-brand px-3 py-1 text-xs font-black text-white hover:bg-brand-700">+ Add shape</button>
                  {getShapes().length > 1 ? (
                    <button type="button" onClick={() => {
                      const shapes = getShapes().slice(0, -1);
                      set({ shapes });
                    }} className="rounded-lg bg-slate-200 px-3 py-1 text-xs font-bold text-slate-600 hover:bg-slate-300">− Remove</button>
                  ) : null}
                </div>
              </div>
              {/* Individual shape editors */}
              <div className="space-y-2">
                {getShapes().map((s, idx) => (
                  <div key={idx} className="rounded-lg border border-slate-200 bg-white p-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-black text-slate-400">#{idx + 1}</span>
                      <select className={`${inputCls} w-auto py-1 text-xs`} value={s.kind || "square"} onChange={(e) => updateShape(idx, { kind: e.target.value })}>
                        {SHAPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                      <label className="flex items-center gap-1 text-xs font-bold text-slate-600">
                        <input type="checkbox" checked={s.filled !== false} onChange={(e) => updateShape(idx, { filled: e.target.checked })} /> Filled
                      </label>
                      <input type="color" title="Fill colour" value={s.fillColor || "#ffffff"} onChange={(e) => updateShape(idx, { fillColor: e.target.value })} className="h-7 w-8 cursor-pointer rounded border border-slate-300" />
                      <input type="color" title="Outline colour" value={s.outlineColor || "#000000"} onChange={(e) => updateShape(idx, { outlineColor: e.target.value })} className="h-7 w-8 cursor-pointer rounded border border-slate-300" />
                      <input type="color" title="Font colour" value={s.textColor || "#000000"} onChange={(e) => updateShape(idx, { textColor: e.target.value })} className="h-7 w-8 cursor-pointer rounded border border-slate-300" />
                      <button type="button" title="Bold" onClick={() => updateShape(idx, { textBold: !s.textBold })} className={`flex h-6 w-6 items-center justify-center rounded text-xs font-black ${s.textBold ? "bg-brand text-white" : "bg-slate-100 text-slate-600"}`}>B</button>
                      <button type="button" title="Italic" onClick={() => updateShape(idx, { textItalic: !s.textItalic })} className={`flex h-6 w-6 items-center justify-center rounded text-xs italic ${s.textItalic ? "bg-brand text-white" : "bg-slate-100 text-slate-600"}`}>I</button>
                      <button type="button" title="Underline" onClick={() => updateShape(idx, { textUnderline: !s.textUnderline })} className={`flex h-6 w-6 items-center justify-center rounded text-xs underline ${s.textUnderline ? "bg-brand text-white" : "bg-slate-100 text-slate-600"}`}>U</button>
                      <input type="number" title="Font size (px)" className={`${inputCls} w-14 py-1 text-xs`} placeholder="Auto" value={s.textSize || ""} onChange={(e) => updateShape(idx, { textSize: e.target.value ? Number(e.target.value) : undefined })} />
                      <input className={`${inputCls} w-16 py-1 text-xs`} placeholder="Text" value={s.text || ""} onChange={(e) => updateShape(idx, { text: e.target.value })} />
                    </div>
                  </div>
                ))}
              </div>
              {/* Live shape preview with gap */}
              <div className="mt-2 flex flex-wrap items-center justify-center rounded-lg bg-white p-3" style={{ gap: `${Number(block.shapeGap) || 8}px` }}>
                {getShapes().map((s, idx) => (
                  <Shape key={idx} kind={s.kind as ShapeKind} fillColor={s.fillColor} outlineColor={s.outlineColor} filled={s.filled !== false} text={s.text} textColor={s.textColor} textBold={s.textBold} textItalic={s.textItalic} textUnderline={s.textUnderline} textSize={s.textSize} width={Number(block.shapeWidth) || 80} height={Number(block.shapeHeight) || 80} />
                ))}
              </div>
            </div>
            <Field label="Size (px)"><input className={inputCls} type="number" min={20} max={300} value={block.shapeWidth || 80} onChange={(e) => { const v = Number(e.target.value); set({ shapeWidth: v, shapeHeight: v }); }} /></Field>
            <Field label="Gap between shapes (px)"><input className={inputCls} type="number" min={0} max={80} value={block.shapeGap || 8} onChange={(e) => set({ shapeGap: Number(e.target.value) })} /></Field>
            <Field label="Position of shapes"><select className={inputCls} value={block.position || "centre"} onChange={(e) => set({ position: e.target.value as TeacherBlock["position"] })}><option value="centre">Shapes only (text inside)</option><option value="left">Left of text</option><option value="right">Right of text</option><option value="top">Above text</option><option value="bottom">Below text</option></select></Field>
            {block.position !== "centre" ? (
              <div className="sm:col-span-2">
                <span className={labelCls}>Text (outside shapes)</span>
                <RichText value={block.text || ""} onChange={(html) => set({ text: html })} placeholder="Text beside the shapes…" minHeight={70} />
              </div>
            ) : null}
            <AlignField value={block.align} onChange={(v) => set({ align: v })} />
          </>
        )}

        {t === "pdf" && (
          <>
            <div className="sm:col-span-2">
              <span className={labelCls}>Upload PDF file</span>
              <PdfUploader value={block.src} onChange={(url) => set({ src: url })} />
            </div>
            <div className="sm:col-span-2"><Field label="Caption (optional)"><input className={inputCls} value={block.caption} onChange={(e) => set({ caption: e.target.value })} /></Field></div>
          </>
        )}
        {t === "youtube" && (
          <div className="sm:col-span-2">
            <Field label="YouTube Video URL (or ID)">
              <input className={inputCls} value={block.youtubeId || ""} onChange={(e) => {
                let val = e.target.value.trim();
                const match = val.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/);
                if (match) val = match[1];
                set({ youtubeId: val });
              }} placeholder="https://www.youtube.com/watch?v=dQw4w9WgXcQ" />
            </Field>
            <Field label="Max Width (px) — drag to resize"><input className={inputCls} type="range" min={200} max={1200} step={20} value={block.youtubeWidth || 800} onChange={(e) => set({ youtubeWidth: Number(e.target.value) })} /></Field>
            <p className="mt-1 text-xs text-slate-400">Paste any YouTube link — the video ID is extracted automatically.</p>
            {block.youtubeId ? (
              <div className="mt-2 overflow-hidden rounded-lg border border-slate-200">
                <iframe width="100%" height="280" src={`https://www.youtube.com/embed/${block.youtubeId}`} title="YouTube preview" frameBorder="0" allowFullScreen />
              </div>
            ) : null}
          </div>
        )}
        {t === "wrap-youtube" && (
          <>
            <div className="sm:col-span-2"><Field label="YouTube Video URL (or ID)"><input className={inputCls} value={block.youtubeId || ""} onChange={(e) => { let val = e.target.value.trim(); const match = val.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/); if (match) val = match[1]; set({ youtubeId: val }); }} placeholder="https://www.youtube.com/watch?v=..." /></Field></div>
            <div className="sm:col-span-2"><span className={labelCls}>Text (optional — leave empty for video only)</span><RichText value={block.text || ""} onChange={(html) => set({ text: html })} placeholder="Text that wraps around the video… (or leave empty)" minHeight={70} /></div>
            <Field label="Video Side"><select className={inputCls} value={block.imageSide} onChange={(e) => set({ imageSide: e.target.value })}><option value="left">Left</option><option value="right">Right</option></select></Field>
            <Field label="Video Width (px) — drag to resize"><input className={inputCls} type="range" min={100} max={1200} step={20} value={block.youtubeWidth || 400} onChange={(e) => set({ youtubeWidth: Number(e.target.value) })} /></Field>
          </>
        )}
        {t === "divider" && <p className="text-sm text-slate-400">A horizontal divider line.</p>}
      </div>

      <div className="mt-3 rounded-xl border border-dashed border-slate-300 bg-slate-50/60 p-3">
        <span className={labelCls}>Preview</span>
        <TeacherRenderer blocks={[block]} />
      </div>
    </div>
  );
}

/* ------------------------------- main builder ----------------------------- */

export function TeacherBuilder({
  item,
  onSave,
  onCancel,
}: {
  item: TeacherItem;
  onSave: (item: TeacherItem) => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState<TeacherItem>({ ...item });
  const [blocks, setBlocks] = useState<TeacherBlock[]>(() => Array.isArray(item.blocks) ? item.blocks : []);

  const addBlock = (e: PaletteEntry) => setBlocks((b) => [...b, e.make()]);
  const updateBlock = (i: number, next: TeacherBlock) => setBlocks((b) => b.map((blk, idx) => (idx === i ? next : blk)));
  const moveBlock = (i: number, dir: -1 | 1) =>
    setBlocks((b) => {
      const j = i + dir;
      if (j < 0 || j >= b.length) return b;
      const next = [...b];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  const removeBlock = (i: number) => setBlocks((b) => b.filter((_, idx) => idx !== i));

  const save = () => {
    const now = new Date().toISOString();
    onSave({
      ...draft,
      blocks,
      updatedAt: now,
      createdAt: draft.createdAt || now,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <span className="text-xs font-black uppercase tracking-widest text-brand-600">{draft.id ? "Edit" : "New"}</span>
          <h1 className="text-2xl font-extrabold text-slate-900">{draft.title || "Untitled"}</h1>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={onCancel} className="rounded-lg bg-slate-200 px-4 py-2 text-sm font-black text-slate-700 hover:bg-slate-300">Cancel</button>
          <button type="button" onClick={save} className="rounded-lg bg-brand px-5 py-2 text-sm font-black text-white hover:bg-brand-700">Save</button>
        </div>
      </div>

      <section className="card-panel grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2"><Field label="Title"><input className={inputCls} value={draft.title} onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))} /></Field></div>
        <Field label="Content type">
          <select className={inputCls} value={draft.type} onChange={(e) => setDraft((d) => ({ ...d, type: e.target.value as ContentType }))}>
            <option value="lesson-plan">Lesson Plan</option>
            <option value="question">Question</option>
            <option value="quiz">Quiz</option>
          </select>
        </Field>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-black uppercase tracking-wide text-slate-500">Build content</h2>
        <div className="mb-4 flex flex-wrap gap-2">
          {BLOCK_TYPES.map((bt) => (
            <button key={bt.type} type="button" onClick={() => addBlock(bt)} className="inline-flex items-center gap-1.5 rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:border-brand hover:bg-brand-50 hover:text-brand">
              <span className="font-black">{bt.icon}</span> {bt.label}
            </button>
          ))}
        </div>
        <div className="space-y-4">
          {blocks.length === 0 && <p className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-400">No content yet — add a block above.</p>}
          {blocks.map((block, i) => (
            <BlockEditor key={i} block={block} index={i} total={blocks.length} onChange={(next) => updateBlock(i, next)} onMove={(dir) => moveBlock(i, dir)} onRemove={() => removeBlock(i)} />
          ))}
        </div>
      </section>
    </div>
  );
}
