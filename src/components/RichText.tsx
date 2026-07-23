import { useEffect, useRef, useState } from "react";

/* ------------------------ inline rich text editor ------------------------- */
//
// A lightweight (zero-dependency) rich text editor that behaves like Google
// Docs / MS Word: you SELECT some text and click Bold / Italic / Underline,
// pick a Font, or pick a Colour — and only the highlighted words change.
//
// It uses the browser's built-in contentEditable + document.execCommand, and
// outputs HTML which the renderer shows on the live article page.

const FONTS: { label: string; value: string }[] = [
  { label: "Default", value: "" },
  { label: "Arial", value: "Arial, Helvetica, sans-serif" },
  { label: "Helvetica", value: "Helvetica, Arial, sans-serif" },
  { label: "Georgia", value: "Georgia, 'Times New Roman', serif" },
  { label: "Times New Roman", value: "'Times New Roman', Times, serif" },
  { label: "Courier New", value: "'Courier New', Courier, monospace" },
  { label: "Verdana", value: "Verdana, Geneva, sans-serif" },
  { label: "Trebuchet MS", value: "'Trebuchet MS', Helvetica, sans-serif" },
  { label: "Comic Sans MS", value: "'Comic Sans MS', cursive" },
  { label: "Impact", value: "Impact, Haettenschweiler, sans-serif" },
  { label: "Inter", value: "Inter, sans-serif" },
  { label: "Roboto", value: "Roboto, sans-serif" },
  { label: "Open Sans", value: "'Open Sans', sans-serif" },
  { label: "Lora", value: "Lora, Georgia, serif" },
  { label: "Poppins", value: "Poppins, sans-serif" },
  { label: "Montserrat", value: "Montserrat, sans-serif" },
  { label: "Merriweather", value: "Merriweather, Georgia, serif" },
  { label: "Playfair Display", value: "'Playfair Display', Georgia, serif" },
  { label: "Oswald", value: "Oswald, sans-serif" },
  { label: "Noto Sans Devanagari", value: "'Noto Sans Devanagari', sans-serif" },
];

const SWATCHES = [
  "#0f172a", "#dc2626", "#ea580c", "#d97706", "#ca8a04",
  "#16a34a", "#0891b2", "#2563eb", "#7c3aed", "#db2777",
  "#ffffff", "#94a3b8",
];

function rgbToHex(v: string): string {
  if (!v) return "";
  if (v.startsWith("#")) return v.toLowerCase();
  const m = v.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
  if (!m) return "";
  return (
    "#" +
    [m[1], m[2], m[3]]
      .map((n) => Number(n).toString(16).padStart(2, "0"))
      .join("")
  );
}

export function RichText({
  value,
  onChange,
  placeholder = "Type here…",
  minHeight = 96,
}: {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: number;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [, setTick] = useState(0);
  const [fontOpen, setFontOpen] = useState(false);
  const [curColor, setCurColor] = useState("#0f172a");
  const refresh = () => setTick((t) => t + 1);

  // Initialise the editable content once.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    try {
      document.execCommand("defaultParagraphSeparator", false, "p");
      document.execCommand("styleWithCSS", false, "true");
    } catch {
      /* ignore */
    }
    if (el.innerHTML !== (value || "")) el.innerHTML = value || "";
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const emit = () => {
    const el = ref.current;
    if (!el) return;
    // keep the :empty placeholder working
    if (el.textContent.trim() === "" && !el.querySelector("img")) el.innerHTML = "";
    onChange(el.innerHTML);
  };

  const fire = (cmd: string, val?: string) => {
    const el = ref.current;
    if (!el) return;
    el.focus();
    try {
      document.execCommand(cmd, false, val);
    } catch {
      /* ignore */
    }
    emit();
    refresh();
  };

  const isActive = (cmd: string) => {
    try {
      return document.queryCommandState(cmd);
    } catch {
      return false;
    }
  };

  // Toolbar buttons use onMouseDown + preventDefault so the editable keeps its
  // selection (this is what makes "highlight → click" work reliably).
  const btn = (cmd: string, content: React.ReactNode, title: string) => (
    <button
      type="button"
      title={title}
      onMouseDown={(e) => {
        e.preventDefault();
        fire(cmd);
      }}
      className={`rt-btn ${isActive(cmd) ? "rt-btn-on" : ""}`}
    >
      {content}
    </button>
  );

  return (
    <div className="rt">
      <div className="rt-toolbar">
        {btn("bold", <b>B</b>, "Bold")}
        {btn("italic", <i>I</i>, "Italic")}
        {btn("underline", <u>U</u>, "Underline")}

        <span className="rt-sep" />

        {/* Font dropdown */}
        <div className="rt-fontwrap">
          <button
            type="button"
            className="rt-fontbtn"
            onMouseDown={(e) => {
              e.preventDefault();
              setFontOpen((o) => !o);
              refresh();
            }}
          >
            Font <span className="rt-caret">▾</span>
          </button>
          {fontOpen ? (
            <>
              <div
                className="rt-backdrop"
                onMouseDown={(e) => {
                  e.preventDefault();
                  setFontOpen(false);
                }}
              />
              <div className="rt-fontmenu">
                {FONTS.map((f) => (
                  <button
                    key={f.label}
                    type="button"
                    className="rt-fontitem"
                    style={{ fontFamily: f.value || undefined }}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      fire("fontName", f.value);
                      setFontOpen(false);
                    }}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </>
          ) : null}
        </div>

        <span className="rt-sep" />

        {/* Colour swatches + custom colour */}
        <div className="rt-swatches">
          {SWATCHES.map((c) => (
            <button
              key={c}
              type="button"
              title={`Text colour ${c}`}
              onMouseDown={(e) => {
                e.preventDefault();
                fire("foreColor", c);
              }}
              className="rt-swatch"
              style={{ background: c }}
            />
          ))}
          <label
            className="rt-swatch rt-swatch-pick"
            title="Custom colour"
            style={{ background: "conic-gradient(red,orange,yellow,lime,cyan,blue,magenta,red)" }}
          >
            <input
              type="color"
              value={curColor}
              onChange={(e) => {
                setCurColor(e.target.value);
                fire("foreColor", e.target.value);
              }}
              className="rt-colorinput"
            />
          </label>
        </div>

      </div>

      <div
        ref={ref}
        className="rt-area"
        contentEditable
        suppressContentEditableWarning
        data-ph={placeholder}
        style={{ minHeight }}
        onInput={emit}
        onKeyUp={refresh}
        onMouseUp={refresh}
        onBlur={() => {
          emit();
          refresh();
        }}
      />
      {/* hidden helpers so rgbToHex/curColor stay referenced */}
      <span hidden>{rgbToHex("")}</span>
    </div>
  );
}
