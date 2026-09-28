import { api } from "@/convex/_generated/api";
import { cn, friendlyError } from "@/lib/utils";
import type { RoomState } from "@/pages/room/types";
import { motion } from "framer-motion";
import { useMutation } from "convex/react";
import { Loader2 } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";

const EASE = [0.16, 1, 0.3, 1] as const;

/** The four parts, in board order, with the emoji the board uses. */
const PARTS = [
  { key: "hero", icon: "👨", label: "Hero" },
  { key: "heroine", icon: "👩", label: "Heroine" },
  { key: "movie", icon: "🎬", label: "Movie" },
  { key: "song", icon: "🎵", label: "Song" },
] as const;

/* ------------------------------------------------------------------ */
/* Shared bits                                                         */
/* ------------------------------------------------------------------ */

/** Letter-by-letter cinematic reveal of the answer. */
function RevealWord({ text, className }: { text: string; className?: string }) {
  return (
    <span className={cn("inline-flex flex-wrap justify-center", className)}>
      {text.split("").map((char, index) => (
        <motion.span
          key={index}
          initial={{ opacity: 0, y: 26, filter: "blur(12px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ delay: 0.25 + index * 0.05, duration: 0.55, ease: EASE }}
          className="inline-block"
        >
          {char === " " ? "\u00A0" : char}
        </motion.span>
      ))}
    </span>
  );
}

const CONFETTI_COLORS = ["#f5c542", "#ff5a2c", "#7c5cff", "#ffe9a8", "#ffffff"];

/** A tasteful burst of film-strip confetti — loops gently behind the win card. */
function Confetti() {
  const pieces = useMemo(
    () =>
      Array.from({ length: 30 }, (_, index) => ({
        id: index,
        left: (index * 37) % 100,
        delay: (index % 10) * 0.14,
        duration: 2.8 + (index % 5) * 0.5,
        color: CONFETTI_COLORS[index % CONFETTI_COLORS.length],
        width: 5 + (index % 3) * 3,
        spin: (index % 2 === 0 ? 1 : -1) * (180 + (index % 4) * 90),
      })),
    [],
  );

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {pieces.map((piece) => (
        <motion.span
          key={piece.id}
          className="absolute top-[-8%] block rounded-[2px]"
          style={{
            left: `${piece.left}%`,
            width: piece.width,
            height: piece.width * 1.7,
            backgroundColor: piece.color,
          }}
          initial={{ y: -30, opacity: 0, rotate: 0 }}
          animate={{ y: "108vh", opacity: [0, 1, 1, 0], rotate: piece.spin }}
          transition={{
            duration: piece.duration,
            delay: piece.delay,
            repeat: Infinity,
            repeatDelay: 0.5,
            ease: "easeIn",
          }}
        />
      ))}
    </div>
  );
}

/** Who discovered what — the four-line scorecard under the movie title. */
function PartsReveal({
  room,
  delay = 0.75,
}: {
  room: RoomState;
  delay?: number;
}) {
  const values = room.question?.values;
  if (!values) return null;

  return (
    <motion.ul
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5, ease: EASE }}
      className="mx-auto mt-5 grid max-w-sm gap-2 text-left"
    >
      {PARTS.map((part, index) => (
        <motion.li
          key={part.key}
          initial={{ opacity: 0, x: -14 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: delay + index * 0.09, duration: 0.45, ease: EASE }}
          className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2.5"
        >
          <span aria-hidden className="text-base">
            {part.icon}
          </span>
          <span className="w-16 shrink-0 text-[10px] font-semibold tracking-[0.2em] text-white/45 uppercase">
            {part.label}
          </span>
          <span className="font-display min-w-0 flex-1 truncate text-lg tracking-wide text-white">
            {values[part.key] ?? "—"}
          </span>
        </motion.li>
      ))}
    </motion.ul>
  );
}

/** Shared action buttons — only the creator moves the room forward. */
function RoundActions({
  room,
  token,
  primary,
}: {
  room: RoomState;
  token: string;
  primary: { label: string; emoji: string; mode: "replay" | "next" };
}) {
  const advanceRound = useMutation(api.game.advanceRound);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const creator = room.players.find((p) => p.isCreator);

  if (!room.me?.isCreator) {
    return (
      <p className="mx-auto flex max-w-xs items-center justify-center gap-2 text-sm text-white/60">
        <span className="h-2 w-2 animate-pulse rounded-full bg-primary" />
        Waiting for {creator?.name} to start the next round…
      </p>
    );
  }

  const go = async (mode: "replay" | "next" | "lobby", tag: string) => {
    setBusy(tag);
    setError(null);
    try {
      await advanceRound({ token, mode });
    } catch (err) {
      setError(friendlyError(err));
      setBusy(null);
    }
  };

  return (
    <div className="grid w-full gap-2.5">
      <button
        type="button"
        onClick={() => go(primary.mode, "primary")}
        className="kolly-cta flex h-14 items-center justify-center gap-2 rounded-2xl bg-primary text-base font-semibold text-primary-foreground shadow-[0_10px_34px_rgba(245,197,66,0.35)] transition-all hover:-translate-y-0.5 hover:shadow-[0_14px_44px_rgba(245,197,66,0.5)] active:translate-y-0 disabled:opacity-60"
        disabled={busy !== null}
      >
        {busy === "primary" ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <>
            <span>{primary.emoji}</span> {primary.label}
          </>
        )}
      </button>
      <div className="grid gap-2.5 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => go("next", "next")}
          disabled={busy !== null}
          className="flex h-11 items-center justify-center gap-1.5 rounded-xl border border-primary/45 text-sm font-semibold text-primary transition-all hover:bg-primary/10 disabled:opacity-55"
        >
          {busy === "next" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              <span>🎬</span> NEW QUESTION
            </>
          )}
        </button>
        <button
          type="button"
          onClick={() => go("lobby", "lobby")}
          disabled={busy !== null}
          className="flex h-11 items-center justify-center gap-1.5 rounded-xl border border-white/15 text-sm font-semibold text-white/70 transition-all hover:bg-white/5 disabled:opacity-55"
        >
          {busy === "lobby" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            "BACK TO ROOM"
          )}
        </button>
      </div>
      {error && <p className="text-center text-sm text-[#ff7a55]">{error}</p>}
    </div>
  );
}

