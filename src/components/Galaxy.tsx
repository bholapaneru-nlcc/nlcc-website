import { useMemo } from "react";

/* --------------------------------- galaxy --------------------------------- */
// A deep-space backdrop for the homepage hero: a dark sky, drifting nebula
// clouds in the four brand colours (red, sky blue, purple, green), a dense
// twinkling starfield, and a few brighter coloured stars. The solar system
// (logo sun + planets) sits on top of this layer.

// Deterministic pseudo-random so the stars never shift between renders.
function seeded(n: number): number {
  const x = Math.sin(n * 999.13) * 43758.5453;
  return x - Math.floor(x);
}

interface Star {
  top: number;
  left: number;
  size: number;
  delay: number;
  duration: number;
  opacity: number;
}

const STAR_COUNT = 150;
const BRAND_COLOURS = ["#d71920", "#38bdf8", "#8b5cf6", "#22c55e"];

interface Planet {
  name: string;
  top: number; // vertical position as % of the galaxy
  left: number; // horizontal position as % of the galaxy
  size: number; // px
  duration: number; // drift cycle length (s)
  delay: number; // staggered start (s)
  color: string;
  glow: string;
  ring?: boolean; // Saturn
}

// The 8 planets scattered across the galaxy (authentic colours). Positions are
// spread top-to-bottom and side-to-side so they're visible at every size.
const PLANETS: Planet[] = [
  { name: "Mercury", top: 68, left: 9, size: 7, duration: 9, delay: 0, color: "#b8b0a8", glow: "rgba(214,205,193,0.85)" },
  { name: "Venus", top: 28, left: 84, size: 10, duration: 12, delay: 1.5, color: "#e7c9a0", glow: "rgba(231,201,160,0.85)" },
  { name: "Earth", top: 82, left: 76, size: 11, duration: 14, delay: 3, color: "#3b82f6", glow: "rgba(59,130,246,0.9)" },
  { name: "Mars", top: 20, left: 13, size: 9, duration: 11, delay: 0.8, color: "#e25822", glow: "rgba(226,88,34,0.85)" },
  { name: "Jupiter", top: 58, left: 92, size: 16, duration: 18, delay: 2.2, color: "#d6a36b", glow: "rgba(214,163,107,0.8)" },
  { name: "Saturn", top: 90, left: 42, size: 14, duration: 16, delay: 4, color: "#e3c77f", glow: "rgba(227,199,127,0.8)", ring: true },
  { name: "Uranus", top: 14, left: 52, size: 12, duration: 13, delay: 1.2, color: "#7fdbe8", glow: "rgba(127,219,232,0.85)" },
  { name: "Neptune", top: 46, left: 5, size: 12, duration: 15, delay: 2.8, color: "#4f6ef0", glow: "rgba(79,110,240,0.9)" },
];

export function Galaxy() {
  const stars = useMemo<Star[]>(
    () =>
      Array.from({ length: STAR_COUNT }, (_, i) => ({
        top: seeded(i) * 100,
        left: seeded(i + 1000) * 100,
        size: seeded(i + 2000) * 1.8 + 0.5,
        delay: seeded(i + 3000) * 5,
        duration: seeded(i + 4000) * 3 + 2,
        opacity: seeded(i + 5000) * 0.6 + 0.25,
      })),
    [],
  );

  const colouredStars = useMemo(
    () =>
      Array.from({ length: 28 }, (_, i) => ({
        top: seeded(i + 6000) * 100,
        left: seeded(i + 7000) * 100,
        size: seeded(i + 8000) * 2.2 + 1.5,
        delay: seeded(i + 9000) * 4,
        duration: seeded(i + 10000) * 4 + 3,
        colour: BRAND_COLOURS[i % BRAND_COLOURS.length],
      })),
    [],
  );

  return (
    <div className="absolute inset-0 overflow-hidden">
      {/* deep-space base */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 90% 80% at 50% 38%, #0c1230 0%, #070a1c 55%, #03040c 100%)",
        }}
      />

      {/* nebula clouds in the four brand colours, one per corner */}
      <div
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(ellipse 42% 36% at 16% 20%, rgba(215,25,32,0.22), transparent 60%),
            radial-gradient(ellipse 40% 34% at 84% 24%, rgba(56,189,248,0.22), transparent 60%),
            radial-gradient(ellipse 44% 38% at 82% 80%, rgba(139,92,246,0.22), transparent 60%),
            radial-gradient(ellipse 42% 36% at 16% 78%, rgba(34,197,94,0.20), transparent 60%)
          `,
        }}
      />

      {/* faint diagonal galactic band for depth */}
      <div
        className="absolute inset-0 opacity-40"
        style={{
          background:
            "linear-gradient(115deg, transparent 38%, rgba(255,255,255,0.06) 48%, rgba(56,189,248,0.08) 52%, transparent 62%)",
        }}
      />

      {/* twinkling white stars */}
      {stars.map((s, i) => (
        <span
          key={`w-${i}`}
          className="absolute rounded-full bg-white"
          style={{
            top: `${s.top}%`,
            left: `${s.left}%`,
            width: s.size,
            height: s.size,
            opacity: s.opacity,
            animation: `nlcc-twinkle ${s.duration}s ease-in-out ${s.delay}s infinite`,
          }}
        />
      ))}

      {/* brighter brand-coloured stars */}
      {colouredStars.map((s, i) => (
        <span
          key={`c-${i}`}
          className="absolute rounded-full"
          style={{
            top: `${s.top}%`,
            left: `${s.left}%`,
            width: s.size,
            height: s.size,
            background: s.colour,
            boxShadow: `0 0 ${s.size * 3}px ${s.colour}`,
            animation: `nlcc-twinkle ${s.duration}s ease-in-out ${s.delay}s infinite`,
          }}
        />
      ))}

      {/* scattered planets — drifting across the galaxy, no orbit. Spread out
          so they're visible on mobile and desktop. */}
      {PLANETS.map((p) => (
        <span
          key={p.name}
          className="absolute block rounded-full"
          style={{
            top: `${p.top}%`,
            left: `${p.left}%`,
            width: p.size,
            height: p.size,
            background: p.color,
            boxShadow: `0 0 ${p.size}px ${p.size / 2}px ${p.glow}`,
            animation: `nlcc-drift ${p.duration}s ease-in-out ${p.delay}s infinite`,
          }}
        >
          {p.ring ? (
            <span
              className="absolute left-1/2 top-1/2"
              style={{
                width: p.size * 2.6,
                height: p.size * 0.85,
                border: "1.5px solid rgba(227,199,127,0.5)",
                borderRadius: "50%",
                transform: "translate(-50%,-50%) rotate(-18deg)",
              }}
            />
          ) : null}
        </span>
      ))}
    </div>
  );
}
