import { useState } from "react";
import { BlockRenderer, type ColumnItem, type ColumnType, type ContentBlock } from "../BlockRenderer";
import { ImageUploader } from "../ImageUploader";
import { RichText } from "../RichText";
import { uploadFile } from "../../lib/upload";
import { slug, type Article } from "../../lib/nlcc";

/* --------------------------- shared field bits ---------------------------- */

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

/* Shared alignment selector — Left / Centre / Right / Justify. */
type AlignValue = "left" | "centre" | "right" | "justify";

function AlignField({
  label = "Text Alignment",
  value,
  onChange,
}: {
  label?: string;
  value?: string;
  onChange: (v: AlignValue) => void;
}) {
  return (
    <Field label={label}>
      <select className={inputCls} value={value || "left"} onChange={(e) => onChange(e.target.value as AlignValue)}>
        <option value="left">Left</option>
        <option value="centre">Centre</option>
        <option value="right">Right</option>
        <option value="justify">Justify</option>
      </select>
    </Field>
  );
}

/* ----------------------------- block palette ------------------------------ */
// Exactly the 12 block types requested.

interface PaletteEntry {
  type: string;            // palette id (may differ from block.type for columns)
  label: string;
  icon: string;
  make: () => ContentBlock;
}

const BLOCK_TYPES: PaletteEntry[] = [
  { type: "heading", label: "Heading", icon: "H", make: () => ({ type: "heading", level: "2", text: "", align: "left", color: "#0f172a" }) },
  { type: "paragraph", label: "Paragraph", icon: "¶", make: () => ({ type: "paragraph", text: "", fontSize: "18px", align: "left", color: "#334155", background: "" }) },
  { type: "image", label: "Image", icon: "🖼️", make: () => ({ type: "image", src: "", caption: "" }) },
  { type: "pdf", label: "PDF Document", icon: "📄", make: () => ({ type: "pdf", src: "", caption: "" }) },
  { type: "youtube", label: "YouTube Video", icon: "▶️", make: () => ({ type: "youtube", youtubeId: "" }) },
  { type: "wrap-youtube", label: "Text Around YouTube", icon: "🎬", make: () => ({ type: "wrap-youtube", youtubeId: "", text: "", youtubeWidth: 400, imageSide: "left" }) },
  { type: "image-text", label: "Image + Text", icon: "🪧", make: () => ({ type: "image-text", src: "", text: "", imageSide: "left" }) },
  { type: "wrap-image", label: "Text Around Image", icon: "🔁", make: () => ({ type: "wrap-image", src: "", text: "", imageSide: "left" }) },
  { type: "list", label: "Bullet List", icon: "•", make: () => ({ type: "list", listItems: [""] }) },
  { type: "question", label: "Multiple Choice", icon: "❓", make: () => ({ type: "question", question: "", options: ["", ""], correctIndex: 0 }) },
  { type: "shape", label: "Shape + Text", icon: "⬛", make: () => ({ type: "shape", position: "centre", shapeWidth: 80, shapeHeight: 80, shapeGap: 8, shapes: [{ kind: "square", fillColor: "#ffffff", outlineColor: "#000000", filled: false, text: "", textColor: "#000000" }] }) },
  { type: "table", label: "Table", icon: "▦", make: () => ({ type: "table", text: "" }) },
  { type: "columns-2", label: "2 Columns", icon: "▭▭", make: () => ({ type: "columns", cols: 2, items: [{ type: "card" }, { type: "card" }] }) },
  { type: "columns-3", label: "3 Columns", icon: "▭▭▭", make: () => ({ type: "columns", cols: 3, items: [{ type: "card" }, { type: "card" }, { type: "card" }] }) },
  { type: "columns-4", label: "4 Columns", icon: "▭▭▭▭", make: () => ({ type: "columns", cols: 4, items: [{ type: "card" }, { type: "card" }, { type: "card" }, { type: "card" }] }) },
  { type: "quote", label: "Quote / Highlight", icon: "❝", make: () => ({ type: "quote", text: "" }) },
  { type: "divider", label: "Divider", icon: "—", make: () => ({ type: "divider" }) },
  { type: "button", label: "Button / Link", icon: "🔘", make: () => ({ type: "button", text: "", link: "" }) },
];

