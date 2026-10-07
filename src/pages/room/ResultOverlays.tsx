import { api } from "@/convex/_generated/api";
import { playSound } from "@/lib/sounds";
import { cn, friendlyError } from "@/lib/utils";
import type { RoomState } from "@/pages/room/types";
import { motion } from "framer-motion";
import { useMutation } from "convex/react";
import {
  ArrowRight,
  Check,
  Clapperboard,
  Loader2,
  RotateCcw,
  Trophy,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const EASE = [0.16, 1, 0.3, 1] as const;

/** Seconds of end-of-round credits before the next question starts itself. */
const AUTO_ADVANCE_SECONDS = 12;

/** The four parts, in board order, with the emoji the board uses. */
const PARTS = [
  { key: "hero", icon: "👨", label: "Hero" },
  { key: "heroine", icon: "👩", label: "Heroine" },
  { key: "movie", icon: "🎬", label: "Movie" },
  { key: "song", icon: "🎵", label: "Song" },
] as const;

const MEDALS = ["🥇", "🥈", "🥉"];

/** 🥇 / 🥈 / 🥉 for the podium, a chequered flag otherwise. */
function medalFor(placement: number | null): string {
  return placement && placement <= 3 ? MEDALS[placement - 1] : "🏁";
}

/** "1st" / "2nd" … / "Failed" for a finish order. */
function placementLabel(placement: number | null): string {
  if (!placement) return "Failed";
  const suffix =
    placement === 1
      ? "st"
      : placement === 2
        ? "nd"
        : placement === 3
          ? "rd"
          : "th";
  return `${placement}${suffix}`;
}

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

/* Film-dust flecks — aged paper and olive, never gold or neon. */
const CONFETTI_COLORS = ["#c0bba1", "#898675", "#747c5b", "#596344", "#e7e3d2"];

/** A tasteful burst of film-strip confetti, looping behind the big moments. */
function Confetti() {
  const pieces = useMemo(
    () =>
      Array.from({ length: 34 }, (_, index) => ({
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
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 overflow-hidden"
    >
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

function PlayerAvatar({ name }: { name: string }) {
  return (
    <span className="font-display grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-primary/70 to-[#8a5138]/70 text-sm text-black">
      {name.charAt(0).toUpperCase()}
    </span>
  );
}

/**
 * The full answer key — the FIRST moment everybody gets to see it.
 *
 * During the round the answers are private to whoever found them; only once
 * every player has finished or burned out does the whole room get the reveal.
 */
function AnswerCard({ room, delay = 0.3 }: { room: RoomState; delay?: number }) {
  const answer = room.answerKey;
  if (!answer) return null;

  return (
    <div className="mx-auto mt-5 max-w-md">
      <p className="text-center text-[10px] font-semibold tracking-[0.4em] text-[#c08a6e] uppercase">
        🎟 Answer reveal
      </p>
      <div className="mt-3 text-center">
        <RevealWord
          text={answer.movie}
          className="font-display text-glow-gold text-5xl leading-none tracking-[0.05em] gold-text sm:text-6xl"
        />
      </div>
      <ul className="mt-4 grid gap-2 text-left">
        {PARTS.map((part, index) => (
          <motion.li
            key={part.key}
            initial={{ opacity: 0, x: -14 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{
              delay: delay + index * 0.08,
              duration: 0.45,
              ease: EASE,
            }}
            className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2.5"
          >
            <span aria-hidden className="text-base">
              {part.icon}
            </span>
            <span className="w-16 shrink-0 text-[10px] font-semibold tracking-[0.2em] text-white/45 uppercase">
              {part.label}
            </span>
            <span className="font-display min-w-0 flex-1 truncate text-lg tracking-wide text-white">
              {answer[part.key]}
            </span>
          </motion.li>
        ))}
      </ul>
    </div>
  );
}

function ProgressMark({
  status,
}: {
  status: RoomState["entries"][number]["status"];
}) {
  if (status === "solved") {
    return (
      <span className="flex items-center gap-1 rounded-full bg-primary px-2.5 py-0.5 text-[9px] font-bold tracking-[0.14em] text-primary-foreground uppercase">
        <Check className="h-3 w-3" /> Solved
      </span>
    );
  }
  if (status === "failed") {
    return (
      <span className="flex items-center gap-1 rounded-full bg-destructive/20 px-2.5 py-0.5 text-[9px] font-bold tracking-[0.14em] text-[#c08a6e] uppercase">
        <X className="h-3 w-3" /> Failed
      </span>
    );
  }
  return (
    <span className="rounded-full border border-white/15 px-2.5 py-0.5 text-[9px] font-bold tracking-[0.14em] text-white/50 uppercase">
      {status}
    </span>
  );
}

/**
 * Play a cue once, on mount — the reel-and-chord sting when a round closes.
 */
function useCue(name: Parameters<typeof playSound>[0]) {
  const played = useRef(false);
  useEffect(() => {
    if (played.current) return;
    played.current = true;
    playSound(name);
  }, [name]);
}

function Shell({
  children,
  confetti = false,
}: {
  children: React.ReactNode;
  confetti?: boolean;
}) {
  return (
    <div className="relative mx-auto flex w-full max-w-2xl flex-col gap-5 px-4 py-8 sm:py-12">
      {confetti && (
        <div className="pointer-events-none absolute inset-0 z-30 overflow-hidden">
          <Confetti />
        </div>
      )}
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Round complete — recap, then hand the mic to the next creator       */
/* ------------------------------------------------------------------ */

export function RoundComplete({
  room,
  token,
}: {
  room: RoomState;
  token: string;
}) {
  const startNextRound = useMutation(api.game.startNextRound);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 🎞 film reel → projector stop → short chord
  useCue("roundComplete");

  const isNextCreator = !!room.me && room.me.id === room.nextCreatorId;
  const creator = room.players.find((p) => p.isCreator);
  const next = room.players.find((p) => p.id === room.nextCreatorId);

  // Podium order first, then whoever else took points, then the failures.
  const recap = [...room.entries].sort((a, b) => {
    const pa = a.placement ?? 99;
    const pb = b.placement ?? 99;
    if (pa !== pb) return pa - pb;
    return b.score - a.score;
  });
  const standings = [...room.players].sort(
    (a, b) => b.points - a.points || b.solves - a.solves,
  );

  const advance = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      await startNextRound({ token });
    } catch (err) {
      setError(friendlyError(err));
      setBusy(false);
    }
  }, [startNextRound, token]);

  // The rotation moves on by itself — nobody has to press anything.
  const [countdown, setCountdown] = useState(AUTO_ADVANCE_SECONDS);
  useEffect(() => {
    const started = Date.now();
    const tick = window.setInterval(() => {
      setCountdown(
        Math.max(
          0,
          AUTO_ADVANCE_SECONDS - Math.floor((Date.now() - started) / 1000),
        ),
      );
    }, 250);
    const go = window.setTimeout(
      () => void advance(),
      AUTO_ADVANCE_SECONDS * 1000,
    );
    return () => {
      window.clearInterval(tick);
      window.clearTimeout(go);
    };
  }, [advance]);

  return (
    <Shell confetti>
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 190, damping: 19 }}
        className="glass-deep relative overflow-hidden rounded-3xl px-5 py-8 text-center sm:px-9"
      >
        <div className="film-strip animate-strip absolute inset-x-0 top-0 h-7 opacity-40" />

        <motion.p
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.5, ease: EASE }}
          className="font-display mt-3 text-3xl tracking-[0.14em] gold-text sm:text-4xl"
        >
          🎬 ROUND {room.round} COMPLETE
        </motion.p>
        <p className="mt-2 text-xs font-semibold tracking-[0.3em] text-white/50 uppercase">
          Everyone finished {creator?.name ? `${creator.name}'s` : "the"}{" "}
          question
        </p>

        <AnswerCard room={room} />

        {/* ---------- this round's scores ---------- */}
        <ul className="mx-auto mt-6 grid max-w-md gap-2">
          {recap.map((entry, index) => (
            <motion.li
              key={entry.playerId}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 + index * 0.07, duration: 0.4 }}
              className={cn(
                "flex items-center gap-3 rounded-xl border px-3.5 py-2.5",
                entry.status === "solved"
                  ? "border-primary/40 bg-primary/[0.08]"
                  : "border-white/[0.08] bg-white/[0.02]",
              )}
            >
              {entry.placement ? (
                <span
                  className="shrink-0 text-base leading-none"
                  title={placementLabel(entry.placement)}
                >
                  {medalFor(entry.placement)}
                </span>
              ) : null}
              <PlayerAvatar name={entry.playerName} />
              <span className="min-w-0 flex-1 truncate text-sm font-medium text-white/90">
                {entry.playerName}
              </span>
              <ProgressMark status={entry.status} />
              <span className="font-display w-12 text-right text-xl leading-none gold-text">
                {entry.score}
              </span>
            </motion.li>
          ))}
        </ul>

        <div className="gold-rule mx-auto mt-6 w-2/3" />

        {/* ---------- running totals ---------- */}
        <p className="mt-5 text-[10px] font-semibold tracking-[0.34em] text-white/45 uppercase">
          Tournament so far
        </p>
        <ol className="mx-auto mt-3 flex max-w-md flex-wrap items-center justify-center gap-2">
          {standings.map((player) => (
            <li
              key={player.id}
              className="flex items-center gap-2 rounded-full border border-white/12 bg-white/[0.04] px-3 py-1.5"
            >
              <span className="text-xs text-white/70">{player.name}</span>
              <span className="font-display text-base leading-none text-primary">
                {player.points}
              </span>
            </li>
          ))}
        </ol>
      </motion.div>

      {/* ---------- next creator ---------- */}
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35, duration: 0.5, ease: EASE }}
        className="glass-deep rounded-3xl px-5 py-7 text-center"
      >
        <p className="text-[10px] font-semibold tracking-[0.34em] text-primary/80 uppercase">
          Next question creator
        </p>
        <div className="mt-3 flex items-center justify-center gap-3">
          <Clapperboard className="h-5 w-5 text-primary" />
          <p className="font-display gold-text text-glow-gold text-4xl tracking-[0.14em] uppercase">
            {next?.name ?? "—"}
          </p>
        </div>
        <p className="mt-2.5 text-sm text-white/60">
          {isNextCreator
            ? "Your turn to challenge everyone!"
            : `Waiting for ${next?.name ?? "the next creator"} to set the question…`}
        </p>

        <button
          type="button"
          onClick={advance}
          disabled={busy || countdown === 0}
          className="kolly-cta mt-5 flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-primary text-base font-semibold text-primary-foreground shadow-[0_10px_34px_rgba(116,124,91,0.35)] transition-all hover:-translate-y-0.5 hover:shadow-[0_14px_44px_rgba(116,124,91,0.5)] active:translate-y-0 disabled:opacity-60"
        >
          {busy ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              <span className="text-lg">🎬</span>
              {isNextCreator ? "CREATE THE NEXT QUESTION" : "START THE NEXT ROUND"}
            </>
          )}
        </button>

        <p className="mt-3 flex items-center justify-center gap-2 text-xs text-white/45">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
          {countdown > 0
            ? `Starting automatically in ${countdown}s…`
            : `Round ${room.round + 1} of ${room.roundsTotal} is loading…`}
        </p>

        {error && <p className="mt-3 text-sm text-[#c08a6e]">{error}</p>}
      </motion.div>
    </Shell>
  );
}