function OverlayShell({
  children,
  tone,
}: {
  children: ReactNode;
  tone: "gold" | "ember";
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.35 }}
      className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-black/75 p-4 backdrop-blur-md"
    >
      {tone === "gold" && <Confetti />}
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 24 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 190, damping: 19 }}
        className={cn(
          "glass-deep relative w-full max-w-lg rounded-3xl px-5 py-9 text-center sm:px-9",
          tone === "gold"
            ? "border-primary/35 shadow-[0_0_80px_rgba(245,197,66,0.16)]"
            : "border-destructive/35 shadow-[0_0_80px_rgba(255,90,44,0.14)]",
        )}
      >
        {children}
      </motion.div>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/* Win — all four parts discovered                                     */
/* ------------------------------------------------------------------ */

export function WinOverlay({
  room,
  token,
  winnerName,
}: {
  room: RoomState;
  token: string;
  winnerName: string;
}) {
  const question = room.question;
  if (!question) return null;

  const iWon = !!room.me && room.me.name === winnerName;

  return (
    <OverlayShell tone="gold">
      <motion.p
        initial={{ opacity: 0, y: -14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.5, ease: EASE }}
        className="font-display text-3xl tracking-[0.14em] gold-text sm:text-4xl"
      >
        🎉 YOU SOLVED IT!
      </motion.p>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.25, duration: 0.4 }}
        className="mt-3 text-[10px] font-semibold tracking-[0.34em] text-primary/80 uppercase"
      >
        All four clues discovered
      </motion.p>

      <div className="mt-3">
        <RevealWord
          text={question.values.movie ?? ""}
          className="font-display text-glow-gold text-6xl leading-none tracking-[0.05em] gold-text sm:text-7xl"
        />
      </div>

      <PartsReveal room={room} />

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2, duration: 0.5 }}
        className="mt-6 text-sm font-semibold tracking-[0.24em] text-primary uppercase"
      >
        ⭐ Chances remaining: {room.lives} / 9
      </motion.p>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.35, duration: 0.5 }}
        className="mt-2 text-sm text-white/65"
      >
        {winnerName ? (
          iWon ? (
            <span className="font-semibold text-primary">
              You cracked the last piece!
            </span>
          ) : (
            <span className="font-semibold text-primary">
              {winnerName} cracked the last piece!
            </span>
          )
        ) : null}
      </motion.p>

      <div className="gold-rule mx-auto mt-6 w-2/3" />

      <div className="mt-6 flex justify-center">
        <RoundActions
          room={room}
          token={token}
          primary={{ label: "PLAY AGAIN", emoji: "🔁", mode: "replay" }}
        />
      </div>
    </OverlayShell>
  );
}

/* ------------------------------------------------------------------ */
/* Game over — the nine chances ran out                                */
/* ------------------------------------------------------------------ */

export function GameOverOverlay({
  room,
  token,
}: {
  room: RoomState;
  token: string;
}) {
  const question = room.question;
  if (!question) return null;

  const solved = room.question?.solvedCount ?? 0;

  return (
    <OverlayShell tone="ember">
      <motion.p
        initial={{ opacity: 0, scale: 1.3, filter: "blur(10px)" }}
        animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
        transition={{ duration: 0.6, ease: EASE }}
        className="font-display text-4xl tracking-[0.14em] text-[#ff7a55] text-glow-ember sm:text-5xl"
      >
        🎞️ THE MOVIE GOT AWAY!
      </motion.p>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4, duration: 0.5 }}
        className="mt-3 text-xs font-semibold tracking-[0.34em] text-white/60 uppercase"
      >
        {solved} / 4 parts found · 9 chances gone
      </motion.p>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7, duration: 0.45 }}
        className="mt-7 text-sm text-white/55"
      >
        The answer was…
      </motion.p>

      <div className="mt-2.5">
        <RevealWord
          text={question.values.movie ?? ""}
          className="font-display text-glow-gold text-6xl leading-none tracking-[0.05em] gold-text sm:text-7xl"
        />
      </div>

      <PartsReveal room={room} delay={1.05} />

      <div className="gold-rule mx-auto mt-6 w-2/3" />

      <div className="mt-6 flex justify-center">
        <RoundActions
          room={room}
          token={token}
          primary={{ label: "TRY AGAIN", emoji: "🎬", mode: "replay" }}
        />
      </div>
    </OverlayShell>
  );
}