/* ------------------------------- colour field ----------------------------- */

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value?: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <span className={labelCls}>{label}</span>
      <div className="mt-1 flex items-center gap-2">
        <input
          type="color"
          value={value || "#ffffff"}
          onChange={(e) => onChange(e.target.value)}
          className="h-9 w-12 shrink-0 cursor-pointer rounded-lg border border-slate-300 bg-white p-1"
        />
        <input
          className={`${inputCls} flex-1`}
          value={value || ""}
          placeholder="none"
          onChange={(e) => onChange(e.target.value)}
        />
        {value ? (
          <button
            type="button"
            onClick={() => onChange("")}
            className="shrink-0 text-xs font-bold text-rose-500 hover:underline"
          >
            Clear
          </button>
        ) : null}
      </div>
    </div>
  );
}

/* ------------------------------ column editor ----------------------------- */

function updateItem(items: ColumnItem[], i: number, patch: Partial<ColumnItem>): ColumnItem[] {
  return items.map((it, idx) => (idx === i ? { ...it, ...patch } : it));
}

function ColumnEditor({
  item,
  index,
  onChange,
}: {
  item: ColumnItem;
  index: number;
  onChange: (next: ColumnItem) => void;
}) {
  const set = (patch: Partial<ColumnItem>) => onChange({ ...item, ...patch });
  const colType = (item.type || "card") as ColumnType;

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3">
      <div className="mb-3 flex items-center justify-between gap-2">
        <span className="rounded-full bg-slate-200 px-2.5 py-0.5 text-xs font-black text-slate-600">
          Column {index + 1}
        </span>
        <select
          className={`${inputCls} w-auto py-1.5 text-xs`}
          value={colType}
          onChange={(e) => set({ type: e.target.value as ColumnType })}
        >
          <option value="card">Card</option>
          <option value="image">Image</option>
          <option value="image-text">Image + Text</option>
        </select>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <ImageUploader label="Image (optional)" value={item.src} onChange={(url) => set({ src: url })} />
        </div>
        <div className="sm:col-span-2">
          <Field label="Alternate Text for Image (optional)">
            <input
              className={inputCls}
              value={item.alt || ""}
              onChange={(e) => set({ alt: e.target.value })}
              placeholder="Describe the image for accessibility"
            />
          </Field>
        </div>
        <Field label="Text Header (optional)">
          <input
            className={inputCls}
            value={item.heading || ""}
            onChange={(e) => set({ heading: e.target.value })}
            placeholder="Header"
          />
        </Field>
        <AlignField label="Header Alignment" value={item.headingAlign} onChange={(v) => set({ headingAlign: v })} />
        <div className="sm:col-span-2">
          <span className={labelCls}>Text (optional — describe the image)</span>
          <RichText value={item.text || ""} onChange={(html) => set({ text: html })} placeholder="Body text…" minHeight={80} />
        </div>
        <AlignField label="Text Alignment" value={item.textAlign} onChange={(v) => set({ textAlign: v })} />
        <Field label="Font Size (px)">
          <input
            className={inputCls}
            type="number"
            min={8}
            max={80}
            value={item.fontSize ? item.fontSize.replace(/px/i, "") : ""}
            onChange={(e) => set({ fontSize: e.target.value ? `${e.target.value}px` : "" })}
            placeholder="16"
          />
        </Field>
        <ColorField label="Text Colour" value={item.color} onChange={(v) => set({ color: v })} />
        <ColorField label="Background — Apply to Column" value={item.bgColumn} onChange={(v) => set({ bgColumn: v })} />
        <ColorField label="Background — Apply to Text" value={item.bgText} onChange={(v) => set({ bgText: v })} />
      </div>
    </div>
  );
}

/* ----------------------------- pdf block editor ---------------------------- */

