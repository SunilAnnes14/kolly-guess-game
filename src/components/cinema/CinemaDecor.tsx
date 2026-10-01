import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { useEffect, useId, useMemo, useRef, useState } from "react";

/**
 * Vintage Tamil-cinema graphics.
 *
 * Every piece here is drawn in the KOLLYWOOD palette — burnt black, dark olive
 * and aged paper. Nothing glows, nothing is gold. They behave like the objects
 * in a projection room: real shapes, matte surfaces, low opacity in the
 * background and full presence only for the hero moment.
 */

/* ------------------------------------------------------------------ */
/* Film grain + dust                                                   */
/* ------------------------------------------------------------------ */

/** Full-bleed film grain and projector dust motes. */
export function FilmGrain({ motes = 14 }: { motes?: number }) {
  const dust = useMemo(
    () =>
      Array.from({ length: motes }, (_, index) => ({
        id: index,
        left: (index * 53) % 100,
        top: 30 + ((index * 29) % 65),
        size: 1 + (index % 3),
        delay: (index % 9) * 1.1,
        duration: 9 + (index % 6) * 1.6,
      })),
    [motes],
  );

  return (
    <div aria-hidden className="grain pointer-events-none fixed inset-0 z-0">
      {dust.map((mote) => (
        <span
          key={mote.id}
          className="animate-dust absolute rounded-full bg-[#c0bba1]"
          style={{
            left: `${mote.left}%`,
            top: `${mote.top}%`,
            width: mote.size,
            height: mote.size,
            opacity: 0.18,
            animationDelay: `${mote.delay}s`,
            animationDuration: `${mote.duration}s`,
          }}
        />
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Cinema objects                                                      */
/* ------------------------------------------------------------------ */

/** A 35mm film reel. Matte olive + paper, spins slowly when asked. */
export function FilmReel({
  className,
  spin = false,
  speed = "slow",
}: {
  className?: string;
  spin?: boolean;
  speed?: "slow" | "normal";
}) {
  const holes = [0, 60, 120, 180, 240, 300];
  return (
    <svg
      viewBox="0 0 100 100"
      aria-hidden
      className={cn(
        spin && (speed === "slow" ? "animate-reel-slow" : "animate-reel"),
        className,
      )}
    >
      <circle
        cx="50"
        cy="50"
        r="47"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      />
      <circle
        cx="50"
        cy="50"
        r="37"
        fill="none"
        stroke="currentColor"
        strokeWidth="1"
        opacity="0.55"
      />
      <circle
        cx="50"
        cy="50"
        r="10"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      />
      {holes.map((angle) => {
        const rad = (angle * Math.PI) / 180;
        const r = 24;
        return (
          <circle
            key={angle}
            cx={50 + r * Math.cos(rad)}
            cy={50 + r * Math.sin(rad)}
            r="7.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.4"
            opacity="0.75"
          />
        );
      })}
      <circle cx="50" cy="50" r="2.6" fill="currentColor" opacity="0.5" />
    </svg>
  );
}

/** Minimal vintage clapperboard — an editorial illustration, not a sticker. */
export function Clapperboard({ className }: { className?: string }) {
  const uid = useId().replace(/:/g, "");
  const stripe = `clap-${uid}`;
  return (
    <svg viewBox="0 0 120 104" aria-hidden className={className}>
      <defs>
        <pattern
          id={stripe}
          width="20"
          height="20"
          patternUnits="userSpaceOnUse"
          patternTransform="skewX(-22)"
        >
          <rect width="10" height="20" fill="currentColor" opacity="0.42" />
        </pattern>
      </defs>
      {/* hinged slate */}
      <g transform="rotate(-7 16 30)">
        <rect
          x="8"
          y="14"
          width="104"
          height="18"
          rx="1.5"
          fill="#29251c"
          stroke="currentColor"
          strokeWidth="1.6"
        />
        <rect x="9" y="15" width="102" height="16" fill={`url(#${stripe})`} />
      </g>
      {/* board */}
      <rect
        x="8"
        y="34"
        width="104"
        height="58"
        rx="3"
        fill="#1b1c17"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <rect x="16" y="62" width="62" height="3.5" fill="currentColor" opacity="0.28" />
      <rect x="16" y="73" width="42" height="3.5" fill="currentColor" opacity="0.18" />
      <rect x="16" y="44" width="30" height="3.5" fill="currentColor" opacity="0.4" />
    </svg>
  );
}

/** Old projector silhouette with twin reels. */
export function Projector({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 124" aria-hidden className={className}>
      <circle
        cx="62"
        cy="32"
        r="20"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        opacity="0.75"
      />
      <circle
        cx="108"
        cy="32"
        r="20"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        opacity="0.55"
      />
      <circle cx="62" cy="32" r="5" fill="none" stroke="currentColor" strokeWidth="2" opacity="0.7" />
      <circle cx="108" cy="32" r="5" fill="none" stroke="currentColor" strokeWidth="2" opacity="0.5" />
      <path
        d="M62 52 L62 60 M108 52 L108 60"
        stroke="currentColor"
        strokeWidth="2"
        opacity="0.5"
      />
      <rect
        x="34"
        y="58"
        width="106"
        height="42"
        rx="6"
        fill="#1b1c17"
        stroke="currentColor"
        strokeWidth="3"
        opacity="0.92"
      />
      <rect x="140" y="71" width="18" height="15" rx="2" fill="currentColor" opacity="0.5" />
      <rect x="158" y="74" width="8" height="9" rx="1.5" fill="currentColor" opacity="0.35" />
      <path
        d="M52 100 L45 120 M122 100 L129 120"
        stroke="currentColor"
        strokeWidth="3"
        opacity="0.6"
      />
      <rect x="44" y="66" width="26" height="26" rx="2" fill="currentColor" opacity="0.14" />
    </svg>
  );
}

/** A dark olive projector beam. Never white, never neon. */
export function ProjectorBeam({
  side = "left",
  className,
}: {
  side?: "left" | "right";
  className?: string;
}) {
  return (
    <div
      aria-hidden
      className={cn(
        side === "left" ? "beam-cone" : "beam-cone-right",
        "pointer-events-none absolute",
        className,
      )}
    />
  );
}

/* ------------------------------------------------------------------ */
/* Composite backdrop                                                  */
/* ------------------------------------------------------------------ */

/**
 * The projection room. Fixed behind every screen: warm black, a pair of
 * projector beams, drifting film strips, a projector silhouette, dust and a
 * heavy vignette that keeps gameplay in focus.
 */
export function ScreenBackdrop({
  withProjector = true,
  className,
}: {
  withProjector?: boolean;
  className?: string;
}) {
  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none fixed inset-0 -z-10 overflow-hidden",
        className,
      )}
    >
      {/* warm black base + very subtle olive pool */}
      <div className="absolute inset-0 bg-[#11120f]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_-10%,rgba(89,99,68,0.16),transparent_62%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_115%,rgba(41,37,28,0.5),transparent_58%)]" />

      {/* projector beams from the top corners */}
      <ProjectorBeam side="left" className="-top-24 left-[6%] h-[70vh] w-[46vw]" />
      <ProjectorBeam side="right" className="-top-24 right-[6%] h-[62vh] w-[40vw]" />

      {/* film strips curving through the frame */}
      <div className="film-strip animate-strip absolute top-[16%] -left-[8%] h-14 w-[116%] -rotate-[2.4deg] opacity-[0.14] sm:h-16" />
      <div className="film-strip animate-strip absolute bottom-[13%] -left-[8%] h-14 w-[116%] rotate-[1.8deg] opacity-[0.11] [animation-direction:reverse] [animation-duration:3.6s] sm:h-16" />

      {/* vertical sprocket rails down the edges */}
      <div className="film-strip-v absolute inset-y-0 left-0 hidden w-3 opacity-[0.16] lg:block" />
      <div className="film-strip-v absolute inset-y-0 right-0 hidden w-3 opacity-[0.16] lg:block" />

      {/* projector + reels */}
      {withProjector && (
        <>
          <Projector className="absolute -bottom-6 left-1/2 hidden h-28 w-48 -translate-x-1/2 text-[#747c5b]/25 lg:block" />
          <FilmReel
            spin
            className="absolute top-[7%] left-[3%] h-24 w-24 text-[#747c5b]/25 sm:h-32 sm:w-32"
          />
          <FilmReel
            spin
            speed="normal"
            className="absolute top-[10%] right-[4%] h-16 w-16 text-[#596344]/25 sm:h-24 sm:w-24"
          />
          <Clapperboard className="absolute bottom-[9%] left-[5%] hidden h-20 w-24 text-[#c0bba1]/16 md:block" />
        </>
      )}

      {/* warm paper bloom top-centre (the lamp), kept very faint */}
      <div className="absolute -top-24 left-1/2 h-56 w-[70vw] -translate-x-1/2 rounded-full bg-[radial-gradient(ellipse,rgba(192,187,161,0.08),transparent_70%)] blur-2xl" />

      <div className="absolute inset-0 vignette" />
      <div className="grain absolute inset-0" />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Ticket card                                                         */
/* ------------------------------------------------------------------ */

/** A vintage cinema ticket stub — notched edges, perforation, paper text. */
export function TicketCard({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("ticket-card rounded-md px-4 py-4 sm:px-5", className)}>
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Camera flash                                                        */
/* ------------------------------------------------------------------ */

/**
 * The vintage camera-flash reveal: a warm aged-paper bloom and a beat of
 * paper typography, then straight back to the dark theatre. Never a white
 * screen, never confetti.
 */
export function PaperFlash({
  title,
  subtitle,
  onDone,
  duration = 1150,
}: {
  title: string;
  subtitle?: string;
  onDone?: () => void;
  duration?: number;
}) {
  const doneRef = useRef(onDone);

  // Keep the callback fresh without touching a ref during render.
  useEffect(() => {
    doneRef.current = onDone;
  }, [onDone]);

  useEffect(() => {
    const timer = window.setTimeout(() => doneRef.current?.(), duration);
    return () => window.clearTimeout(timer);
  }, [duration]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="pointer-events-none fixed inset-0 z-[65] grid place-items-center"
    >
      <motion.span
        aria-hidden
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 0.42, 0] }}
        transition={{ duration: 0.55, times: [0, 0.14, 1], ease: "easeOut" }}
        className="absolute inset-0 bg-[#e7e3d2]"
      />
      <motion.div
        initial={{ opacity: 0, scale: 1.08 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="relative px-6 text-center"
      >
        <p className="font-display paper-text text-glow-gold text-5xl tracking-[0.16em] sm:text-7xl">
          {title}
        </p>
        {subtitle && (
          <p className="font-type mt-4 text-[11px] tracking-[0.42em] text-[#c0bba1] uppercase">
            {subtitle}
          </p>
        )}
      </motion.div>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/* Film countdown                                                      */
/* ------------------------------------------------------------------ */

const COUNTDOWN_STEPS = ["3", "2", "1", "ACTION"] as const;

/**
 * Old film-leader countdown: a reel circle with a sweeping hand, big paper
 * numerals on burnt black, then ACTION. Calls `onDone` when it clears.
 */
export function FilmCountdown({
  onDone,
  label,
}: {
  onDone?: () => void;
  label?: string;
}) {
  const [step, setStep] = useState(0);
  const doneRef = useRef(onDone);

  // Keep the callback fresh without touching a ref during render.
  useEffect(() => {
    doneRef.current = onDone;
  }, [onDone]);

  useEffect(() => {
    if (step >= COUNTDOWN_STEPS.length) {
      doneRef.current?.();
      return;
    }
    const timer = window.setTimeout(() => setStep((s) => s + 1), 620);
    return () => window.clearTimeout(timer);
  }, [step]);

  if (step >= COUNTDOWN_STEPS.length) return null;
  const value = COUNTDOWN_STEPS[step];
  const isAction = step === COUNTDOWN_STEPS.length - 1;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      className="grain fixed inset-0 z-[70] grid place-items-center bg-[#11120f]/96"
    >
      <div className="relative grid h-64 w-64 place-items-center sm:h-80 sm:w-80">
        {/* reel leader circle */}
        <svg viewBox="0 0 200 200" className="absolute inset-0 h-full w-full text-[#c0bba1]/45">
          <circle cx="100" cy="100" r="88" fill="none" stroke="currentColor" strokeWidth="2" />
          <circle cx="100" cy="100" r="70" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.5" />
          <motion.line
            x1="100"
            y1="100"
            x2="100"
            y2="12"
            stroke="currentColor"
            strokeWidth="1.5"
            opacity="0.6"
            style={{ originX: "100px", originY: "100px" }}
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 1.1, ease: "linear" }}
          />
        </svg>
        <span
          key={step}
          className={cn(
            "animate-countdown font-display text-glow-gold relative leading-none paper-text",
            isAction
              ? "text-5xl tracking-[0.24em] sm:text-6xl"
              : "text-[7rem] sm:text-[9rem]",
          )}
        >
          {value}
        </span>
      </div>
      {label && (
        <p className="font-type absolute bottom-12 text-[11px] tracking-[0.42em] text-[#898675] uppercase">
          {label}
        </p>
      )}
    </motion.div>
  );
}
