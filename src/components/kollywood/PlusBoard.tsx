import { AnimatePresence, motion, useAnimationControls } from "framer-motion";
import { useEffect, useRef } from "react";
import { CATEGORY_META, type Category } from "./categories";
import { cn } from "@/lib/utils";

/**
 * The central "+" board — the heart of KOLLYWOOD.
 *
 *                👨 HERO
 *                   |
 *        👩 HEROINE — + — 🎬 MOVIE
 *                   |
 *                🎵 SONG
 *
 * Every part starts hidden and shows only its initial letter. When the creator
 * approves a guess the part flips to the full answer with a gold reveal; a
 * wrong guess shakes the part that just failed.
 */
export function PlusBoard({
  initials,
  revealed,
  values,
  selected,
  onSelect,
  impact,
}: {
  initials: Record<Category, string>;
  revealed: Record<Category, boolean>;
  values: Record<Category, string | null>;
  selected?: Category | null;
  /** Omit to make the board read-only (e.g. for the judge or a preview). */
  onSelect?: (category: Category) => void;
  impact?: { category: Category; id: number } | null;
}) {
  const cell = (category: Category) => (
    <BoardCell
      key={category}
      category={category}
      initial={initials[category]}
      value={values[category]}
      revealed={revealed[category]}
      selected={selected === category}
      interactive={!!onSelect && !revealed[category]}
      onSelect={onSelect}
      impactId={impact?.category === category ? impact.id : 0}
    />
  );

  return (
    <div className="mx-auto flex w-full max-w-[520px] flex-col items-center select-none sm:max-w-[580px]">
      <div className="w-[54%] min-w-0">{cell("hero")}</div>
      <Arm />
      <div className="flex w-full items-center justify-center">
        <div className="min-w-0 flex-1">{cell("heroine")}</div>
        <Arm horizontal />
        <Hub />
        <Arm horizontal />
        <div className="min-w-0 flex-1">{cell("movie")}</div>
      </div>
      <Arm />
      <div className="w-[54%] min-w-0">{cell("song")}</div>
    </div>
  );
}

function Arm({ horizontal = false }: { horizontal?: boolean }) {
  if (horizontal) {
    return (
      <span
        aria-hidden
        className="h-px w-2 shrink-0 bg-gradient-to-r from-white/45 to-white/10 sm:w-4"
      />
    );
  }
  return (
    <span
      aria-hidden
      className="my-1 h-4 w-px shrink-0 bg-gradient-to-b from-white/45 via-white/25 to-white/45 sm:h-6"
    />
  );
}

function Hub() {
  return (
    <span className="relative grid h-9 w-9 shrink-0 place-items-center rounded-full border border-primary/50 bg-background shadow-[0_0_24px_rgba(245,197,66,0.35)] sm:h-11 sm:w-11">
      <span className="absolute inset-1 rounded-full bg-primary/15 blur-[6px]" />
      <span className="font-display relative mt-0.5 text-xl leading-none text-primary sm:text-2xl">
        +
      </span>
    </span>
  );
}

function BoardCell({
  category,
  initial,
  value,
  revealed,
  selected,
  interactive,
  onSelect,
  impactId,
}: {
  category: Category;
  initial: string;
  value: string | null;
  revealed: boolean;
  selected: boolean;
  interactive: boolean;
  onSelect?: (category: Category) => void;
  impactId: number;
}) {
  const meta = CATEGORY_META[category];
  const controls = useAnimationControls();
  const seenImpact = useRef(impactId);

  // Burned a chance? Give the part a short, punchy shake.
  useEffect(() => {
    if (impactId && impactId !== seenImpact.current) {
      seenImpact.current = impactId;
      void controls.start({
        x: [0, -9, 8, -5, 3, 0],
        transition: { duration: 0.42, ease: "easeInOut" },
      });
    }
  }, [impactId, controls]);

  const inner = (
    <>
      <span className="flex w-full items-center justify-between gap-2">
        <span className="flex items-center gap-1 text-[9px] font-semibold tracking-[0.22em] text-white/45 uppercase sm:text-[10px]">
          <span aria-hidden>{meta.icon}</span>
          {meta.label}
        </span>
        <span
          className={cn(
            "text-[11px] font-bold",
            revealed ? "text-primary" : "text-white/25",
          )}
        >
          {revealed ? "✓" : "?"}
        </span>
      </span>

      <span className="mt-1.5 grid min-h-[34px] w-full place-items-center sm:min-h-[40px]">
        <AnimatePresence mode="wait" initial={false}>
          {revealed && value ? (
            <motion.span
              key="value"
              initial={{ opacity: 0, y: 12, scale: 0.85, filter: "blur(8px)" }}
              animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
              className="font-display max-w-full px-0.5 text-base leading-tight break-words text-white sm:text-xl"
            >
              {value}
            </motion.span>
          ) : (
            <motion.span
              key="hidden"
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.7, filter: "blur(6px)" }}
              transition={{ duration: 0.35 }}
              className="flex items-baseline gap-1"
            >
              <span className="font-display gold-text text-glow-gold text-3xl leading-none sm:text-4xl">
                {initial}
              </span>
            </motion.span>
          )}
        </AnimatePresence>
      </span>
    </>
  );

  const classes = cn(
    "flex w-full flex-col items-center rounded-2xl border px-2 py-2.5 text-center transition-all",
    revealed
      ? "border-primary/55 bg-primary/[0.09] shadow-[0_0_26px_rgba(245,197,66,0.16)]"
      : "border-white/12 bg-white/[0.035]",
    selected &&
      !revealed &&
      "border-primary/70 bg-primary/[0.12] ring-2 ring-primary/40",
    interactive && !selected && "hover:-translate-y-0.5 hover:border-primary/45",
  );

  if (interactive) {
    return (
      <motion.div animate={controls} className="min-w-0">
        <button
          type="button"
          onClick={() => onSelect?.(category)}
          aria-pressed={selected}
          className={classes}
        >
          {inner}
        </button>
      </motion.div>
    );
  }

  return (
    <motion.div animate={controls} className={cn("min-w-0", classes)}>
      {inner}
    </motion.div>
  );
}