/* ------------------------------------------------------------------ */
/* Skipped — the room voted unanimously to move on                     */
/* ------------------------------------------------------------------ */

/** How long the skip reveal holds before the next round takes over. */
const SKIP_ADVANCE_MS = 1800;

/**
 * A round that ended by UNANIMOUS vote rather than by solving the question.
 *
 * It is a different ending, not a lesser one: the answer is revealed to the
 * whole room at last (the question is abandoned, so there is nothing left to
 * spoil), nobody is paid for it, and the clapperboard goes to the next player
 * in the rotation — automatically, with no button to press.
 */
export function RoundSkipped({
  room,
  token,
}: {
  room: RoomState;
  token: string;
}) {
  const startNextRound = useMutation(api.game.startNextRound);
  const [busy, setBusy] = useState(false);

  // The same film-reel sting that closes any round.
  useCue("roundComplete");

  const answer = room.answerKey;
  const voting = room.voting;

  const advance = useCallback(async () => {
    setBusy(true);
    try {
      await startNextRound({ token });
    } catch {
      // Every player in the room races to roll the round forward; whoever
      // loses simply finds the room already on the next question. Nothing to
      // report — the room state is the source of truth.
    }
  }, [startNextRound, token]);

  useEffect(() => {
    const go = window.setTimeout(() => void advance(), SKIP_ADVANCE_MS);
    return () => window.clearTimeout(go);
  }, [advance]);

  return (
    <Shell>
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 18 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 200, damping: 20 }}
        className="glass-deep grain relative overflow-hidden rounded-3xl px-5 py-9 text-center sm:px-9"
      >
        <div className="film-strip animate-strip absolute inset-x-0 top-0 h-7 opacity-40" />

        <motion.p
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-[10px] font-semibold tracking-[0.4em] text-white/50 uppercase"
        >
          🗳 Everyone voted!
        </motion.p>
        <motion.p
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{
            delay: 0.12,
            type: "spring",
            stiffness: 220,
            damping: 18,
          }}
          className="font-display mt-3 text-3xl tracking-[0.16em] text-[#c0bba1] sm:text-4xl"
        >
          ROUND SKIPPED
        </motion.p>
        <p className="mt-2 text-xs font-semibold tracking-[0.2em] text-white/45 uppercase">
          {voting.votedCount} / {voting.eligibleCount} voted — the question was
          too tough
        </p>

        {/* The answer, revealed only now that the round is abandoned. */}
        <div className="mx-auto mt-6 max-w-md">
          <p className="text-center text-[10px] font-semibold tracking-[0.4em] text-[#c08a6e] uppercase">
            🎟 Answer reveal
          </p>
          {answer && (
            <div className="mt-3 text-center">
              <RevealWord
                text={answer.movie}
                className="font-display text-glow-gold text-4xl leading-none tracking-[0.05em] gold-text sm:text-5xl"
              />
            </div>
          )}
          <ul className="mt-4 grid gap-2 text-left">
            {PARTS.map((part, index) => (
              <motion.li
                key={part.key}
                initial={{ opacity: 0, x: -14 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{
                  delay: 0.3 + index * 0.06,
                  duration: 0.4,
                  ease: EASE,
                }}
                className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2.5"
              >
                <span aria-hidden className="text-base">
                  {part.icon}
                </span>
                <span className="w-16 shrink-0 text-[10px] font-semibold tracking-[0.2em] text-white/45 uppercase">
                  {part.label}
                </span>
                <span className="font-display min-w-0 flex-1 truncate text-lg tracking-wide text-white">
                  {answer?.[part.key] ?? "—"}
                </span>
              </motion.li>
            ))}
          </ul>
        </div>

        <p className="mt-5 text-[11px] leading-relaxed text-white/45">
          No points awarded — a skipped question pays nobody, so every score is
          exactly as it was.
        </p>

        <div className="olive-rule mx-auto mt-5 w-2/3" />

        <p className="mt-4 flex items-center justify-center gap-2 text-xs text-white/50">
          {busy ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
          ) : (
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
          )}
          Moving to the next round…
          {room.nextCreatorName ? ` ${room.nextCreatorName} is up next.` : ""}
        </p>
      </motion.div>
    </Shell>
  );
}

