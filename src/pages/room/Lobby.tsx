import { CopyButton } from "@/components/kollywood/CopyButton";
import { api } from "@/convex/_generated/api";
import { inviteLink } from "@/lib/roomIdentity";
import { cn, friendlyError } from "@/lib/utils";
import type { RoomState } from "@/pages/room/types";
import { motion } from "framer-motion";
import { useMutation } from "convex/react";
import {
  ArrowRight,
  Clapperboard,
  Crown,
  Loader2,
  Share2,
  Shuffle,
  Star,
} from "lucide-react";
import { useState } from "react";

/**
 * The invite screen — the poster wall outside a private screening.
 *
 * Once everyone is in, the host opens the game: every player writes exactly
 * one question and guesses everybody else's, so the 🎬 badge walks the room.
 */
export function Lobby({
  room,
  token,
  onSwitchPlayer,
}: {
  room: RoomState;
  token: string;
  onSwitchPlayer: () => void;
}) {
  const startGame = useMutation(api.game.startGame);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const me = room.me;
  const host = room.players.find((p) => p.isHost);
  const link = inviteLink(room.code);
  const enoughPlayers = room.players.length >= 2;
  const canShare = typeof navigator !== "undefined" && !!navigator.share;

  const handleStart = async () => {
    setBusy(true);
    setError(null);
    try {
      await startGame({ token });
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setBusy(false);
    }
  };

  const handleShare = async () => {
    try {
      await navigator.share({
        title: "KOLLYWOOD",
        text: `Join my KOLLYWOOD room — cracking the hero, heroine, movie and song! Code ${room.code}`,
        url: link,
      });
    } catch {
      // user dismissed the share sheet
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-5 px-4 py-6 sm:py-9">
      {/* ---------- invite poster ---------- */}
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
        className="glass-deep relative overflow-hidden rounded-3xl px-5 py-8 text-center sm:px-8"
      >
        <div className="film-strip animate-strip absolute inset-x-0 top-0 h-8 opacity-50" />
        <div className="film-strip animate-strip absolute inset-x-0 bottom-0 h-8 opacity-40 [animation-direction:reverse]" />

        <p className="mt-4 flex items-center justify-center gap-2 text-[11px] font-semibold tracking-[0.4em] text-primary/85 uppercase">
          <Clapperboard className="h-3.5 w-3.5" /> Private screening
        </p>
        <p className="mt-5 text-xs tracking-[0.3em] text-white/45 uppercase">
          Room code
        </p>
        <p className="font-display gold-text text-glow-gold mt-1 pl-[0.3em] text-6xl leading-none tracking-[0.3em] sm:text-7xl">
          {room.code}
        </p>
        <p className="mx-auto mt-4 max-w-sm text-sm leading-relaxed text-white/60">
          Share the link with your friends — they walk right in, no sign-up
          needed.
        </p>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-2.5">
          <CopyButton
            value={link}
            label="COPY INVITE LINK"
            copiedLabel="LINK COPIED"
            successMessage="Invite link copied 🎬"
            className="h-11 rounded-xl border-primary/50 bg-primary/15 font-semibold text-primary hover:bg-primary/25"
          />
          <CopyButton
            value={room.code}
            label="COPY CODE"
            copiedLabel="CODE COPIED"
            successMessage="Room code copied"
            className="h-11 rounded-xl border-white/15 text-white/75"
          />
          {canShare && (
            <button
              type="button"
              onClick={handleShare}
              className="flex h-11 items-center gap-2 rounded-xl border border-white/15 px-4 text-sm font-medium text-white/75 transition-all hover:-translate-y-0.5 hover:border-primary/50 hover:text-primary"
            >
              <Share2 className="h-4 w-4" /> SHARE
            </button>
          )}
        </div>
      </motion.div>

      {/* ---------- audience ---------- */}
      <div className="glass rounded-2xl p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-[11px] font-semibold tracking-[0.3em] text-white/55 uppercase">
            👥 In the theatre · {room.players.length}
          </p>
          <p className="flex items-center gap-2 text-xs text-white/55">
            Playing as{" "}
            <span className="font-semibold text-white/90">{me?.name}</span>
            <button
              type="button"
              onClick={onSwitchPlayer}
              title="Switch player"
              className="flex items-center gap-1 rounded-full border border-white/15 px-2 py-0.5 text-[10px] tracking-wider text-white/50 uppercase transition-colors hover:border-primary/50 hover:text-primary"
            >
              <Shuffle className="h-3 w-3" /> switch
            </button>
          </p>
        </div>

        <ul className="mt-4 grid gap-2 sm:grid-cols-2">
          {room.players.map((player, index) => (
            <motion.li
              key={player.id}
              layout
              initial={{ opacity: 0, y: 14, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{
                delay: Math.min(index * 0.06, 0.35),
                type: "spring",
                stiffness: 240,
                damping: 22,
              }}
              className={cn(
                "flex items-center gap-2.5 rounded-xl border px-3.5 py-2.5",
                player.isHost
                  ? "border-primary/40 bg-primary/[0.08]"
                  : "border-white/[0.07] bg-white/[0.03]",
              )}
            >
              <span className="font-display grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gradient-to-br from-primary/70 to-[#ff5a2c]/70 text-sm text-black">
                {player.name.charAt(0).toUpperCase()}
              </span>
              <span className="min-w-0 flex-1 truncate text-sm font-medium text-white/90">
                {player.name}
                {player.id === me?.id && (
                  <span className="ml-1.5 text-[10px] tracking-wider text-white/40 uppercase">
                    you
                  </span>
                )}
              </span>
              {player.isHost && (
                <span className="flex shrink-0 items-center gap-1 rounded-full bg-primary/15 px-2 py-1 text-[9px] font-semibold tracking-[0.12em] text-primary uppercase">
                  <Star className="h-3 w-3" /> Host
                </span>
              )}
            </motion.li>
          ))}

          {!enoughPlayers && (
            <motion.li
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-2.5 rounded-xl border border-dashed border-white/15 px-3.5 py-2.5 text-xs text-white/45 sm:col-span-2"
            >
              <span className="h-2 w-2 animate-pulse rounded-full bg-primary" />
              Waiting for a friend to join — one more seat, please.
            </motion.li>
          )}
        </ul>
      </div>

      {/* ---------- how the game runs ---------- */}
      {enoughPlayers && (
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass rounded-2xl p-5"
        >
          <p className="flex items-center gap-2 text-[11px] font-semibold tracking-[0.3em] text-white/55 uppercase">
            <Crown className="h-3.5 w-3.5 text-primary" /> Question rotation
          </p>
          <p className="mt-1.5 text-xs leading-relaxed text-white/50">
            Everyone writes exactly one question and guesses everybody
            else&apos;s. {room.players.length} players ={" "}
            {room.players.length} rounds.
          </p>
          <ol className="mt-3.5 flex flex-wrap items-center gap-x-2 gap-y-2">
            {room.players.map((player, index) => (
              <li key={player.id} className="flex items-center gap-2">
                <span
                  className={cn(
                    "rounded-full border px-3 py-1 text-xs",
                    index === 0
                      ? "border-primary/50 bg-primary/12 text-primary"
                      : "border-white/12 text-white/60",
                  )}
                >
                  {index === 0 ? "🎬 " : ""}
                  {player.name}
                </span>
                {index < room.players.length - 1 && (
                  <ArrowRight className="h-3.5 w-3.5 text-white/25" />
                )}
              </li>
            ))}
          </ol>
        </motion.div>
      )}

      {/* ---------- start ---------- */}
      {me?.isHost ? (
        <div className="grid gap-3">
          <button
            type="button"
            onClick={handleStart}
            disabled={busy || !enoughPlayers}
            className={cn(
              "kolly-cta flex h-14 w-full items-center justify-center gap-2.5 rounded-2xl text-base font-semibold tracking-wide transition-all",
              enoughPlayers
                ? "bg-primary text-primary-foreground shadow-[0_10px_34px_rgba(245,197,66,0.3)] hover:-translate-y-0.5 hover:shadow-[0_14px_44px_rgba(245,197,66,0.45)] active:translate-y-0"
                : "cursor-not-allowed border border-white/10 bg-white/[0.04] text-white/35",
            )}
          >
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <span className="text-lg">🎬</span> START THE GAME
              </>
            )}
          </button>
          <p className="text-center text-xs text-white/45">
            You take the first question, then the 🎬 passes to the next player.
          </p>
          {error && (
            <p className="text-center text-sm text-[#ff7a55]">{error}</p>
          )}
        </div>
      ) : (
        <div className="glass flex items-center justify-center gap-3 rounded-2xl px-4 py-5 text-center text-sm text-white/65">
          <span className="h-2 w-2 animate-pulse rounded-full bg-primary" />
          Waiting for{" "}
          <span className="font-semibold text-white/90">{host?.name}</span> to
          start the game…
        </div>
      )}
    </div>
  );
}
