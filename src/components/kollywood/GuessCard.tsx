import { CATEGORY_META } from "@/components/kollywood/categories";
import { cn } from "@/lib/utils";
import type { RoomGuess } from "@/pages/room/types";
import { motion } from "framer-motion";
import { Check, X } from "lucide-react";

/**
 * A submitted guess for one part, shown as a cinematic card. The server has
 * already decided it by the time this renders — olive when the part landed on
 * the board, ember-red when it burned a chance.
 */
export function GuessCard({ guess }: { guess: RoomGuess }) {
  const isCorrect = guess.status === "correct";
  const meta = CATEGORY_META[guess.category];

  return (
    <motion.li
      initial={{ opacity: 0, y: 22, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 240, damping: 20 }}
      className={cn(
        "relative overflow-hidden rounded-2xl border px-4 py-3.5",
        isCorrect
          ? "border-primary/60 bg-primary/10"
          : "border-destructive/35 bg-destructive/[0.07]",
      )}
    >
      <div className="flex items-start gap-3">
        <span
          className={cn(
            "mt-1 grid h-6 w-6 shrink-0 place-items-center rounded-full",
            isCorrect
              ? "bg-primary text-primary-foreground"
              : "bg-destructive/20 text-[#c08a6e]",
          )}
        >
          {isCorrect ? (
            <Check className="h-4 w-4" />
          ) : (
            <X className="h-4 w-4" />
          )}
        </span>

        <div className="min-w-0 flex-1">
          <p className="mb-0.5 flex items-center gap-1.5 text-[10px] font-semibold tracking-[0.2em] text-white/45 uppercase">
            <span aria-hidden>{meta.icon}</span>
            {meta.label}
          </p>
          <p className="font-display truncate text-2xl leading-tight tracking-wide text-white">
            “{guess.text}”
          </p>
          <p className="mt-0.5 text-[11px] tracking-[0.16em] text-white/50 uppercase">
            {guess.playerName}
            {guess.isMine && " · you"}
          </p>
        </div>

        <span
          className={cn(
            "shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold tracking-[0.16em] uppercase",
            isCorrect
              ? "bg-primary text-primary-foreground"
              : "bg-destructive/15 text-[#c08a6e]",
          )}
        >
          {isCorrect ? "✓ Correct" : "✕ Wrong"}
        </span>
      </div>
    </motion.li>
  );
}
