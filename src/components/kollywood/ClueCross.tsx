import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export type ClueInitials = {
  hero: string;
  heroine: string;
  movie: string;
  song: string;
};

const EASE = [0.16, 1, 0.3, 1] as const;

/**
 * The 4-direction "+" clue.
 *
 *        HERO          top    → hero initial
 *         V
 *         |
 * HEROINE ─ + ─ MOVIE         left → heroine initial, right → movie initial
 *         |
 *         A
 *        SONG          bottom → song initial
 *
 * Built on a 3×3 grid so it stays perfectly centered and readable on mobile.
 * Each letter reveals individually, the arms draw out, then the hub pops.
 */
export function ClueCross({
  initials,
  showLabels = true,
  className,
}: {
  initials: ClueInitials;
  showLabels?: boolean;
  className?: string;
}) {
  const cells = [
    {
      key: "hero",
      letter: initials.hero,
      label: "HERO",
      cell: "col-start-2 row-start-1",
      labelClass: "bottom-full mb-1.5",
      delay: 0.32,
    },
    {
      key: "heroine",
      letter: initials.heroine,
      label: "HEROINE",
      cell: "col-start-1 row-start-2",
      labelClass: "top-full mt-0.5",
      delay: 0.46,
    },
    {
      key: "movie",
      letter: initials.movie,
      label: "MOVIE",
      cell: "col-start-3 row-start-2",
      labelClass: "top-full mt-0.5",
      delay: 0.6,
    },
    {
      key: "song",
      letter: initials.song,
      label: "SONG",
      cell: "col-start-2 row-start-3",
      labelClass: "top-full mt-1",
      delay: 0.74,
    },
  ];

  return (
    <div
      className={cn(
        "relative mx-auto aspect-square w-full max-w-[340px] select-none sm:max-w-[380px]",
        className,
      )}
    >
      {/* Horizontal arms: letter → hub → letter */}
      <motion.div
        aria-hidden
        className="absolute top-[calc(50%-0.5px)] left-[calc(16.666%+38px)] right-[calc(50%+20px)] h-px origin-left bg-gradient-to-r from-white/15 via-white/45 to-white/45"
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ delay: 0.15, duration: 0.45, ease: EASE }}
      />
      <motion.div
        aria-hidden
        className="absolute top-[calc(50%-0.5px)] left-[calc(50%+20px)] right-[calc(16.666%+38px)] h-px origin-right bg-gradient-to-l from-white/15 via-white/45 to-white/45"
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ delay: 0.15, duration: 0.45, ease: EASE }}
      />
      {/* Vertical arms: hero → hub → song */}
      <motion.div
        aria-hidden
        className="absolute left-[calc(50%-0.5px)] top-[calc(16.666%+38px)] bottom-[calc(50%+20px)] w-px origin-top bg-gradient-to-b from-white/15 via-white/45 to-white/45"
        initial={{ scaleY: 0 }}
        animate={{ scaleY: 1 }}
        transition={{ delay: 0.15, duration: 0.45, ease: EASE }}
      />
      <motion.div
        aria-hidden
        className="absolute left-[calc(50%-0.5px)] top-[calc(50%+20px)] bottom-[calc(16.666%+38px)] w-px origin-bottom bg-gradient-to-t from-white/15 via-white/45 to-white/45"
        initial={{ scaleY: 0 }}
        animate={{ scaleY: 1 }}
        transition={{ delay: 0.15, duration: 0.45, ease: EASE }}
      />

      {/* Cells + hub */}
      <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 place-items-center">
        {cells.map((cell) => (
          <div key={cell.key} className={cn("relative", cell.cell)}>
            <div className="relative grid h-16 w-16 place-items-center">
              {showLabels && (
                <span
                  className={cn(
                    "absolute left-1/2 -translate-x-1/2 text-[10px] font-semibold tracking-[0.28em] whitespace-nowrap text-white/45",
                    cell.labelClass,
                  )}
                >
                  {cell.label}
                </span>
              )}
              <motion.span
                initial={{ opacity: 0, scale: 0.3, y: 10, filter: "blur(10px)" }}
                animate={{ opacity: 1, scale: 1, y: 0, filter: "blur(0px)" }}
                transition={{ delay: cell.delay, duration: 0.55, ease: EASE }}
                className="font-display gold-text text-glow-gold text-5xl leading-none sm:text-6xl"
              >
                {cell.letter}
              </motion.span>
            </div>
          </div>
        ))}

        {/* The hub — cinematic reveal */}
        <motion.div
          className="col-start-2 row-start-2 grid place-items-center"
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.95, type: "spring", stiffness: 260, damping: 14 }}
        >
          <span className="relative grid h-9 w-9 place-items-center rounded-full border border-primary/50 bg-background shadow-[0_0_24px_rgba(116,124,91,0.35)]">
            <span className="absolute inset-1 rounded-full bg-primary/15 blur-[6px]" />
            <span className="font-display relative mt-0.5 text-xl leading-none text-primary">
              +
            </span>
          </span>
        </motion.div>
      </div>
    </div>
  );
}
