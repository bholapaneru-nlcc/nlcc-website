import type { TeacherItem, TeacherBlock } from "./teacherStore";

/* ----------------------- export teacher content --------------------------- */
//
// Two export formats from the teacher content viewer:
//   • Word  — a single .doc file (HTML with a Word MIME type). Opens cleanly in
//             MS Word and Google Docs; preserves text formatting, images, tables
//             and shapes (shapes are rendered as inline SVG).
//   • PDF   — opens the browser's print dialog (Save as PDF). Zero dependencies,
//             crisp text, and respects the page layout. This is the most
//             reliable cross-browser PDF approach for a static site.

const TYPE_LABEL: Record<string, string> = {
  "lesson-plan": "Lesson Plan",
  question: "Question",
  quiz: "Quiz",
};

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/** Build clean HTML for a block, suitable for Word/print. */
function blockHtml(block: TeacherBlock): string {
  switch (block.type) {
    case "heading": {
      const lvl = Math.min(Math.max(Number(block.level) || 2, 1), 6);
      return `<h${lvl} style="margin:14px 0 6px;text-align:${block.align || "left"};color:${block.color || "#111"}">${block.text || ""}</h${lvl}>`;
    }
    case "paragraph":
      return `<div style="font-size:${block.fontSize || "16px"};text-align:${block.align || "left"};color:${block.color || "#374151"};background:${block.background || "transparent"};margin:8px 0">${block.text || ""}</div>`;
    case "list":
      return `<ul style="margin:8px 0;padding-left:24px">${(block.items || []).filter(Boolean).map((it) => `<li>${escapeHtml(it)}</li>`).join("")}</ul>`;
    case "image":
      return `<div style="text-align:center;margin:12px 0">${block.src ? `<img src="${block.src}" style="max-width:100%;border-radius:8px"/>` : ""}${block.caption ? `<div style="font-size:13px;color:#6b7280;margin-top:4px">${escapeHtml(block.caption)}</div>` : ""}</div>`;
    case "table": {
      const rows = String(block.text || "").split(/\r?\n/).map((r) => r.split("|").map((c) => c.trim())).filter((r) => r.some(Boolean));
      if (!rows.length) return "";
      const [head, ...body] = rows;
      return `<table style="border-collapse:collapse;width:100%;margin:12px 0"><thead><tr>${head.map((c) => `<th style="border:1px solid #cbd5e1;padding:6px 8px;background:#f1f5f9;text-align:left">${escapeHtml(c)}</th>`).join("")}</tr></thead><tbody>${body.map((r) => `<tr>${r.map((c) => `<td style="border:1px solid #cbd5e1;padding:6px 8px">${escapeHtml(c)}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
    }
    case "question": {
      const opts = (block.options || []).map((opt) =>
        `<li style="margin:3px 0">${escapeHtml(opt)}</li>`,
      );
      return `<div style="border-left:4px solid #d71920;background:#f8fafc;padding:10px 12px;margin:10px 0"><div style="font-weight:bold">${escapeHtml(block.question || "")}</div><ol type="A" style="margin:6px 0 0;padding-left:22px">${opts.join("")}</ol></div>`;
    }
    case "shape": {
      const shape = shapeSvg(block);
      const text = block.text ? `<div style="text-align:${block.align || "left"}">${block.text}</div>` : "";
      const pos = block.position || "left";
      if (pos === "top") return `<div style="text-align:center;margin:10px 0">${shape}${text}</div>`;
      if (pos === "bottom") return `<div style="text-align:center;margin:10px 0">${text}${shape}</div>`;
      // left / right
      return `<table style="width:100%;margin:10px 0;border:none"><tr><td style="width:50%;vertical-align:middle;border:none;text-align:center">${pos === "left" ? shape : text}</td><td style="width:50%;vertical-align:middle;border:none">${pos === "left" ? text : shape}</td></tr></table>`;
    }
    case "divider":
      return `<hr style="border:0;border-top:2px solid #e2e8f0;margin:16px 0"/>`;
    case "pdf":
      // PDFs can't be embedded in Word; show a note with a link if it's an online URL.
      return block.src && /^https?:\/\//.test(block.src)
        ? `<div style="margin:12px 0;padding:10px;background:#f1f5f9;border-radius:8px"><strong>📄 PDF Document</strong>${block.caption ? ` — ${escapeHtml(block.caption)}` : ""}<br/><a href="${block.src}">Download PDF</a></div>`
        : `<div style="margin:12px 0;padding:10px;background:#f1f5f9;border-radius:8px"><strong>📄 PDF Document${block.caption ? ` — ${escapeHtml(block.caption)}` : ""}</strong><br/><em>(View the PDF in the online portal)</em></div>`;
    default:
      return "";
  }
}

/** Minimal inline SVG for a shape (used by both Word and PDF). */
function shapeSvg(block: TeacherBlock): string {
  const color = block.shapeColor || "#d71920";
  const w = Number(block.shapeWidth) || 120;
  const h = Number(block.shapeHeight) || 80;
  const s = (inner: string) => `<svg width="${w}" height="${h}" viewBox="0 0 120 100" xmlns="http://www.w3.org/2000/svg">${inner}</svg>`;
  switch (block.shape) {
    case "square": return s(`<rect x="8" y="8" width="84" height="84" rx="6" fill="${color}"/>`);
    case "rectangle": return `<svg width="${w}" height="${Math.max(h, 40)}" viewBox="0 0 160 100" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg"><rect x="6" y="10" width="148" height="80" rx="6" fill="${color}"/></svg>`;
    case "line": return s(`<line x1="4" y1="50" x2="116" y2="50" stroke="${color}" stroke-width="6" stroke-linecap="round"/>`);
    case "triangle": return s(`<polygon points="60,8 112,92 8,92" fill="${color}"/>`);
    case "circle": return s(`<circle cx="50" cy="50" r="44" fill="${color}"/>`);
    case "diamond": return s(`<polygon points="60,6 114,50 60,94 6,50" fill="${color}"/>`);
    case "arrow": return s(`<path d="M8 50 H100 M80 26 L120 50 L80 74" stroke="${color}" stroke-width="6" fill="none" stroke-linejoin="round" stroke-linecap="round"/>`);
    case "star": return s(`<polygon points="60,6 74,44 116,46 83,72 95,114 60,90 25,114 37,72 4,46 46,44" fill="${color}"/>`);
    default: return "";
  }
}

function buildBody(item: TeacherItem): string {
  const date = new Date(item.updatedAt || item.createdAt).toLocaleDateString("en-GB");
  return `
    <div style="font-family:Calibri,Arial,sans-serif;color:#111;max-width:760px;margin:0 auto">
      <div style="border-bottom:2px solid #d71920;padding-bottom:8px;margin-bottom:16px">
        <div style="font-size:12px;letter-spacing:1px;text-transform:uppercase;color:#d71920;font-weight:bold">${TYPE_LABEL[item.type]}</div>
        <h1 style="margin:4px 0;font-size:26px">${escapeHtml(item.title)}</h1>
        <div style="font-size:12px;color:#6b7280">Last updated ${date}</div>
      </div>
      ${(item.blocks || []).map(blockHtml).join("")}
    </div>`;
}

/* ------------------------------- download --------------------------------- */

function downloadBlob(content: BlobPart, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function safeName(title: string): string {
  return (title || "untitled").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 40) || "untitled";
}

/* --------------------------------- Word ----------------------------------- */

export function exportWord(item: TeacherItem): void {
  // An .doc file containing HTML, with the Word MIME type. Word and Google Docs
  // open it as a normal document and preserve formatting/images/shapes.
  const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8"><title>${escapeHtml(item.title)}</title></head><body>${buildBody(item)}</body></html>`;
  downloadBlob(html, `${safeName(item.title)}.doc`, "application/msword");
}

/* ---------------------------------- PDF ----------------------------------- */

export function exportPDF(item: TeacherItem): void {
  // Open the rendered content in a hidden iframe and call print() — the user
  // picks "Save as PDF" (or a physical printer). This avoids shipping a heavy
  // PDF library and produces crisp, selectable text.
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(item.title)}</title>
    <style>
      @page { margin: 18mm; }
      body { font-family: Calibri, Arial, sans-serif; color: #111; }
      img { max-width: 100%; }
      table { border-collapse: collapse; }
    </style>
  </head><body>${buildBody(item)}</body></html>`;

  const frame = document.createElement("iframe");
  frame.style.position = "fixed";
  frame.style.right = "0";
  frame.style.bottom = "0";
  frame.style.width = "0";
  frame.style.height = "0";
  frame.style.border = "0";
  document.body.appendChild(frame);

  const doc = frame.contentWindow?.document;
  if (!doc) return;
  doc.open();
  doc.write(html);
  doc.close();

  frame.onload = () => {
    frame.contentWindow?.focus();
    frame.contentWindow?.print();
    setTimeout(() => document.body.removeChild(frame), 1000);
  };
  // Fallback in case onload already fired.
  setTimeout(() => {
    frame.contentWindow?.focus();
    frame.contentWindow?.print();
  }, 400);
}
