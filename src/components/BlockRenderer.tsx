import { Fragment, type ReactNode } from "react";
import { ArticleImage } from "./bits";

/* ---------------------- Page-builder block rendering ---------------------- */
/* Mirrors the Version 7 `.pb-*` classes. Articles authored in Admin with
   `contentBlocks` are rendered here; older articles fall back to `body`. */

export type ColumnType = "card" | "image" | "image-text";

/** Inline text formatting shared by blocks and columns. */
export interface TextFormat {
  /** Bold. */
  bold?: boolean;
  /** Italic. */
  italic?: boolean;
  /** Underline. */
  underline?: boolean;
  /** CSS font-family stack, e.g. "Georgia, serif". */
  fontFamily?: string;
}

export interface ColumnItem {
  /** Column display type. */
  type?: ColumnType;
  /** Uploaded image URL / theme slug. */
  src?: string;
  /** Alternate text for the image (accessibility). */
  alt?: string;
  /** Optional header above the body text. */
  heading?: string;
  /** Header alignment. */
  headingAlign?: "left" | "centre" | "center" | "right" | "justify";
  /** Body text — a paragraph that can describe the image. */
  text?: string;
  /** Body text alignment. */
  textAlign?: "left" | "centre" | "center" | "right" | "justify";
  /** Font size in pixels, e.g. "16px". */
  fontSize?: string;
  /** Text colour. */
  color?: string;
  /** Background colour applied to the whole column. */
  bgColumn?: string;
  /** Background colour applied to just the text area. */
  bgText?: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  fontFamily?: string;
}

export interface ContentBlock extends TextFormat {
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
  imageSide?: string;
  left?: string;
  right?: string;
  cols?: number | string;
  items?: ColumnItem[];
  listItems?: string[];
  youtubeId?: string;
  youtubeWidth?: number;
  shapes?: Array<{ kind?: string; fillColor?: string; outlineColor?: string; filled?: boolean; text?: string; textColor?: string; textBold?: boolean; textItalic?: boolean; textUnderline?: boolean; textSize?: number; }>;
  shapeGap?: number;
  shapeWidth?: number;
  shapeHeight?: number;
  question?: string;
  options?: string[];
  correctIndex?: number;
  imgWidth?: number;
}

/** Build CSS properties for bold/italic/underline/font-family/colour. */
export function formatStyle(f: TextFormat & { color?: string }): React.CSSProperties {
  const s: React.CSSProperties = {};
  if (f.bold) s.fontWeight = "bold";
  if (f.italic) s.fontStyle = "italic";
  if (f.underline) s.textDecoration = "underline";
  if (f.fontFamily) s.fontFamily = f.fontFamily;
  if (f.color) s.color = f.color;
  return s;
}

/** Convert CSV-ish table text ("a|b\nc|d") into a 2D array. */
function tableRows(text = ""): string[][] {
  return String(text)
    .split(/\r?\n/)
    .map((row) => row.split("|").map((cell) => cell.trim()))
    .filter((row) => row.some((cell) => cell.length > 0));
}

/** Strip unsafe tags/attributes from rich-text HTML (admin-authored content). */
function sanitizeHtml(html: string): string {
  if (typeof window === "undefined") return html;
  const doc = new DOMParser().parseFromString(html, "text/html");
  doc.querySelectorAll("script,style,link,meta,iframe,object,embed,form,input,button").forEach((el) => el.remove());
  doc.querySelectorAll("*").forEach((el) => {
    [...el.attributes].forEach((attr) => {
      const name = attr.name.toLowerCase();
      if (name.startsWith("on")) el.removeAttribute(attr.name);
      if ((name === "href" || name === "src") && /^\s*javascript:/i.test(attr.value)) {
        el.removeAttribute(attr.name);
      }
    });
  });
  return doc.body.innerHTML;
}

const hasHtml = (s: string) => /<[a-z][\s\S]*>/i.test(s);

/** Unwrap block-level tags so HTML is safe inside a heading (h1–h4). */
function toInlineHtml(html: string): string {
  return html.replace(/<\/?(div|p|h1|h2|h3|h4|section|article|ul|ol|li|blockquote)[^>]*>/gi, "");
}

