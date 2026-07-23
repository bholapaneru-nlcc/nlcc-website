import {
  motion,
  useInView,
  useMotionValue,
  useSpring,
  useTransform,
  type Variants,
} from "motion/react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "../utils/cn";

const EASE = [0.22, 1, 0.36, 1] as const;

/* Reveal — fade + rise when scrolled into view (once). */
export function Reveal({
  children,
  className,
  delay = 0,
  y = 26,
  once = true,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  y?: number;
  once?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once, margin: "-10% 0px" });
  return (
    <motion.div
      ref={ref}
      className={className}
      initial={{ opacity: 0, y }}
      animate={inView ? { opacity: 1, y: 0 } : undefined}
      transition={{ duration: 0.8, ease: EASE, delay }}
    >
      {children}
    </motion.div>
  );
}

/* MaskReveal — text rises up from behind a clip mask, word by word. */
export function MaskReveal({
  text,
  className,
  wordClassName,
  delay = 0,
  stagger = 0.05,
  as = "div",
}: {
  text: string;
  className?: string;
  wordClassName?: string;
  delay?: number;
  stagger?: number;
  as?: "div" | "h1" | "h2" | "h3" | "p";
}) {
  const words = text.split(" ").filter(Boolean);
  const Tag = motion[as] as typeof motion.div;
  return (
    <Tag className={cn("flex flex-wrap", className)} style={{ rowGap: "0.12em" }}>
      {words.map((word, i) => (
        // Outer box: hidden overflow creates the "mask". Generous top + bottom
        // padding (and line-height below) give scripts with tall ascenders or
        // descenders — like Devanagari (नेपाली) — room so glyphs are never clipped.
        <span key={i} className="overflow-hidden pb-[0.2em] pt-[0.14em]">
          <motion.span
            // pr adds a real gap AFTER each word, restoring the spaces that
            // text.split(" ") removed (otherwise words run together).
            className={cn("inline-block pr-[0.28em] leading-[1.25]", wordClassName)}
            initial={{ y: "110%" }}
            whileInView={{ y: 0 }}
            viewport={{ once: true, margin: "-10% 0px" }}
            transition={{ duration: 0.9, ease: EASE, delay: delay + i * stagger }}
          >
            {word}
          </motion.span>
        </span>
      ))}
    </Tag>
  );
}

/* Stagger — children reveal together with a cascading delay. */
export const staggerParent: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.09, delayChildren: 0.08 } },
};
export const staggerChild: Variants = {
  hidden: { opacity: 0, y: 22 },
  show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: EASE } },
};

export function Stagger({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <motion.div className={className} variants={staggerParent} initial="hidden" whileInView="show" viewport={{ once: true, margin: "-8% 0px" }}>
      {children}
    </motion.div>
  );
}

export const StaggerItem = motion.div;

/* Counter — animated number count-up when scrolled into view. */
export function Counter({
  to,
  from = 0,
  duration = 1.6,
  className,
  suffix = "",
  prefix = "",
}: {
  to: number;
  from?: number;
  duration?: number;
  className?: string;
  suffix?: string;
  prefix?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const [val, setVal] = useState(from);

  useEffect(() => {
    if (!inView) return;
    let raf = 0;
    let start: number | null = null;
    const tick = (now: number) => {
      if (start === null) start = now;
      const p = Math.min(1, (now - start) / (duration * 1000));
      const eased = 1 - Math.pow(1 - p, 3);
      setVal(from + (to - from) * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, to, from, duration]);

  return (
    <span ref={ref} className={className}>
      {prefix}
      {Math.round(val)}
      {suffix}
    </span>
  );
}

/* Magnetic — element drifts toward the cursor. */
export function Magnetic({
  children,
  className,
  strength = 0.3,
}: {
  children: ReactNode;
  className?: string;
  strength?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 200, damping: 15 });
  const sy = useSpring(y, { stiffness: 200, damping: 15 });

  return (
    <motion.div
      ref={ref}
      style={{ x: sx, y: sy }}
      className={cn("inline-block", className)}
      onMouseMove={(e) => {
        const r = ref.current!.getBoundingClientRect();
        x.set((e.clientX - (r.left + r.width / 2)) * strength);
        y.set((e.clientY - (r.top + r.height / 2)) * strength);
      }}
      onMouseLeave={() => {
        x.set(0);
        y.set(0);
      }}
    >
      {children}
    </motion.div>
  );
}

/* TiltCard — 3D perspective tilt that follows the cursor + glare. */
export function TiltCard({
  children,
  className,
  intensity = 7,
}: {
  children: ReactNode;
  className?: string;
  intensity?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const px = useMotionValue(0.5);
  const py = useMotionValue(0.5);
  const rx = useSpring(useTransform(py, [0, 1], [intensity, -intensity]), { stiffness: 150, damping: 16 });
  const ry = useSpring(useTransform(px, [0, 1], [-intensity, intensity]), { stiffness: 150, damping: 16 });
  const gx = useTransform(px, [0, 1], ["0%", "100%"]);
  const gy = useTransform(py, [0, 1], ["0%", "100%"]);

  return (
    <motion.div
      ref={ref}
      style={{ rotateX: rx, rotateY: ry, transformPerspective: 900 }}
      className={cn("relative [transform-style:preserve-3d]", className)}
      onMouseMove={(e) => {
        const r = ref.current!.getBoundingClientRect();
        px.set((e.clientX - r.left) / r.width);
        py.set((e.clientY - r.top) / r.height);
      }}
      onMouseLeave={() => {
        px.set(0.5);
        py.set(0.5);
      }}
    >
      {children}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-[inherit] opacity-0 transition-opacity duration-300 [background:radial-gradient(circle_at_var(--gx) var(--gy),rgba(255,255,255,0.45),transparent_55%)] group-hover:opacity-100"
        style={{ ["--gx" as string]: gx, ["--gy" as string]: gy }}
      />
    </motion.div>
  );
}

/* Marquee — infinite horizontal scroll, edge-masked. */
export function Marquee({
  items,
  separator = "✦",
  className,
  duration = 32,
  reverse = false,
}: {
  items: ReactNode[];
  separator?: ReactNode;
  className?: string;
  duration?: number;
  reverse?: boolean;
}) {
  const doubled = [...items, ...items];
  return (
    <div
      className={cn("group relative flex w-full overflow-hidden", className)}
      style={{
        maskImage: "linear-gradient(to right, transparent, #000 6%, #000 94%, transparent)",
        WebkitMaskImage: "linear-gradient(to right, transparent, #000 6%, #000 94%, transparent)",
      }}
    >
      <div
        className="flex shrink-0 items-center"
        style={{ animation: `${reverse ? "scroll-marquee-rev" : "scroll-marquee"} ${duration}s linear infinite` }}
      >
        {doubled.map((item, i) => (
          <span key={i} className="flex items-center">
            <span className="whitespace-nowrap px-5">{item}</span>
            <span className="text-slate-300">{separator}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
