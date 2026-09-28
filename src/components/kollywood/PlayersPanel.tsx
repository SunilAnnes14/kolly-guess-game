import { cn } from "@/lib/utils";
import type { RoomState } from "@/pages/room/types";
import { motion } from "framer-motion";
import { Clapperboard, Crown, Star, Users } from "lucide-react";

/**
 * The roster. The room host opens the game and takes the first question; after
 * that the 🎬 badge walks down the join order — one question each.
 */
export function PlayersPanel({ room }: { room: RoomState }) {
  const creator = room.players.find((p) => p.isCreator);

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
              player.isCreator
                ? "border-primary/50 bg-primary/10 shadow-[0_0_18px_rgba(245,197,66,0.12)]"
                : "border-white/[0.07] bg-white/[0.03]",
            )}
          >
            <span className="font-display grid h-7 w-7 shrink-0 place-items-center rounded-full bg-gradient-to-br from-primary/70 to-[#ff5a2c]/70 text-xs text-black">
              {player.name.charAt(0).toUpperCase()}
            </span>
            <span className="min-w-0 flex-1 truncate text-sm font-medium text-white/90">
              {player.name}
              {player.id === room.me?.id && (
                <span className="ml-1.5 text-[10px] tracking-wider text-white/40 uppercase">
                  you
                </span>
              )}
            </span>
            {player.isHost && (
              <Star
                className="h-3.5 w-3.5 shrink-0 text-white/40"
                aria-label="Room host"
              />
            )}
            {player.isCreator ? (
              <Clapperboard
                className="h-3.5 w-3.5 shrink-0 text-primary"
                aria-label="Wrote this question"
              />
            ) : null}
            <span className="font-display shrink-0 text-lg leading-none gold-text">
              {player.points}
            </span>
          </motion.li>
        ))}
      </ul>

      <div className="mt-3 border-t border-white/10 pt-3 text-center">
        {room.isShowdown ? (
          <p className="text-center text-xs tracking-wide text-white/60">
            ⚡ Final showdown · decider by{" "}
            <span className="font-semibold text-white/85">
              {creator?.name ?? "—"}
            </span>
          </p>
        ) : room.roundsTotal > 0 ? (
          <p className="text-xs tracking-wide text-white/60">
            Round {room.round} of {room.roundsTotal} · 🎬{" "}
            <span className="font-semibold text-white/85">
              {creator?.name ?? "—"}
            </span>
            {room.me?.isCreator && (
              <span className="ml-1 font-semibold text-primary">(you)</span>
            )}
          </p>
        ) : (
          <p className="flex items-center justify-center gap-1.5 text-xs text-white/50">
            <Crown className="h-3.5 w-3.5 text-primary/70" />
            Waiting for a game to start
          </p>
        )}
      </div>
    </div>
  );
}
