import { cn } from "@/lib/utils";
import type { RoomState } from "@/pages/room/types";
import { motion } from "framer-motion";
import { Crown, Users } from "lucide-react";

/** Players, who's judging, and whose turn it is. */
export function PlayersPanel({ room }: { room: RoomState }) {
  const turn = room.players.find((p) => p.isTurn);

  return (
    <div className="glass rounded-2xl p-4">
      <div className="flex items-center justify-between">
        <p className="flex items-center gap-2 text-[11px] font-semibold tracking-[0.3em] text-white/55 uppercase">
          <Users className="h-3.5 w-3.5" /> Players
        </p>
        <span className="text-xs text-white/40">{room.players.length}/12</span>
      </div>

      <ul className="mt-3 grid gap-2">
        {room.players.map((player, index) => (
          <motion.li
            key={player.id}
            layout
            initial={{ opacity: 0, x: 14 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: Math.min(index * 0.05, 0.3) }}
            className={cn(
              "flex items-center gap-2.5 rounded-xl border px-3 py-2 transition-colors",
              player.isTurn
                ? "border-primary/50 bg-primary/10 shadow-[0_0_18px_rgba(245,197,66,0.12)]"
                : "border-white/[0.07] bg-white/[0.03]",
            )}
          >
            <span
              className={cn(
                "h-2 w-2 shrink-0 rounded-full",
                player.isTurn
                  ? "bg-primary shadow-[0_0_10px_rgba(245,197,66,0.9)]"
                  : "bg-white/35",
              )}
            />
            <span className="min-w-0 flex-1 truncate text-sm font-medium text-white/90">
              {player.name}
              {player.id === room.me?.id && (
                <span className="ml-1.5 text-[10px] tracking-wider text-white/40 uppercase">
                  you
                </span>
              )}
            </span>
            {player.isCreator && (
              <Crown
                className="h-3.5 w-3.5 shrink-0 text-primary"
                aria-label="Question creator"
              />
            )}
            {player.isTurn && (
              <span className="animate-pulse text-[10px] font-semibold tracking-[0.18em] text-primary uppercase">
                Turn
              </span>
            )}
          </motion.li>
        ))}
      </ul>

      <div className="mt-3 border-t border-white/10 pt-3 text-center">
        {room.status === "playing" ? (
          <p className="text-xs tracking-wide text-white/60">
            🎯 Current turn:{" "}
            {room.myTurn ? (
              <span className="font-semibold text-primary">YOU</span>
            ) : (
              <span className="font-semibold text-white/85">
                {turn?.name ?? "…"}
              </span>
            )}
          </p>
        ) : (
          <p className="text-xs text-white/50">
            {room.players.find((p) => p.isCreator)?.name} is writing the
            question
          </p>
        )}
      </div>
    </div>
  );
}
