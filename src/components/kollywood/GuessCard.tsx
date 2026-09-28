import { CATEGORY_META } from "@/components/kollywood/categories";
import { cn } from "@/lib/utils";
import type { RoomGuess } from "@/pages/room/types";
import { motion } from "framer-motion";
import { Check, Clock3, X } from "lucide-react";

/**
 * A submitted guess for one part, shown as a cinematic card — pending while
 * the creator judges, ember-red when it burned a chance, gold when that part
 * landed on the board.
 */
export function GuessCard({ guess }: { guess: RoomGuess }) {
  const isPending = guess.status === "pending";
  const isCorrect = guess.status === "correct";
  const meta = CATEGORY_META[guess.category];

  return (
    <motion.li
      initial={{ opacity: 0, y: 22, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 240, damping: 20 }}
      className={cn(
        "relative overflow-hidden rounded-2xl border px-4 py-3.5",
        isPending && "border-primary/40 bg-primary/[0.07]",
        isCorrect && "border-primary/60 bg-primary/10",
        !isPending && !isCorrect && "border-destructive/35 bg-destructive/[0.07]",
      )}
    >
      <div className="flex items-start gap-3">
        <span
          className={cn(
            "mt-1 grid h-6 w-6 shrink-0 place-items-center rounded-full",
            isPending && "bg-primary/20 text-primary",
            isCorrect && "bg-primary text-primary-foreground",
            !isPending &&
              !isCorrect &&
              "bg-destructive/20 text-[#c08a6e]",
          )}
        >
          {isPending ? (
            <Clock3 className="h-3.5 w-3.5" />
          ) : isCorrect ? (
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
            isPending && "bg-primary/15 text-primary",
            isCorrect && "bg-primary text-primary-foreground",
            !isPending && !isCorrect && "bg-destructive/15 text-[#c08a6e]",
          )}
        >
          {isPending ? "Judging" : isCorrect ? "Correct" : "Wrong"}
        </span>
      </div>
    </motion.li>
  );
}
