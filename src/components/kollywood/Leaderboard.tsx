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
    <div className="glass grain rounded-lg p-4">
      <div className="text-center">
        <p className="font-display paper-text text-lg tracking-[0.3em]">
          KOLLYWOOD
        </p>
        <p className="font-type mt-1 flex items-center justify-center gap-2 text-[10px] tracking-[0.34em] text-white/45 uppercase">
          <Trophy className="h-3 w-3 text-[#747c5b]" /> Score board
        </p>
      </div>

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
                  "font-type w-6 text-center text-sm leading-none " +
                  (index === 0 ? "text-[#c0bba1]" : "text-white/35")
                }
              >
                {String(index + 1).padStart(2, "0")}
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