/** Render rich-text HTML if present, else fall back to plain paragraphs
 *  (for older articles saved before the rich-text editor). */
function RichTextContent({ html }: { html?: string }) {
  const content = html || "";
  if (hasHtml(content)) {
    return <div className="pb-richtext" dangerouslySetInnerHTML={{ __html: sanitizeHtml(content) }} />;
  }
  return (
    <>
      {content
        .split(/\n{2,}/)
        .map((para, i) => (
          <p key={i}>{para}</p>
        ))}
    </>
  );
}

function Img({ src, alt }: { src?: string; alt?: string }) {
  // Uploaded/hosted images (http or base64) render as a real <img>;
  // built-in theme slugs render as branded gradient placeholders.
  if (src && (/^https?:\/\//.test(src) || src.startsWith("data:"))) {
    return <img src={src} alt={alt || ""} loading="lazy" className="w-full rounded-xl" />;
  }
  return <ArticleImage slug={src} className="aspect-[16/9] w-full rounded-xl" />;
}

/* Map a stored alignment value to a CSS text-align, accepting British spelling. */
function textAlign(align?: string): React.CSSProperties["textAlign"] {
  if (align === "centre" || align === "center") return "center";
  if (align === "right") return "right";
  if (align === "justify") return "justify";
  return "left";
}

/* ----------------------------- column render ------------------------------ */

function ColumnNode({ item }: { item: ColumnItem }) {
  const type = item.type || "card";
  const hasImage = Boolean(item.src);
  const hasText = Boolean(item.text);
  const hasHeading = Boolean(item.heading);

  const showImage = hasImage && (type === "image" || type === "image-text" || type === "card");
  const showText = hasText && (type === "image-text" || type === "card");

  // "card" always renders as a bordered padded container; the others only when
  // a column background was explicitly chosen.
  const isCard = type === "card";
  const wrapperStyle: React.CSSProperties = {};
  const wrapperCls = ["pb-column min-w-0"];
  if (isCard) {
    wrapperCls.push("rounded-2xl border border-slate-200 p-4");
  } else if (item.bgColumn) {
    wrapperCls.push("rounded-2xl p-4");
  }
  if (item.bgColumn) wrapperStyle.background = item.bgColumn;

  // Text area styling (alignment, font size, colour, optional text background,
  // plus bold/italic/underline/font-family).
  const textStyle: React.CSSProperties = {
    color: item.color,
    textAlign: textAlign(item.textAlign),
    ...formatStyle(item),
  };
  if (item.fontSize) textStyle.fontSize = item.fontSize;
  if (item.bgText) textStyle.background = item.bgText;
  const textCls = item.bgText ? "text-slate-700 rounded-lg p-3" : "text-slate-700";

  const headingStyle: React.CSSProperties = {
    textAlign: textAlign(item.headingAlign),
    color: item.color,
    ...formatStyle(item),
  };

  return (
    <div className={wrapperCls.join(" ")} style={wrapperStyle}>
      {showImage ? <Img src={item.src} alt={item.alt} /> : null}
      {hasHeading ? (
        <h4
          className="mt-3 mb-1 text-lg font-extrabold leading-snug"
          style={headingStyle}
        >
          {item.heading}
        </h4>
      ) : null}
      {showText ? (
        <div className={textCls} style={textStyle}>
          <RichTextContent html={item.text} />
        </div>
      ) : null}
    </div>
  );
}

/* Local shape renderer for the admin/public BlockRenderer (avoids cross-module
   import of the teacher Shape component). */
function AdminShape({ s, width, height }: { s: NonNullable<ContentBlock["shapes"]>[0]; width: number; height: number }) {
  const filled = s.filled !== false;
  const fill = filled ? (s.fillColor || "#d71920") : "none";
  const stroke = s.outlineColor || "#000000";
  const sw = filled ? 0 : 3;
  const size = Math.min(width, height);
  let svg: ReactNode = null;
  switch (s.kind) {
    case "square": svg = <svg width={size} height={size} viewBox="0 0 100 100"><rect x="6" y="6" width="88" height="88" rx="6" fill={fill} stroke={stroke} strokeWidth={sw || 3} /></svg>; break;
    case "rectangle": svg = <svg width={width} height={Math.max(height, 40)} viewBox="0 0 160 100" preserveAspectRatio="none"><rect x="4" y="8" width="152" height="84" rx="6" fill={fill} stroke={stroke} strokeWidth={sw || 3} /></svg>; break;
    case "line": svg = <svg width={width} height={10} viewBox="0 0 160 10"><line x1="2" y1="5" x2="158" y2="5" stroke={stroke} strokeWidth={3} strokeLinecap="round" /></svg>; break;
    case "triangle": svg = <svg width={width} height={height} viewBox="0 0 120 100"><polygon points="60,8 112,92 8,92" fill={fill} stroke={stroke} strokeWidth={sw || 3} strokeLinejoin="round" /></svg>; break;
    case "circle": svg = <svg width={size} height={size} viewBox="0 0 100 100"><circle cx="50" cy="50" r="46" fill={fill} stroke={stroke} strokeWidth={sw || 3} /></svg>; break;
    case "diamond": svg = <svg width={width} height={height} viewBox="0 0 120 100"><polygon points="60,4 116,50 60,96 4,50" fill={fill} stroke={stroke} strokeWidth={sw || 3} strokeLinejoin="round" /></svg>; break;
    case "star": svg = <svg width={width} height={height} viewBox="0 0 120 120"><polygon points="60,6 74,44 116,46 83,72 95,114 60,90 25,114 37,72 4,46 46,44" fill={fill} stroke={stroke} strokeWidth={sw || 3} strokeLinejoin="round" /></svg>; break;
    default: svg = <svg width={size} height={size} viewBox="0 0 100 100"><rect x="6" y="6" width="88" height="88" rx="6" fill={fill} stroke={stroke} strokeWidth={sw || 3} /></svg>;
  }
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width, height, minWidth: size }}>
      {svg}
      {s.text ? (
        <span className="pointer-events-none absolute inset-0 flex items-center justify-center px-1 text-center font-bold leading-tight" style={{ fontSize: s.textSize || Math.max(12, size * 0.28), color: s.textColor || (filled ? "#fff" : "#000"), fontWeight: s.textBold ? "bold" : "normal", fontStyle: s.textItalic ? "italic" : "normal", textDecoration: s.textUnderline ? "underline" : "none" }}>{s.text}</span>
      ) : null}
    </div>
  );
}

