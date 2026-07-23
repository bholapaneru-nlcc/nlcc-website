import { Shape, type ShapeConfig, type ShapeKind } from "./Shape";
import type { TeacherBlock } from "../../lib/teacherStore";

/* ------------------------ teacher content renderer ----------------------- */
// Renders teacher content blocks: headings, paragraphs (rich text), images,
// lists, tables, multiple-choice questions, and the headline SHAPE block that
// can be placed top/bottom/left/right of text.
export type { TeacherBlock };

function hasHtml(s: string) {
  return /<[a-z][\s\S]*>/i.test(s);
}

function sanitize(html: string): string {
  if (typeof window === "undefined") return html;
  const doc = new DOMParser().parseFromString(html, "text/html");
  doc.querySelectorAll("script,style,link,meta,iframe,object,embed,form,input,button").forEach((el) => el.remove());
  doc.querySelectorAll("*").forEach((el) => {
    [...el.attributes].forEach((attr) => {
      const n = attr.name.toLowerCase();
      if (n.startsWith("on")) el.removeAttribute(attr.name);
    });
  });
  return doc.body.innerHTML;
}

function Html({ html }: { html?: string }) {
  const c = html || "";
  if (hasHtml(c)) return <div className="pb-richtext" dangerouslySetInnerHTML={{ __html: sanitize(c) }} />;
  return <>{c.split(/\n{2,}/).map((p, i) => <p key={i}>{p}</p>)}</>;
}

function textAlign(a?: string): React.CSSProperties["textAlign"] {
  if (a === "centre" || a === "center") return "center";
  if (a === "right") return "right";
  if (a === "justify") return "justify";
  return "left";
}

