/* -------------------------------- shapes ---------------------------------- */
// Reusable SVG shapes with fill colour, outline colour, and optional internal
// text (rendered in the centre). Used by the teacher content builder.

export type ShapeKind =
  | "square"
  | "rectangle"
  | "line"
  | "triangle"
  | "circle"
  | "diamond"
  | "arrow"
  | "star";

export const SHAPE_OPTIONS: { value: ShapeKind; label: string }[] = [
  { value: "square", label: "Square" },
  { value: "rectangle", label: "Rectangle" },
  { value: "line", label: "Line" },
  { value: "triangle", label: "Triangle" },
  { value: "circle", label: "Circle" },
  { value: "diamond", label: "Diamond" },
  { value: "arrow", label: "Arrow" },
  { value: "star", label: "Star" },
];

export interface ShapeConfig {
  kind?: ShapeKind;
  fillColor?: string;
  outlineColor?: string;
  filled?: boolean;
  text?: string;
  textColor?: string;
  textBold?: boolean;
  textItalic?: boolean;
  textUnderline?: boolean;
  textSize?: number;
  width?: number;
  height?: number;
}

export function Shape({
  kind,
  fillColor = "#ffffff",
  outlineColor = "#000000",
  filled = false,
  text,
  textColor = "#000000",
  textBold = false,
  textItalic = false,
  textUnderline = false,
  textSize,
  width = 80,
  height = 80,
}: ShapeConfig) {
  const size = Math.min(width, height);
  const fillVal = filled ? fillColor : "none";
  const strokeW = filled ? 0 : 3;

  let svg: React.ReactNode = null;

  switch (kind) {
    case "square":
      svg = <svg width={size} height={size} viewBox="0 0 100 100"><rect x="6" y="6" width="88" height="88" rx="6" fill={fillVal} stroke={outlineColor} strokeWidth={strokeW || 3} /></svg>;
      break;
    case "rectangle":
      svg = <svg width={width} height={Math.max(height, 40)} viewBox="0 0 160 100" preserveAspectRatio="none"><rect x="4" y="8" width="152" height="84" rx="6" fill={fillVal} stroke={outlineColor} strokeWidth={strokeW || 3} /></svg>;
      break;
    case "line":
      svg = <svg width={width} height={10} viewBox="0 0 160 10"><line x1="2" y1="5" x2="158" y2="5" stroke={outlineColor} strokeWidth={3} strokeLinecap="round" /></svg>;
      break;
    case "triangle":
      svg = <svg width={width} height={height} viewBox="0 0 120 100"><polygon points="60,8 112,92 8,92" fill={fillVal} stroke={outlineColor} strokeWidth={strokeW || 3} strokeLinejoin="round" /></svg>;
      break;
    case "circle":
      svg = <svg width={size} height={size} viewBox="0 0 100 100"><circle cx="50" cy="50" r="46" fill={fillVal} stroke={outlineColor} strokeWidth={strokeW || 3} /></svg>;
      break;
    case "diamond":
      svg = <svg width={width} height={height} viewBox="0 0 120 100"><polygon points="60,4 116,50 60,96 4,50" fill={fillVal} stroke={outlineColor} strokeWidth={strokeW || 3} strokeLinejoin="round" /></svg>;
      break;
    case "arrow":
      svg = <svg width={width} height={height} viewBox="0 0 160 80"><path d="M8 40 H120 M100 16 L140 40 L100 64" fill="none" stroke={filled ? fillColor : outlineColor} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" /></svg>;
      break;
    case "star":
      svg = <svg width={width} height={height} viewBox="0 0 120 120"><polygon points="60,6 74,44 116,46 83,72 95,114 60,90 25,114 37,72 4,46 46,44" fill={fillVal} stroke={outlineColor} strokeWidth={strokeW || 3} strokeLinejoin="round" /></svg>;
      break;
    default:
      return null;
  }

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width, height, minWidth: size }}>
      {svg}
      {text ? (
        <span
          className="pointer-events-none absolute inset-0 flex items-center justify-center px-1 text-center leading-tight"
          style={{
            fontSize: textSize ? textSize : Math.max(12, size * 0.28),
            color: textColor || (filled ? "#fff" : "#000000"),
            fontWeight: textBold ? "bold" : "normal",
            fontStyle: textItalic ? "italic" : "normal",
            textDecoration: textUnderline ? "underline" : "none",
          }}
        >
          {text}
        </span>
      ) : null}
    </div>
  );
}