function PdfBlockEditor({ block, set }: { block: ContentBlock; set: (patch: Partial<ContentBlock>) => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const handleFile = async (file?: File) => {
    if (!file) return;
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) { setError("Please choose a PDF file."); return; }
    setBusy(true); setError("");
    try { const res = await uploadFile(file); set({ src: res.url }); } catch { setError("Upload failed."); }
    setBusy(false);
  };
  return (
    <>
      <div className="sm:col-span-2 rounded-xl border border-slate-200 bg-slate-50/60 p-3">
        <div className="flex flex-wrap items-center gap-3">
          <label className="inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-xs font-black text-white transition hover:bg-brand-700">
            {busy ? "Uploading…" : "📄 Upload PDF"}
            <input type="file" accept="application/pdf,.pdf" className="hidden" disabled={busy} onChange={(e) => handleFile(e.target.files?.[0])} />
          </label>
          {block.src ? <span className="text-xs font-bold text-emerald-600">✓ PDF uploaded</span> : null}
        </div>
        {error ? <p className="mt-1.5 text-xs font-bold text-rose-600">{error}</p> : null}
        {block.src ? (
          <div className="mt-3">
            <embed src={block.src} type="application/pdf" className="h-[20cm] w-full rounded-lg border border-slate-200" />
            <div className="mt-1 flex gap-2"><a href={block.src} download="document.pdf" target="_blank" rel="noreferrer" className="text-xs font-bold text-brand hover:underline">⬇ Download</a><button type="button" onClick={() => set({ src: "" })} className="text-xs font-bold text-rose-500 hover:underline">Remove</button></div>
          </div>
        ) : null}
      </div>
      <div className="sm:col-span-2"><Field label="Caption (optional)"><input className={inputCls} value={block.caption} onChange={(e) => set({ caption: e.target.value })} /></Field></div>
    </>
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
  block: ContentBlock;
  index: number;
  total: number;
  onChange: (next: ContentBlock) => void;
  onMove: (dir: -1 | 1) => void;
  onRemove: () => void;
}) {
  const set = (patch: Partial<ContentBlock>) => onChange({ ...block, ...patch });
  const t = block.type;

  // Shape helpers
  const getShapes = () => Array.isArray(block.shapes) && block.shapes.length ? block.shapes : [{ kind: "square", fillColor: "#ffffff", outlineColor: "#000000", filled: false, text: "", textColor: "#000000" }];
  const updateShape = (idx: number, patch: Record<string, unknown>) => set({ shapes: getShapes().map((s, i) => (i === idx ? { ...s, ...patch } : s)) });

  const paletteLabel = BLOCK_TYPES.find((p) => p.type === t || p.type === `columns-${block.cols}`)?.label || t;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-3">
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black uppercase tracking-wide text-slate-600">
          {index + 1}. {paletteLabel}
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
            <div className="sm:col-span-2">
              <span className={labelCls}>Text</span>
              <RichText value={block.text || ""} onChange={(html) => set({ text: html })} placeholder="Heading text…" minHeight={70} />
            </div>
            <Field label="Level"><select className={inputCls} value={block.level} onChange={(e) => set({ level: e.target.value })}><option value="1">H1</option><option value="2">H2</option><option value="3">H3</option><option value="4">H4</option></select></Field>
            <AlignField value={block.align} onChange={(v) => set({ align: v })} />
            <Field label="Text Colour"><input className={inputCls} type="color" value={block.color || "#0f172a"} onChange={(e) => set({ color: e.target.value })} /></Field>
          </>
        )}

        {t === "paragraph" && (
          <>
            <div className="sm:col-span-2">
              <span className={labelCls}>Text</span>
              <RichText value={block.text || ""} onChange={(html) => set({ text: html })} placeholder="Paragraph text…" minHeight={110} />
            </div>
            <Field label="Font Size"><input className={inputCls} value={block.fontSize} onChange={(e) => set({ fontSize: e.target.value })} placeholder="18px" /></Field>
            <AlignField value={block.align} onChange={(v) => set({ align: v })} />
            <Field label="Text Colour"><input className={inputCls} type="color" value={block.color || "#334155"} onChange={(e) => set({ color: e.target.value })} /></Field>
            <Field label="Background"><input className={inputCls} type="color" value={block.background || "#ffffff"} onChange={(e) => set({ background: e.target.value })} /></Field>
          </>
        )}

        {t === "image" && (
          <>
            <div className="sm:col-span-2"><ImageUploader label="Image" value={block.src} onChange={(url) => set({ src: url })} /></div>
            <div className="sm:col-span-2"><Field label="Caption (optional)"><input className={inputCls} value={block.caption} onChange={(e) => set({ caption: e.target.value })} /></Field></div>
            <AlignField label="Caption Alignment" value={block.align} onChange={(v) => set({ align: v })} />
          </>
        )}

        {t === "pdf" && (
          <>
            <PdfBlockEditor block={block} set={set} />
          </>
        )}

        {t === "youtube" && (
          <>
            <div className="sm:col-span-2"><Field label="YouTube Video URL (or ID)"><input className={inputCls} value={block.youtubeId || ""} onChange={(e) => { let val = e.target.value.trim(); const match = val.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/); if (match) val = match[1]; set({ youtubeId: val }); }} placeholder="https://www.youtube.com/watch?v=..." /></Field></div>
            <Field label="Max Width (px) — drag to resize"><input className={inputCls} type="range" min={200} max={1200} step={20} value={block.youtubeWidth || 800} onChange={(e) => set({ youtubeWidth: Number(e.target.value) })} /></Field>
          </>
        )}

        {t === "wrap-youtube" && (
          <>
            <div className="sm:col-span-2"><Field label="YouTube Video URL (or ID)"><input className={inputCls} value={block.youtubeId || ""} onChange={(e) => { let val = e.target.value.trim(); const match = val.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/); if (match) val = match[1]; set({ youtubeId: val }); }} placeholder="https://www.youtube.com/watch?v=..." /></Field></div>
            <div className="sm:col-span-2"><span className={labelCls}>Text (optional — leave empty for video only)</span><RichText value={block.text || ""} onChange={(html) => set({ text: html })} placeholder="Text that wraps around the video… (or leave empty)" minHeight={70} /></div>
            <Field label="Video Side"><select className={inputCls} value={block.imageSide} onChange={(e) => set({ imageSide: e.target.value })}><option value="left">Left</option><option value="right">Right</option></select></Field>
            <Field label="Video Width (px) — drag to resize"><input className={inputCls} type="range" min={100} max={1200} step={20} value={block.youtubeWidth || 400} onChange={(e) => set({ youtubeWidth: Number(e.target.value) })} /></Field>
          </>
        )}

        {t === "list" && (
          <div className="sm:col-span-2"><Field label="Items (one per line)"><textarea className={`${inputCls} min-h-[90px]`} value={(block.listItems || []).join("\n")} onChange={(e) => set({ listItems: e.target.value.split("\n") })} placeholder={"First point\nSecond point"} /></Field></div>
        )}

        {t === "image-text" && (
          <>
            <div className="sm:col-span-2"><ImageUploader label="Image" value={block.src} onChange={(url) => set({ src: url })} /></div>
            <div className="sm:col-span-2"><span className={labelCls}>Text</span><RichText value={block.text || ""} onChange={(html) => set({ text: html })} placeholder="Describe the image…" minHeight={90} /></div>
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
          </>
        )}

        {t === "question" && (
          <div className="sm:col-span-2 space-y-3">
            <Field label="Question"><input className={inputCls} value={block.question} onChange={(e) => set({ question: e.target.value })} /></Field>
            <span className={labelCls}>Answer options (select the correct one — not shown to students)</span>
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
          <div className="sm:col-span-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
            <div className="mb-2 flex items-center justify-between gap-2">
              <span className={labelCls}>Shapes in this block</span>
              <div className="flex gap-1.5">
                <button type="button" onClick={() => { const shapes = [...getShapes()]; const last = shapes[shapes.length - 1]; shapes.push({ kind: last?.kind || "square", fillColor: last?.fillColor || "#ffffff", outlineColor: last?.outlineColor || "#000000", filled: last?.filled ?? false, text: "", textColor: last?.textColor || "#000000" }); set({ shapes }); }} className="rounded-lg bg-brand px-3 py-1 text-xs font-black text-white hover:bg-brand-700">+ Add shape</button>
                {getShapes().length > 1 ? <button type="button" onClick={() => set({ shapes: getShapes().slice(0, -1) })} className="rounded-lg bg-slate-200 px-3 py-1 text-xs font-bold text-slate-600 hover:bg-slate-300">− Remove</button> : null}
              </div>
            </div>
            <div className="space-y-2">
              {getShapes().map((s, idx) => (
                <div key={idx} className="rounded-lg border border-slate-200 bg-white p-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-black text-slate-400">#{idx + 1}</span>
                    <select className={`${inputCls} w-auto py-1 text-xs`} value={s.kind || "square"} onChange={(e) => updateShape(idx, { kind: e.target.value })}>
                      <option value="square">Square</option><option value="rectangle">Rectangle</option><option value="line">Line</option><option value="triangle">Triangle</option><option value="circle">Circle</option><option value="diamond">Diamond</option><option value="star">Star</option>
                    </select>
                    <label className="flex items-center gap-1 text-xs font-bold text-slate-600"><input type="checkbox" checked={s.filled !== false} onChange={(e) => updateShape(idx, { filled: e.target.checked })} /> Filled</label>
                    <input type="color" title="Fill" value={s.fillColor || "#ffffff"} onChange={(e) => updateShape(idx, { fillColor: e.target.value })} className="h-7 w-8 cursor-pointer rounded border border-slate-300" />
                    <input type="color" title="Outline" value={s.outlineColor || "#000000"} onChange={(e) => updateShape(idx, { outlineColor: e.target.value })} className="h-7 w-8 cursor-pointer rounded border border-slate-300" />
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
          </div>
        )}
        {t === "shape" && <Field label="Size (px)"><input className={inputCls} type="number" min={20} max={300} value={block.shapeWidth || 80} onChange={(e) => { const v = Number(e.target.value); set({ shapeWidth: v, shapeHeight: v }); }} /></Field>}
        {t === "shape" && <Field label="Gap between shapes (px)"><input className={inputCls} type="number" min={0} max={80} value={block.shapeGap || 8} onChange={(e) => set({ shapeGap: Number(e.target.value) })} /></Field>}

        {t === "table" && (
          <div className="sm:col-span-2">
            <Field label="Table (one row per line, cells separated by |)">
              <textarea className={`${inputCls} min-h-[100px] font-mono`} value={block.text} onChange={(e) => set({ text: e.target.value })} placeholder={"Day|Time|Class\nSaturday|10:30|Online"} />
            </Field>
          </div>
        )}

        {t === "columns" && (
          <div className="sm:col-span-2">
            <div className="mt-1 grid gap-3" style={{ gridTemplateColumns: `repeat(${Math.min(Number(block.cols) || 2, 2)}, minmax(0,1fr))` }}>
              {(block.items || []).map((item, i) => (
                <ColumnEditor
                  key={i}
                  item={item}
                  index={i}
                  onChange={(next) => set({ items: updateItem(block.items || [], i, next) })}
                />
              ))}
            </div>
          </div>
        )}

        {t === "quote" && (
          <>
            <div className="sm:col-span-2">
              <span className={labelCls}>Quote / Highlight Text</span>
              <RichText value={block.text || ""} onChange={(html) => set({ text: html })} placeholder="Quote text…" minHeight={80} />
            </div>
            <AlignField value={block.align} onChange={(v) => set({ align: v })} />
          </>
        )}

        {t === "button" && (
          <>
            <Field label="Button Label"><input className={inputCls} value={block.text} onChange={(e) => set({ text: e.target.value })} /></Field>
            <Field label="Link URL"><input className={inputCls} value={block.link} onChange={(e) => set({ link: e.target.value })} placeholder="https://" /></Field>
          </>
        )}

        {t === "divider" && <p className="text-sm text-slate-400">A horizontal divider line.</p>}
      </div>

      {/* live preview */}
      <div className="mt-3 rounded-xl border border-dashed border-slate-300 bg-slate-50/60 p-3">
        <span className={labelCls}>Preview</span>
        <BlockRenderer blocks={[block]} />
      </div>
    </div>
  );
}

/* ------------------------------ article builder --------------------------- */

const META_INPUT = "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/25";

export default function ArticleBuilder({
  article,
  onSave,
  onCancel,
}: {
  article: Article;
  onSave: (a: Article) => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState<Article>(() => ({ ...article }));
  const [blocks, setBlocks] = useState<ContentBlock[]>(() => {
    const existing = Array.isArray(article.contentBlocks) && article.contentBlocks.length
      ? (article.contentBlocks as ContentBlock[])
      : article.body
        ? [{ type: "paragraph", text: String(article.body).replace(/<[^>]*>/g, ""), fontSize: "18px", align: "left", color: "#334155", background: "" } as ContentBlock]
        : [];
    return existing;
  });

  const setMeta = (patch: Partial<Article>) => setDraft((d) => ({ ...d, ...patch }));

  const addBlock = (entry: PaletteEntry) => setBlocks((b) => [...b, entry.make()]);
  const updateBlock = (i: number, next: ContentBlock) =>
    setBlocks((b) => b.map((blk, idx) => (idx === i ? next : blk)));
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
    const id = draft.id || slug(draft.title) || Date.now().toString();
    // Derive a plain-text body from blocks (stripping rich-text HTML tags) so
    // search / summaries still get readable text.
    const strip = (s?: string) => (s || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
    const textParts: string[] = [];
    blocks.forEach((blk) => {
      if (strip(blk.text)) textParts.push(strip(blk.text));
      if (strip(blk.left)) textParts.push(strip(blk.left));
      if (strip(blk.right)) textParts.push(strip(blk.right));
      (blk.items || []).forEach((it) => {
        if (strip(it.heading)) textParts.push(strip(it.heading));
        if (strip(it.text)) textParts.push(strip(it.text));
      });
    });
    onSave({
      ...draft,
      id,
      type: "news",
      contentBlocks: blocks,
      body: textParts.join("\n\n") || draft.body || "",
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <span className="text-xs font-black uppercase tracking-widest text-brand-600">{draft.id ? "Edit Article" : "New Article"}</span>
          <h1 className="text-2xl font-extrabold text-slate-900">{draft.title || "Untitled article"}</h1>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={onCancel} className="rounded-lg bg-slate-200 px-4 py-2 text-sm font-black text-slate-700 transition hover:bg-slate-300">Cancel</button>
          <button type="button" onClick={save} className="rounded-lg bg-brand px-5 py-2 text-sm font-black text-white shadow-sm transition hover:bg-brand-700">Save Article</button>
        </div>
      </div>

      {/* meta */}
      <section className="card-panel">
        <h2 className="mb-3 text-sm font-black uppercase tracking-wide text-slate-500">Details</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2"><Field label="Title"><input className={META_INPUT} value={draft.title} onChange={(e) => setMeta({ title: e.target.value })} /></Field></div>
          <Field label="Category"><input className={META_INPUT} value={draft.category} onChange={(e) => setMeta({ category: e.target.value })} /></Field>
          <Field label="Status Label"><input className={META_INPUT} value={draft.statusLabel} onChange={(e) => setMeta({ statusLabel: e.target.value })} /></Field>
          <Field label="Start Date"><input className={META_INPUT} type="date" value={draft.startDate} onChange={(e) => setMeta({ startDate: e.target.value })} /></Field>
          <Field label="End Date"><input className={META_INPUT} type="date" value={draft.endDate || ""} onChange={(e) => setMeta({ endDate: e.target.value })} /></Field>
          <Field label="Event Mode"><select className={META_INPUT} value={draft.eventMode} onChange={(e) => setMeta({ eventMode: e.target.value as Article["eventMode"] })}><option value="day">Day</option><option value="class">Class</option><option value="holiday">Holiday</option></select></Field>
          <Field label="Status"><select className={META_INPUT} value={draft.status} onChange={(e) => setMeta({ status: e.target.value })}><option value="published">Published</option><option value="draft">Draft</option></select></Field>
          <div className="sm:col-span-2"><Field label="Homepage Summary"><textarea className={`${META_INPUT} min-h-[70px]`} value={draft.homepageSummary} onChange={(e) => setMeta({ homepageSummary: e.target.value })} /></Field></div>
          <div className="sm:col-span-2">
            <span className={labelCls}>Feature Image</span>
            <ImageUploader value={draft.featureImage} onChange={(url) => setMeta({ featureImage: url })} />
          </div>
          <div className="sm:col-span-2 flex flex-wrap gap-6 pt-1">
            <label className="flex items-center gap-2 text-sm font-bold text-slate-700"><input type="checkbox" checked={!!draft.featured} onChange={(e) => setMeta({ featured: e.target.checked })} /> Featured article</label>
            <label className="flex items-center gap-2 text-sm font-bold text-slate-700"><input type="checkbox" checked={!!draft.showOnHomepage} onChange={(e) => setMeta({ showOnHomepage: e.target.checked })} /> Show on homepage</label>
          </div>
        </div>
      </section>

      {/* builder */}
      <section>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-black uppercase tracking-wide text-slate-500">Content Blocks</h2>
          <span className="text-xs text-slate-400">Compose the article body — each block previews live below.</span>
        </div>

        <div className="mb-4 flex flex-wrap gap-2">
          {BLOCK_TYPES.map((bt) => (
            <button key={bt.type} type="button" onClick={() => addBlock(bt)} className="inline-flex items-center gap-1.5 rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 transition hover:border-brand hover:bg-brand-50 hover:text-brand">
              <span className="font-black">{bt.icon}</span> {bt.label}
            </button>
          ))}
        </div>

        <div className="space-y-4">
          {blocks.length === 0 && <p className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-400">No blocks yet. Add one above.</p>}
          {blocks.map((block, i) => (
            <BlockEditor key={i} block={block} index={i} total={blocks.length} onChange={(next) => updateBlock(i, next)} onMove={(dir) => moveBlock(i, dir)} onRemove={() => removeBlock(i)} />
          ))}
        </div>
      </section>
    </div>
  );
}