function isRealImage(v?: string) {
  return Boolean(v && (/^https?:\/\//.test(v) || v.startsWith("data:")));
}

function Img({ src }: { src?: string }) {
  if (isRealImage(src)) return <img src={src} alt="" className="w-full rounded-xl" />;
  return <div className="flex aspect-[16/9] w-full items-center justify-center rounded-xl bg-slate-100 text-3xl">🖼️</div>;
}

export function ShapeBlock({ block }: { block: TeacherBlock }) {
  const shapeWidth = Number(block.shapeWidth) || 80;
  const shapeHeight = Number(block.shapeHeight) || 80;

  // Build the array of shapes (supports both new multi-shape and old single-shape)
  const shapes: ShapeConfig[] = (() => {
    if (Array.isArray(block.shapes) && block.shapes.length) {
      return block.shapes.map((s) => ({
        kind: s.kind as ShapeKind, fillColor: s.fillColor || "#ffffff",
        outlineColor: s.outlineColor || "#000000", filled: s.filled !== false,
        text: s.text, textColor: s.textColor || "#000000",
        textBold: s.textBold, textItalic: s.textItalic, textUnderline: s.textUnderline,
        textSize: s.textSize, width: shapeWidth, height: shapeHeight,
      }));
    }
    // Backward compat: old single-shape blocks
    return [{
      kind: block.shape as ShapeKind, fillColor: block.shapeColor || "#d71920",
      outlineColor: "#000000", filled: true, width: shapeWidth, height: shapeHeight,
    }];
  })();

  // Render all shapes inline in a row
  const shapeGap = Number(block.shapeGap) || 8;
  const shapeRow = (
    <div className="flex shrink-0 flex-wrap items-center justify-center p-2" style={{ gap: `${shapeGap}px` }}>
      {shapes.map((s, i) => <Shape key={i} {...s} />)}
    </div>
  );

  const text = block.text ? (
    <div className="min-w-0 flex-1 text-slate-700" style={{ textAlign: textAlign(block.align) }}>
      <Html html={block.text} />
    </div>
  ) : null;

  // "centre" position = shapes only (text is inside each shape)
  if (block.position === "centre" || !block.position) {
    return <div className="flex justify-center">{shapeRow}</div>;
  }
  if (block.position === "top") {
    return <div className="flex flex-col items-center gap-2">{shapeRow}{text}</div>;
  }
  if (block.position === "bottom") {
    return <div className="flex flex-col items-center gap-2">{text}{shapeRow}</div>;
  }
  if (block.position === "right") {
    return <div className="flex flex-wrap items-center gap-3">{text}{shapeRow}</div>;
  }
  // left (default)
  return (
    <div className="flex flex-wrap items-center gap-3">
      {shapeRow}
      {text}
    </div>
  );
}

export function TeacherBlockView({ block }: { block: TeacherBlock }) {
  switch (block.type) {
    case "heading": {
      const lvl = Number(block.level) || 2;
      const cls = lvl === 1 ? "text-2xl" : lvl === 3 ? "text-lg" : "text-xl";
      const Tag = (`h${Math.min(Math.max(lvl, 1), 4)}` as "h1" | "h2" | "h3" | "h4");
      return (
        <Tag className={`${cls} font-extrabold text-slate-900`} style={{ textAlign: textAlign(block.align), color: block.color }}>
          {block.text}
        </Tag>
      );
    }
    case "paragraph":
      return (
        <div className="text-slate-700" style={{ fontSize: block.fontSize, textAlign: textAlign(block.align), color: block.color, background: block.background }}>
          <Html html={block.text} />
        </div>
      );
    case "list":
      return (
        <ul className="list-disc space-y-1 pl-6 text-slate-700" style={{ textAlign: textAlign(block.align) }}>
          {(block.items || []).filter(Boolean).map((it, i) => <li key={i}>{it}</li>)}
        </ul>
      );
    case "image":
      return (
        <figure className="text-center">
          <Img src={block.src} />
          {block.caption ? <figcaption className="mt-1 text-sm text-slate-500">{block.caption}</figcaption> : null}
        </figure>
      );
    case "pdf":
      return block.src ? (
        <div className="rounded-xl border border-slate-200">
          <div className="flex items-center justify-between gap-2 border-b border-slate-200 bg-slate-50 px-4 py-2">
            <span className="text-xs font-black text-slate-500">📄 {block.caption || "PDF Document"}</span>
            <a href={block.src} download="document.pdf" target="_blank" rel="noreferrer" className="text-xs font-bold text-brand hover:underline">⬇ Download</a>
          </div>
          <embed src={block.src} type="application/pdf" className="h-[20cm] w-full" />
        </div>
      ) : null;
    case "table": {
      const rows = String(block.text || "").split(/\r?\n/).map((r) => r.split("|").map((c) => c.trim())).filter((r) => r.some((c) => c));
      if (!rows.length) return null;
      const [head, ...body] = rows;
      return (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead><tr>{head.map((c, i) => <th key={i} className="border border-slate-300 bg-slate-50 p-2 text-left font-bold">{c}</th>)}</tr></thead>
            <tbody>{body.map((r, ri) => <tr key={ri}>{r.map((c, i) => <td key={i} className="border border-slate-300 p-2">{c}</td>)}</tr>)}</tbody>
          </table>
        </div>
      );
    }
    case "question":
      // NO answer highlighting — all options look identical (no hints to students).
      return (
        <div className="rounded-xl border-l-4 border-slate-400 bg-slate-50 p-4">
          {block.question ? <p className="font-extrabold text-slate-900">{block.question}</p> : null}
          <ol className="mt-2 space-y-1.5" type="A">
            {(block.options || []).map((opt, i) => (
              <li key={i} className="flex items-center gap-2 rounded-lg px-2 py-1 text-slate-700">
                <span className="flex h-5 w-5 items-center justify-center rounded-full border border-slate-300 text-xs">{String.fromCharCode(65 + i)}</span>
                {opt}
              </li>
            ))}
          </ol>
        </div>
      );
    case "shape":
      return <ShapeBlock block={block} />;
    case "youtube":
      return block.youtubeId ? (
        <div className="overflow-hidden rounded-xl border border-slate-200" style={{ maxWidth: block.youtubeWidth ? `${block.youtubeWidth}px` : undefined }}>
          <div className="aspect-video w-full">
            <iframe width="100%" height="100%" src={`https://www.youtube.com/embed/${block.youtubeId}`} title="YouTube video" frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
          </div>
        </div>
      ) : null;
    case "wrap-youtube": {
      const ytW = Number(block.youtubeWidth) || 400;
      const side = block.imageSide === "right" ? "float-right ml-4" : "float-left mr-4";
      return (
        <div className="text-slate-700" style={{ textAlign: textAlign(block.align) }}>
          {block.youtubeId ? (
            <div className={`mb-2 ${side}`} style={{ width: ytW }}>
              <div className="aspect-video w-full overflow-hidden rounded-xl border border-slate-200">
                <iframe width="100%" height="100%" src={`https://www.youtube.com/embed/${block.youtubeId}`} title="YouTube video" frameBorder="0" allowFullScreen />
              </div>
            </div>
          ) : null}
          {block.text ? <Html html={block.text} /> : null}
          <span className="block clear-both" />
        </div>
      );
    }
    case "divider":
      return <hr className="border-t-2 border-slate-200" />;
    case "image-text":
      return (
        <div className={`flex flex-wrap items-center gap-4 ${block.imageSide === "right" ? "flex-row-reverse" : ""}`}>
          <div className="w-full sm:w-1/2"><Img src={block.src} /></div>
          <div className="min-w-0 flex-1 text-slate-700" style={{ textAlign: textAlign(block.align) }}>
            <Html html={block.text} />
          </div>
        </div>
      );
    case "wrap-image": {
      const imgW = Number(block.imgWidth) || 240;
      return (
        <div className="text-slate-700" style={{ textAlign: textAlign(block.align) }}>
          {block.src && isRealImage(block.src) ? (
            <img src={block.src} alt="" className={`mb-2 rounded-xl ${block.imageSide === "right" ? "float-right ml-3" : "float-left mr-3"}`} style={{ width: imgW, height: "auto" }} />
          ) : (
            <div className={`mb-2 ${block.imageSide === "right" ? "float-right ml-3" : "float-left mr-3"}`} style={{ width: imgW }}><Img src={block.src} /></div>
          )}
          <Html html={block.text} />
          <span className="block clear-both" />
        </div>
      );
    }
    case "columns": {
      const colItems = (block.items as string[] | undefined) || [];
      return (
        <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${Math.min(Number(block.cols) || 2, 6)}, minmax(0,1fr))` }}>
          {colItems.map((txt, i) => (
            <div key={i} className="min-w-0 text-slate-700" style={{ textAlign: textAlign(block.align) }}>
              <Html html={txt} />
            </div>
          ))}
        </div>
      );
    }
    case "quote":
      return (
        <blockquote className="border-l-4 border-slate-700 bg-slate-50 px-4 py-3 italic text-slate-700" style={{ textAlign: textAlign(block.align) }}>
          <Html html={block.text} />
        </blockquote>
      );
    case "button":
      return (
        <a className="inline-block rounded-full bg-brand px-5 py-2.5 text-sm font-black text-white no-underline" href={String(block.link || "#")} target="_blank" rel="noreferrer">
          {block.text || "Click here"}
        </a>
      );
    default:
      return null;
  }
}

export function TeacherRenderer({ blocks }: { blocks: TeacherBlock[] }) {
  return (
    <div className="space-y-4 leading-relaxed">
      {blocks.map((b, i) => <TeacherBlockView key={i} block={b} />)}
    </div>
  );
}
