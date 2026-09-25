import type { RoomState } from "@/pages/room/types";
import { Trophy } from "lucide-react";

/** Compact room leaderboard — points, correct guesses, attempts, clues. */
export function Leaderboard({ room }: { room: RoomState }) {
  const ranked = [...room.players].sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.correct !== a.correct) return b.correct - a.correct;
    return a.attempts - b.attempts;
  });
  const hasScores = ranked.some((p) => p.points > 0 || p.correct > 0);

  return (
    <div className="glass rounded-2xl p-4">
      <p className="flex items-center gap-2 text-[11px] font-semibold tracking-[0.3em] text-white/55 uppercase">
        <Trophy className="h-3.5 w-3.5 text-primary" /> Room leaderboard
      </p>

      {!hasScores ? (
        <p className="mt-3 text-xs leading-relaxed text-white/45">
          No scores yet — the first correct guess takes the lead.
        </p>
      ) : (
        <ol className="mt-2">
          {ranked.map((player, index) => (
            <li
              key={player.id}
              className="flex items-center gap-3 border-t border-white/[0.07] py-2.5 first:border-t-0"
            >
              <span
                className={
                  "font-display w-5 text-center text-xl leading-none " +
                  (index === 0 ? "text-primary" : "text-white/45")
                }
              >
                {index + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-white/90">
                  {player.name}
                </p>
                <p className="truncate text-[10px] tracking-wide text-white/45">
                  ✓ {player.correct} correct · {player.attempts} guesses · 💡{" "}
                  {player.cluesUsed}
                </p>
              </div>
              <span className="font-display text-xl leading-none gold-text">
                {player.points}
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