/* ------------------------------------------------------------------ */
/* Finished — the KOLLYWOOD champion                                   */
/* ------------------------------------------------------------------ */

export function Champion({
  room,
  token,
}: {
  room: RoomState;
  token: string;
}) {
  const restartGame = useMutation(api.game.restartGame);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 🎬 the end title of an old movie
  useCue("finalWinner");

  const standings = useMemo(
    () =>
      [...room.players].sort(
        (a, b) =>
          b.points - a.points || b.solves - a.solves || a.name.localeCompare(b.name),
      ),
    [room.players],
  );
  const topPoints = standings[0]?.points ?? 0;
  const champions = standings.filter((p) => p.points === topPoints);
  const champion = champions[0];
  const coChampions = champions.length > 1;
  const isChampion = (player: RoomState["players"][number]) =>
    champions.some((c) => c.id === player.id);
  const iWon = !!room.me && champions.some((c) => c.id === room.me?.id);

  const playAgain = async () => {
    setBusy(true);
    setError(null);
    try {
      await restartGame({ token });
    } catch (err) {
      setError(friendlyError(err));
      setBusy(false);
    }
  };

  return (
    <Shell confetti>
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 22 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 180, damping: 18 }}
        className="glass-deep relative overflow-hidden rounded-3xl border-primary/35 px-5 py-10 text-center shadow-[0_0_80px_rgba(116,124,91,0.16)] sm:px-9"
      >
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1, duration: 0.6, ease: EASE }}
          className="mt-3"
        >
          <p className="font-type text-[10px] tracking-[0.5em] text-[#898675] uppercase">
            The end
          </p>
          <p className="font-display paper-text mt-3 text-3xl tracking-[0.3em] sm:text-4xl">
            KOLLYWOOD
          </p>
        </motion.div>

        <p className="font-type mt-6 text-[10px] tracking-[0.32em] text-[#898675] uppercase">
          {room.roundsTotal} questions · everyone wrote one
        </p>

        <motion.div
          initial={{ opacity: 0, scale: 1.25, filter: "blur(12px)" }}
          animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
          transition={{ delay: 0.35, duration: 0.65, ease: EASE }}
          className="mt-4"
        >
          <p className="text-[11px] font-semibold tracking-[0.4em] text-primary/80 uppercase">
            🎬 Kollywood champion
          </p>
          <p className="font-display gold-text text-glow-gold mt-2 text-5xl leading-none tracking-[0.1em] sm:text-7xl">
            {coChampions
              ? champions.map((c) => c.name.toUpperCase()).join(" · ")
              : (champion?.name?.toUpperCase() ?? "—")}
          </p>
          <p className="mt-3 text-sm text-white/65">
            {coChampions
              ? `${champions.length} players finished level — you share the crown! 👑`
              : iWon
                ? "You took the trophy! 🎉"
                : `${champion?.name ?? "They"} took the trophy.`}
          </p>
        </motion.div>

        <div className="olive-rule mx-auto mt-7 w-2/3" />

        {/* ---------- full leaderboard ---------- */}
        <p className="font-type mt-6 text-[10px] tracking-[0.5em] text-[#898675] uppercase">
          Cast &amp; crew
        </p>
        <ol className="mx-auto mt-3 grid max-w-md gap-2 text-left">
          {standings.map((player, index) => (
            <motion.li
              key={player.id}
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.6 + index * 0.08, duration: 0.45, ease: EASE }}
              className={cn(
                "flex items-center gap-3 rounded-2xl border px-3.5 py-3",
                isChampion(player)
                  ? "border-primary/50 bg-primary/[0.1]"
                  : "border-white/[0.08] bg-white/[0.02]",
              )}
            >
              <span
                className={cn(
                  "font-display w-6 text-center text-2xl leading-none",
                  isChampion(player) ? "text-primary" : "text-white/45",
                )}
              >
                {index + 1}
              </span>
              <PlayerAvatar name={player.name} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-white/90">
                  {player.name}
                  {player.id === room.me?.id && (
                    <span className="ml-1.5 text-[10px] tracking-wider text-white/40 uppercase">
                      you
                    </span>
                  )}
                </span>
                <span className="block text-[10px] tracking-wide text-white/45">
                  ✓ {player.solves} solved · {player.correct} parts ·{" "}
                  {player.attempts} guesses
                </span>
              </span>
              {isChampion(player) && (
                <Trophy className="h-4 w-4 shrink-0 text-primary" />
              )}
              <span className="font-display w-14 text-right text-2xl leading-none gold-text">
                {player.points}
              </span>
            </motion.li>
          ))}
        </ol>
      </motion.div>

      {room.me?.isHost ? (
        <button
          type="button"
          onClick={playAgain}
          disabled={busy}
          className="kolly-cta flex h-14 w-full items-center justify-center gap-2.5 rounded-2xl border border-primary/45 bg-transparent text-base font-semibold text-primary transition-all hover:-translate-y-0.5 hover:bg-primary/10 disabled:opacity-60"
        >
          {busy ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              <RotateCcw className="h-4 w-4" /> PLAY AGAIN
            </>
          )}
        </button>
      ) : (
        <p className="flex items-center justify-center gap-2 text-sm text-white/50">
          <ArrowRight className="h-4 w-4 text-primary/70" />
          Waiting for the host to start a new game…
        </p>
      )}

      {error && <p className="text-center text-sm text-[#c08a6e]">{error}</p>}
    </Shell>
  );
}
