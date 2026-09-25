import { GuessCard } from "@/components/kollywood/GuessCard";
import { Leaderboard } from "@/components/kollywood/Leaderboard";
import { LivesRow } from "@/components/kollywood/LivesRow";
import { PlayersPanel } from "@/components/kollywood/PlayersPanel";
import { ClueCross } from "@/components/kollywood/ClueCross";
import { Input } from "@/components/ui/input";
import { api } from "@/convex/_generated/api";
import { cn, friendlyError } from "@/lib/utils";
import type { RoomState } from "@/pages/room/types";
import { AnimatePresence, motion } from "framer-motion";
import { useMutation } from "convex/react";
import { Check, Lightbulb, Loader2, Sparkles, X } from "lucide-react";
import { useState, type FormEvent } from "react";
import { GameOverOverlay, WinOverlay } from "./ResultOverlays";

/**
 * The game screen: clue cross, KOLLYWOOD lives, guessing desk / judge's
 * desk, clue spotlight, guess history, players and leaderboard.
 */
export function GameScreen({
  room,
  token,
}: {
  room: RoomState;
  token: string;
}) {
  const pendingGuess = room.guesses.find((g) => g.status === "pending");
  const correctGuess = room.guesses.find((g) => g.status === "correct");
  const isCreator = !!room.me?.isCreator;

  return (
    <>
      <div className="mx-auto grid w-full max-w-6xl flex-1 gap-5 px-4 py-5 lg:grid-cols-[minmax(0,1fr)_300px]">
        <section className="flex min-w-0 flex-col gap-5">
          {/* ---------- clue + lives + desk ---------- */}
          <div className="glass-deep relative overflow-hidden rounded-3xl px-4 py-6 sm:px-8 sm:py-8">
            <div className="flex flex-wrap items-center justify-center gap-2">
              <span className="text-[10px] font-semibold tracking-[0.35em] text-white/45 uppercase sm:text-[11px]">
                Current question
              </span>
              {isCreator && (
                <span className="rounded-full border border-primary/35 bg-primary/10 px-2.5 py-1 text-[9px] font-semibold tracking-[0.16em] text-primary uppercase">
                  👑 you judge
                </span>
              )}
              {room.myTurn && (
                <span className="animate-pulse rounded-full border border-primary/50 bg-primary/15 px-2.5 py-1 text-[9px] font-semibold tracking-[0.16em] text-primary uppercase">
                  🎯 your turn
                </span>
              )}
              {pendingGuess && (
                <span className="rounded-full border border-[#7c5cff]/45 bg-[#7c5cff]/15 px-2.5 py-1 text-[9px] font-semibold tracking-[0.16em] text-[#b8a8ff] uppercase">
                  ⏳ judging
                </span>
              )}
            </div>

            <div className="mt-5">
              {room.question && (
                <ClueCross key={room.round} initials={room.question.initials} />
              )}
            </div>

            {/* ---------- nine lives ---------- */}
            <div className="mt-6 flex flex-col items-center gap-3.5">
              <p
                className={cn(
                  "text-[11px] font-semibold tracking-[0.3em] uppercase sm:text-xs",
                  room.lives <= 3
                    ? "animate-pulse text-[#ff7a55]"
                    : "text-primary/80",
                )}
              >
                {room.lives} {room.lives === 1 ? "chance" : "chances"} remaining
              </p>
              <LivesRow lives={room.lives} />
            </div>

            {/* ---------- spotlight clue ---------- */}
            {room.clue && (
              <motion.div
                initial={{ opacity: 0, y: 16, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
                className="relative mt-6 overflow-hidden rounded-2xl border border-primary/30 bg-primary/[0.07] px-4 py-4 sm:px-5"
              >
                <span
                  aria-hidden
                  className="animate-sweep pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 bg-gradient-to-r from-transparent via-primary/25 to-transparent"
                />
                <div className="flex items-start gap-3">
                  <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <div>
                    <p className="text-[10px] font-semibold tracking-[0.3em] text-primary/85 uppercase">
                      Spotlight clue
                    </p>
                    <p className="mt-1 text-sm leading-relaxed text-white/85 italic sm:text-base">
                      “{room.clue}”
                    </p>
                  </div>
                </div>
              </motion.div>
            )}

            {/* ---------- desk ---------- */}
            <div className="mt-6">
              {isCreator ? (
                <JudgeDesk room={room} token={token} />
              ) : (
                <GuesserDesk room={room} token={token} />
              )}
            </div>
          </div>

          {/* ---------- guess history ---------- */}
          {room.guesses.length > 0 && (
            <div className="glass rounded-2xl p-4 sm:p-5">
              <p className="text-[11px] font-semibold tracking-[0.3em] text-white/55 uppercase">
                🎞️ Guesses this round
              </p>
              <ul className="mt-3 grid gap-2.5">
                <AnimatePresence initial={false}>
                  {room.guesses.map((guess) => (
                    <GuessCard key={guess.id} guess={guess} />
                  ))}
                </AnimatePresence>
              </ul>
            </div>
          )}
        </section>

        {/* ---------- sidebar ---------- */}
        <aside className="flex flex-col gap-5">
          <PlayersPanel room={room} />
          <Leaderboard room={room} />
        </aside>
      </div>

      {/* ---------- results ---------- */}
      {room.status === "won" && room.question && (
        <WinOverlay
          key={room.round}
          room={room}
          token={token}
          winnerName={correctGuess?.playerName ?? ""}
        />
      )}
      {room.status === "over" && room.question && (
        <GameOverOverlay key={room.round} room={room} token={token} />
      )}
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Guesser: the cinematic guess desk                                   */
/* ------------------------------------------------------------------ */

function GuesserDesk({ room, token }: { room: RoomState; token: string }) {
  const submitGuess = useMutation(api.game.submitGuess);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const pending = room.guesses.find((g) => g.status === "pending");
  const turn = room.players.find((p) => p.isTurn);
  const creator = room.players.find((p) => p.isCreator);

  if (pending) {
    return (
      <StatusBlock
        icon="⏳"
        title={
          pending.isMine
            ? "Your guess is on the desk"
            : `${pending.playerName}'s guess is being judged`
        }
        body={`Waiting for ${creator?.name ?? "the creator"} to call it…`}
      />
    );
  }

  if (!room.myTurn) {
    return (
      <StatusBlock
        icon="🎯"
        title={turn ? `Waiting for ${turn.name}` : "Waiting for the next guess"}
        body="The mic is passed around — your turn is coming."
      />
    );
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!text.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await submitGuess({ token, text });
      setText("");
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="grid gap-3">
      <p className="text-center text-[11px] font-semibold tracking-[0.3em] text-primary uppercase">
        🎯 Your turn — name that movie
      </p>
      <div className="flex flex-col gap-2.5 sm:flex-row">
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="What movie is this?"
          maxLength={90}
          autoComplete="off"
          className="h-14 flex-1 rounded-2xl border-white/15 bg-white/5 text-center text-lg placeholder:text-white/30 focus-visible:border-primary/60 focus-visible:ring-primary/30 sm:text-left"
        />
        <button
          type="submit"
          disabled={busy || !text.trim()}
          className={cn(
            "kolly-cta flex h-14 items-center justify-center gap-2 rounded-2xl px-8 text-base font-semibold tracking-wide transition-all",
            text.trim()
              ? "bg-primary text-primary-foreground shadow-[0_10px_34px_rgba(245,197,66,0.3)] hover:-translate-y-0.5 hover:shadow-[0_14px_44px_rgba(245,197,66,0.45)] active:translate-y-0"
              : "cursor-not-allowed border border-white/10 bg-white/[0.04] text-white/35",
          )}
        >
          {busy ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            "SUBMIT GUESS"
          )}
        </button>
      </div>
      {error && <p className="text-center text-sm text-[#ff7a55]">{error}</p>}
    </form>
  );
}

/* ------------------------------------------------------------------ */
/* Creator: the judge's desk + clue unlock                             */
/* ------------------------------------------------------------------ */

function JudgeDesk({ room, token }: { room: RoomState; token: string }) {
  const judgeGuess = useMutation(api.game.judgeGuess);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pending = room.guesses.find((g) => g.status === "pending");
  const turn = room.players.find((p) => p.isTurn);

  const judge = async (correct: boolean) => {
    if (!pending) return;
    setBusy(true);
    setError(null);
    try {
      await judgeGuess({ token, guessId: pending.id, correct });
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid gap-3">
      {pending ? (
        <motion.div
          initial={{ opacity: 0, y: 18, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ type: "spring", stiffness: 230, damping: 20 }}
          className="relative overflow-hidden rounded-2xl border border-primary/40 bg-primary/[0.07] px-4 py-5 sm:px-6"
        >
          <span
            aria-hidden
            className="animate-sweep pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 bg-gradient-to-r from-transparent via-primary/20 to-transparent"
          />
          <p className="text-[11px] font-semibold tracking-[0.35em] text-primary uppercase">
            Player guess
          </p>
          <p className="mt-1 text-sm text-white/55">
            {pending.playerName} says…
          </p>
          <p className="font-display mt-2.5 text-4xl leading-none tracking-wide gold-text sm:text-5xl">
            “{pending.text}”
          </p>

          <div className="mt-5 flex flex-col gap-2.5 sm:flex-row">
            <button
              type="button"
              disabled={busy}
              onClick={() => judge(true)}
              className="flex h-14 flex-1 items-center justify-center gap-2 rounded-xl bg-primary text-base font-semibold text-primary-foreground shadow-[0_8px_26px_rgba(245,197,66,0.35)] transition-all hover:-translate-y-0.5 hover:shadow-[0_12px_36px_rgba(245,197,66,0.5)] active:translate-y-0 disabled:opacity-60"
            >
              {busy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Check className="h-5 w-5" /> CORRECT
                </>
              )}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => judge(false)}
              className="flex h-14 flex-1 items-center justify-center gap-2 rounded-xl border border-destructive/55 bg-destructive/10 text-base font-semibold text-[#ff7a55] transition-all hover:-translate-y-0.5 hover:bg-destructive/20 active:translate-y-0 disabled:opacity-60"
            >
              <X className="h-5 w-5" /> WRONG
            </button>
          </div>
          {error && <p className="mt-3 text-sm text-[#ff7a55]">{error}</p>}
        </motion.div>
      ) : (
        <StatusBlock
          icon="🎬"
          title="Waiting for a guess"
          body={
            turn
              ? `${turn.name} has the mic — keep the cross on screen.`
              : "The next guesser is stepping up…"
          }
        />
      )}

      <ClueControls room={room} token={token} />
    </div>
  );
}

function ClueControls({ room, token }: { room: RoomState; token: string }) {
  const createClue = useMutation(api.game.createClue);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (room.clue || room.status !== "playing") return null;

  if (!room.clueUnlocked) {
    if (room.wrongGuesses === 0) return null;
    return (
      <div className="flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-center text-[11px] tracking-wider text-white/45">
        <Lightbulb className="h-3.5 w-3.5" />
        Clue unlocks after 5 wrong guesses
        <span className="flex gap-1">
          {Array.from({ length: 5 }, (_, index) => (
            <span
              key={index}
              className={cn(
                "h-1.5 w-1.5 rounded-full",
                index < room.wrongGuesses ? "bg-primary" : "bg-white/20",
              )}
            />
          ))}
        </span>
        <span className="text-white/60">{room.wrongGuesses}/5</span>
      </div>
    );
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!text.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await createClue({ token, text });
      setText("");
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <motion.form
      onSubmit={handleSubmit}
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45 }}
      className="rounded-2xl border border-[#ffd76e]/40 bg-[#ffd76e]/10 px-4 py-4"
    >
      <p className="flex items-center gap-2 text-[11px] font-semibold tracking-[0.3em] text-[#ffd76e] uppercase">
        <Sparkles className="h-3.5 w-3.5" /> Clue available
      </p>
      <p className="mt-1 text-xs text-white/55">
        Drop one hint for everyone — only one clue per question.
      </p>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="This movie released in 2004…"
          maxLength={140}
          className="h-11 flex-1 rounded-xl border-white/15 bg-white/5 text-sm placeholder:text-white/30 focus-visible:border-primary/60 focus-visible:ring-primary/30"
        />
        <button
          type="submit"
          disabled={busy || !text.trim()}
          className="flex h-11 items-center justify-center gap-1.5 rounded-xl bg-[#ffd76e] px-5 text-sm font-semibold text-black transition-all hover:-translate-y-0.5 disabled:opacity-55"
        >
          {busy ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              <Lightbulb className="h-4 w-4" /> DROP CLUE
            </>
          )}
        </button>
      </div>
      {error && <p className="mt-2 text-sm text-[#ff7a55]">{error}</p>}
    </motion.form>
  );
}

/* ------------------------------------------------------------------ */

function StatusBlock({
  icon,
  title,
  body,
}: {
  icon: string;
  title: string;
  body: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center gap-1.5 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-5 text-center"
    >
      <p className="font-display text-xl tracking-[0.12em] text-white/85">
        <span className="mr-2">{icon}</span>
        {title}
      </p>
      <p className="text-xs text-white/50">{body}</p>
    </motion.div>
  );
}