function blockNode(block: ContentBlock): ReactNode {
  switch (block.type) {
    case "heading": {
      const level = Number(block.level) || 2;
      const cls =
        level === 1
          ? "pb-heading text-3xl font-extrabold text-slate-900"
          : level === 2
          ? "pb-heading text-2xl font-extrabold text-slate-900"
          : "pb-heading text-xl font-bold text-slate-900";
      const style: React.CSSProperties = {
        textAlign: textAlign(block.align),
        color: block.color,
        ...formatStyle(block),
      };
      // Headings render inline-formatted HTML (bold/italic/colour on words),
      // with block-level tags stripped so it stays valid inside <h1>…<h4>.
      const raw = block.text || "";
      const html = hasHtml(raw) ? sanitizeHtml(toInlineHtml(raw)) : raw;
      if (level === 1) return <h1 className={cls} style={style} dangerouslySetInnerHTML={{ __html: html }} />;
      if (level === 3) return <h3 className={cls} style={style} dangerouslySetInnerHTML={{ __html: html }} />;
      if (level === 4) return <h4 className={cls} style={style} dangerouslySetInnerHTML={{ __html: html }} />;
      return <h2 className={cls} style={style} dangerouslySetInnerHTML={{ __html: html }} />;
    }
    case "paragraph":
      return (
        <div
          className="pb-paragraph text-slate-700"
          style={{
            fontSize: block.fontSize || undefined,
            textAlign: textAlign(block.align),
            color: block.color || undefined,
            background: block.background || undefined,
            ...formatStyle(block),
          }}
        >
          <RichTextContent html={block.text} />
        </div>
      );
    case "image":
      return (
        <figure className="pb-image">
          <Img src={block.src} />
          {block.caption ? (
            <figcaption style={{ textAlign: textAlign(block.align) }}>{block.caption}</figcaption>
          ) : null}
        </figure>
      );
    case "image-text":
      return (
        <div className={`pb-image-text${block.imageSide === "right" ? " image-right" : ""}`}>
          <div className="pb-img-wrap">
            <Img src={block.src} />
          </div>
          <div className="text-slate-700" style={{ textAlign: textAlign(block.align), ...formatStyle(block) }}>
            <RichTextContent html={block.text} />
          </div>
        </div>
      );
    case "two-col":
      return (
        <div className="pb-two-col">
          <div className="text-slate-700">
            <RichTextContent html={block.left} />
          </div>
          <div className="text-slate-700">
            <RichTextContent html={block.right} />
          </div>
        </div>
      );
    case "quote":
      return (
        <blockquote className="pb-quote text-slate-700" style={{ textAlign: textAlign(block.align), ...formatStyle(block) }}>
          <RichTextContent html={block.text} />
        </blockquote>
      );
    case "divider":
      return <hr className="pb-divider" />;
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
          {block.text ? <RichTextContent html={block.text} /> : null}
          <span className="block clear-both" />
        </div>
      );
    }
    case "list":
      return (
        <ul className="list-disc space-y-1 pl-6 text-slate-700" style={{ textAlign: textAlign(block.align) }}>
          {(block.listItems || []).filter(Boolean).map((it, i) => <li key={i}>{it}</li>)}
        </ul>
      );
    case "question": {
      // NO answer highlighting — all options look identical to avoid giving hints.
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
    }
    case "shape": {
      const shapes = block.shapes || [];
      if (!shapes.length) return null;
      const shapeGap = Number(block.shapeGap) || 8;
      const sw = Number(block.shapeWidth) || 80;
      const sh = Number(block.shapeHeight) || 80;
      return (
        <div className="flex flex-wrap items-center justify-center p-2" style={{ gap: `${shapeGap}px` }}>
          {shapes.map((s, i) => (
            <AdminShape key={i} s={s} width={sw} height={sh} />
          ))}
        </div>
      );
    }
    case "button":
      return (
        <a className="pb-button" href={block.link || "#"} target="_blank" rel="noreferrer">
          {block.text || "Learn more"}
        </a>
      );
    case "wrap-image": {
      const imgW = Number(block.imgWidth) || 240;
      return (
        <div className={`pb-wrap-image${block.imageSide === "right" ? " image-right" : ""}`}>
          {block.src && (/^https?:\/\//.test(block.src) || block.src.startsWith("data:")) ? (
            <img src={block.src} alt="" style={{ width: imgW, height: "auto" }} />
          ) : (
            <Img src={block.src} />
          )}
          <div className="text-slate-700" style={{ textAlign: textAlign(block.align), ...formatStyle(block) }}>
            <RichTextContent html={block.text} />
          </div>
        </div>
      );
    }
    case "table": {
      const rows = tableRows(block.text);
      if (!rows.length) return null;
      const [head, ...body] = rows;
      return (
        <div className="pb-table-wrap">
          <table className="pb-table">
            <thead>
              <tr>
                {head.map((c, i) => (
                  <th key={i}>{c}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {body.map((row, r) => (
                <tr key={r}>
                  {row.map((c, i) => (
                    <td key={i}>{c}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }
    case "columns": {
      const count = Number(block.cols) || 2;
      return (
        <div className={`pb-columns cols-${count}`}>
          {(block.items || []).map((item, i) => (
            <ColumnNode key={i} item={item} />
          ))}
        </div>
      );
    }
    default:
      return null;
  }
}

export function BlockRenderer({ blocks }: { blocks: ContentBlock[] }) {
  return (
    <div className="article-body mt-5 space-y-0">
      {blocks.map((block, i) => (
        <Fragment key={i}>{blockNode(block)}</Fragment>
      ))}
    </div>
  );
}
