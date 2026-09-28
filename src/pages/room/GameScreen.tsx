import { PaperFlash } from "@/components/cinema/CinemaDecor";
import { GuessCard } from "@/components/kollywood/GuessCard";
import { Leaderboard } from "@/components/kollywood/Leaderboard";
import { LivesRow } from "@/components/kollywood/LivesRow";
import { PlayersPanel } from "@/components/kollywood/PlayersPanel";
import { PlusBoard } from "@/components/kollywood/PlusBoard";
import {
  CATEGORY_META,
  CATEGORY_ORDER,
  type Category,
} from "@/components/kollywood/categories";
import { Input } from "@/components/ui/input";
import { api } from "@/convex/_generated/api";
import { cn, friendlyError } from "@/lib/utils";
import type { RoomState } from "@/pages/room/types";
import { AnimatePresence, motion } from "framer-motion";
import { useMutation } from "convex/react";
import {
  Check,
  Clock3,
  Lightbulb,
  Loader2,
  Lock,
  Send,
  X,
} from "lucide-react";
import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";

/** The id of a guess sitting on the creator's desk. */
type PendingGuessId = NonNullable<
  RoomState["entries"][number]["pending"]
>["id"];

const MEDALS = ["🥇", "🥈", "🥉"];

/** How many of the four parts someone already has on their board. */
function discoveredCount(entry: RoomState["entries"][number]): number {
  return CATEGORY_ORDER.filter((c) => entry.revealed[c]).length;
}

/** 🥇 / 🥈 / 🥉 for the podium; nothing deeper than third. */
function medalFor(placement: number | null): string | null {
  return placement && placement <= 3 ? MEDALS[placement - 1] : null;
}

/** "1st place" / "2nd place" … for a finish order. */
function placementLabel(placement: number | null): string {
  if (!placement) return "";
  const suffix =
    placement === 1
      ? "st"
      : placement === 2
        ? "nd"
        : placement === 3
          ? "rd"
          : "th";
  return `${placement}${suffix} place`;
}

/**
 * Round-in-progress screen.
 *
 * Everyone guesses the SAME question at the same time, but with completely
 * independent boards and their own nine KOLLYWOOD chances. The one player who
 * wrote the question judges every guess from the control panel.
 */
export function GameScreen({
  room,
  token,
}: {
  room: RoomState;
  token: string;
}) {
  return (
    <div className="mx-auto grid w-full max-w-6xl flex-1 gap-5 px-4 py-5 lg:grid-cols-[minmax(0,1fr)_300px]">
      <section className="flex min-w-0 flex-col gap-5">
        {room.me?.isCreator ? (
          <CreatorPanel room={room} token={token} />
        ) : (
          <GuesserScreen room={room} token={token} />
        )}
      </section>

      <aside className="flex flex-col gap-5">
        <PlayersPanel room={room} />
        <Leaderboard room={room} />
      </aside>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Shared bits                                                         */
/* ------------------------------------------------------------------ */

function RoundBanner({
  room,
  children,
}: {
  room: RoomState;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-2">
      {room.isShowdown ? (
        <span className="rounded-full border border-[#c08a6e]/45 bg-[#c08a6e]/10 px-2.5 py-1 text-[9px] font-semibold tracking-[0.18em] text-[#c08a6e] uppercase">
          ⚡ Final showdown
        </span>
      ) : (
        <span className="rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-[9px] font-semibold tracking-[0.18em] text-primary uppercase">
          Round {room.round} / {room.roundsTotal}
        </span>
      )}
      <span className="text-[10px] font-semibold tracking-[0.3em] text-white/45 uppercase sm:text-[11px]">
        {room.creatorName ? `${room.creatorName}'s question` : "The question"}
      </span>
      {children}
    </div>
  );
}

/** ✓ / ? markers for the four parts on someone else's board. */
function ProgressDots({ entry }: { entry: RoomState["entries"][number] }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {CATEGORY_ORDER.map((category) => {
        const found = !!entry.revealed[category];
        const meta = CATEGORY_META[category];
        return (
          <span
            key={category}
            title={`${meta.label}: ${found ? "found" : "not found yet"}`}
            className={cn(
              "flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold tracking-[0.1em] uppercase",
              found
                ? "border-primary/45 bg-primary/10 text-primary"
                : "border-white/12 text-white/35",
            )}
          >
            <span aria-hidden>{meta.icon}</span>
            {found ? "✓" : "?"}
          </span>
        );
      })}
    </div>
  );
}

function StatusPill({
  status,
}: {
  status: RoomState["entries"][number]["status"];
}) {
  if (status === "solved") {
    return (
      <span className="flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-[9px] font-bold tracking-[0.14em] text-primary-foreground uppercase">
        <Check className="h-3 w-3" /> Solved
      </span>
    );
  }
  if (status === "failed") {
    return (
      <span className="flex items-center gap-1 rounded-full bg-destructive/20 px-2 py-0.5 text-[9px] font-bold tracking-[0.14em] text-[#c08a6e] uppercase">
        <X className="h-3 w-3" /> Failed
      </span>
    );
  }
  return (
    <span className="animate-pulse rounded-full border border-primary/40 bg-primary/10 px-2 py-0.5 text-[9px] font-bold tracking-[0.14em] text-primary uppercase">
      playing
    </span>
  );
}

function AwaitingOthers({ room }: { room: RoomState }) {
  const all = room.entries;
  const done = all.filter((e) => e.status !== "playing").length;
  // Podium finishers first, then whoever is furthest along the board.
  const ranked = [...all].sort((a, b) => {
    const pa = a.placement ?? 99;
    const pb = b.placement ?? 99;
    if (pa !== pb) return pa - pb;
    return discoveredCount(b) - discoveredCount(a);
  });
  const firstSolver = ranked.find((e) => e.status === "solved");

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-5"
    >
      {firstSolver && (
        <motion.div
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: "spring", stiffness: 220, damping: 18 }}
          className="mb-4 rounded-2xl border border-primary/50 bg-primary/[0.1] px-4 py-3.5 text-center"
        >
          <p className="font-display gold-text text-glow-gold text-2xl tracking-[0.08em]">
            🏆 {firstSolver.playerName.toUpperCase()} SOLVED IT FIRST!
          </p>
          <p className="mt-1 text-xs text-white/60">
            +{firstSolver.score} points for the fastest board
          </p>
        </motion.div>
      )}

      <p className="text-center text-[11px] font-semibold tracking-[0.3em] text-white/55 uppercase">
        ⚡ Live players
      </p>
      <p className="mt-1 text-center text-xs text-white/45">
        {done} of {all.length} finished — the round runs on until everybody is
        done. Nobody can see your answers.
      </p>
      <ul className="mt-3 grid gap-2 sm:grid-cols-2">
        {ranked.map((entry) => {
          const found = discoveredCount(entry);
          const medal = medalFor(entry.placement);
          return (
            <li
              key={entry.playerId}
              className={cn(
                "flex flex-wrap items-center gap-2.5 rounded-xl border px-3 py-2",
                entry.isMine
                  ? "border-primary/40 bg-primary/[0.08]"
                  : "border-white/[0.07] bg-white/[0.02]",
              )}
            >
              <span className="font-display grid h-7 w-7 shrink-0 place-items-center rounded-full bg-gradient-to-br from-primary/70 to-[#8a5138]/70 text-xs text-black">
                {entry.playerName.charAt(0).toUpperCase()}
              </span>
              <span className="min-w-0 flex-1 truncate text-sm text-white/90">
                {entry.playerName}
                {entry.isMine && (
                  <span className="ml-1.5 text-[10px] tracking-wider text-white/40 uppercase">
                    you
                  </span>
                )}
              </span>
              {medal && (
                <span className="shrink-0 text-base leading-none" title={placementLabel(entry.placement)}>
                  {medal}
                </span>
              )}
              {found === 3 && entry.status === "playing" && (
                <span className="shrink-0 text-[11px] tracking-wide text-[#c08a6e]">
                  🔥 close!
                </span>
              )}
              <span className="shrink-0 text-[11px] tabular-nums text-white/60">
                {found} / 4 discovered
              </span>
              <StatusPill status={entry.status} />
            </li>
          );
        })}
      </ul>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/* Guesser: my own board, my own nine chances                          */
/* ------------------------------------------------------------------ */

function GuesserScreen({ room, token }: { room: RoomState; token: string }) {
  const submitGuess = useMutation(api.game.submitGuess);
  const requestClue = useMutation(api.game.requestClue);

  const entry = room.entry;
  const question = room.question;
  const [selected, setSelected] = useState<Category | null>(null);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [clueBusy, setClueBusy] = useState(false);
  const [impact, setImpact] = useState<{ category: Category; id: number } | null>(
    null,
  );
  const [flash, setFlash] = useState<{
    id: number;
    title: string;
    subtitle: string;
  } | null>(null);
  const previousStatus = useRef(entry?.status);

  const revealed = entry?.revealed ?? {
    hero: false,
    heroine: false,
    movie: false,
    song: false,
  };
  const previousLives = useRef(entry?.lives ?? 9);

  // Keep the spotlight on a part that's still hiding on my board.
  useEffect(() => {
    if (entry?.status !== "playing") {
      setSelected(null);
      return;
    }
    setSelected((current) => {
      if (current && !revealed[current]) return current;
      return CATEGORY_ORDER.find((c) => !revealed[c]) ?? null;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    room.round,
    entry?.status,
    revealed.hero,
    revealed.heroine,
    revealed.movie,
    revealed.song,
  ]);

  // A burned letter shakes the part that just failed on MY board.
  useEffect(() => {
    const lives = entry?.lives ?? 9;
    if (lives < previousLives.current) {
      const lastWrong = [...room.guesses]
        .reverse()
        .find((g) => g.status === "wrong");
      setImpact({
        category: (lastWrong?.category as Category) ?? "movie",
        id: Date.now(),
      });
    }
    previousLives.current = lives;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entry?.lives]);

  // A vintage camera flash the moment my own board is fully cracked.
  useEffect(() => {
    if (entry?.status === "solved" && previousStatus.current !== "solved") {
      setFlash({
        id: Date.now(),
        title: "SOLVED",
        subtitle: entry.placement
          ? `${medalFor(entry.placement) ?? "🏁"} ${placementLabel(entry.placement)} · +${entry.score} pts`
          : `+${entry.score} pts`,
      });
    }
    previousStatus.current = entry?.status;
  }, [entry?.status, entry?.placement, entry?.score]);

  // Late arrivals have no board for a question that's already live.
  if (!entry || !question) {
    return (
      <>
        <div className="glass-deep rounded-3xl px-6 py-10 text-center">
          <p className="text-4xl">🎟️</p>
          <p className="font-display mt-4 text-2xl tracking-[0.14em] text-white">
            {room.isShowdown
              ? "THE FINAL SHOWDOWN IS ON"
              : `ROUND ${room.round} IS ALREADY PLAYING`}
          </p>
          <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-white/60">
            {room.isShowdown
              ? "The title is being decided right now by the players level on points — you're watching this one from the stalls."
              : "You joined after this question went live, so you sit this one out — you get your own fresh nine chances from the next question."}
          </p>
        </div>
        <AwaitingOthers room={room} />
      </>
    );
  }

  const playing = entry.status === "playing";
  const pending = room.guesses.find((g) => g.status === "pending");
  const meta = selected ? CATEGORY_META[selected] : null;

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!selected || !text.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await submitGuess({ token, category: selected, text });
      setText("");
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setBusy(false);
    }
  };

  const handleClueRequest = async () => {
    setClueBusy(true);
    setError(null);
    try {
      await requestClue({ token });
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setClueBusy(false);
    }
  };

  return (
    <>
      {flash && (
        <PaperFlash
          key={flash.id}
          title={flash.title}
          subtitle={flash.subtitle}
          onDone={() => setFlash(null)}
        />
      )}

      <div className="glass-deep grain relative overflow-hidden rounded-3xl px-3 py-6 sm:px-8 sm:py-8">
        <RoundBanner room={room}>
          {playing ? (
            <span className="rounded-full border border-primary/40 bg-primary/10 px-2.5 py-1 text-[9px] font-semibold tracking-[0.16em] text-primary uppercase">
              🎯 your board
            </span>
          ) : (
            <StatusPill status={entry.status} />
          )}
        </RoundBanner>

        <div className="mt-6">
          <PlusBoard
            initials={question.initials}
            revealed={revealed}
            values={question.values}
            selected={selected}
            onSelect={playing ? setSelected : undefined}
            impact={impact}
          />
        </div>

        {/* ---------- my nine chances ---------- */}
        <div className="mt-7 flex flex-col items-center gap-3.5">
          <p
            className={cn(
              "text-[11px] font-semibold tracking-[0.3em] uppercase sm:text-xs",
              entry.lives <= 3
                ? "animate-pulse text-[#c08a6e]"
                : "text-primary/80",
            )}
          >
            {entry.lives} {entry.lives === 1 ? "chance" : "chances"} left · all
            yours
          </p>
          <LivesRow lives={entry.lives} />
        </div>

        {/* ---------- my clue ---------- */}
        {entry.clue ? (
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
                <p className="flex flex-wrap items-center gap-2 text-[10px] font-semibold tracking-[0.3em] text-primary/85 uppercase">
                  Private clue
                  {entry.clueCategory && (
                    <span className="rounded-full border border-primary/40 px-2 py-0.5 tracking-[0.16em] text-primary/90">
                      {CATEGORY_META[entry.clueCategory].icon}{" "}
                      {CATEGORY_META[entry.clueCategory].label}
                    </span>
                  )}
                </p>
                <p className="mt-1.5 text-sm leading-relaxed text-white/85 italic sm:text-base">
                  “{entry.clue}”
                </p>
                <p className="mt-1.5 text-[11px] text-white/40">
                  Only you can see this — nobody else got it.
                </p>
              </div>
            </div>
          </motion.div>
        ) : entry.clueRequested ? (
          <div className="mt-6 flex items-center justify-center gap-2 rounded-2xl border border-[#c0bba1]/35 bg-[#c0bba1]/[0.07] px-4 py-3 text-center text-xs text-white/60">
            <Clock3 className="h-3.5 w-3.5 text-[#c0bba1]" />
            Clue requested — waiting for {room.creatorName} to answer.
          </div>
        ) : entry.canRequestClue ? (
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-6 flex flex-col items-center gap-2.5 rounded-2xl border border-[#c0bba1]/40 bg-[#c0bba1]/10 px-4 py-4 text-center"
          >
            <p className="text-[11px] font-semibold tracking-[0.3em] text-[#c0bba1] uppercase">
              💡 Clue available
            </p>
            <p className="text-xs text-white/55">
              You&apos;ve spent 5 chances. {room.creatorName} can hand you one
              private hint.
            </p>
            <button
              type="button"
              onClick={handleClueRequest}
              disabled={clueBusy}
              className="flex h-10 items-center gap-1.5 rounded-xl bg-[#c0bba1] px-5 text-sm font-semibold text-black transition-all hover:-translate-y-0.5 disabled:opacity-55"
            >
              {clueBusy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Lightbulb className="h-4 w-4" /> ASK FOR A CLUE
                </>
              )}
            </button>
          </motion.div>
        ) : null}

        {/* ---------- guess desk ---------- */}
        <div className="mt-6">
          {playing ? (
            pending ? (
              <StatusBlock
                icon="⏳"
                title="Your guess is on the desk"
                body={`Waiting for ${room.creatorName} to call it…`}
              />
            ) : (
              <form onSubmit={handleSubmit} className="grid gap-3.5">
                <p className="text-center text-[11px] font-semibold tracking-[0.3em] text-primary uppercase">
                  🎯 What do you want to guess?
                </p>

                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {CATEGORY_ORDER.map((category) => (
                    <CategoryButton
                      key={category}
                      category={category}
                      found={revealed[category]}
                      active={selected === category}
                      onSelect={setSelected}
                    />
                  ))}
                </div>

                <div className="flex flex-col gap-2.5 sm:flex-row">
                  <Input
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder={
                      meta ? meta.placeholder : "Pick a part above first"
                    }
                    disabled={!selected}
                    maxLength={90}
                    autoComplete="off"
                    className="h-14 flex-1 rounded-2xl border-white/15 bg-white/5 text-center text-lg placeholder:text-white/30 focus-visible:border-primary/60 focus-visible:ring-primary/30 sm:text-left"
                  />
                  <button
                    type="submit"
                    disabled={busy || !text.trim() || !selected}
                    className={cn(
                      "kolly-cta flex h-14 items-center justify-center gap-2 rounded-2xl px-8 text-base font-semibold tracking-wide transition-all",
                      text.trim() && selected
                        ? "bg-primary text-primary-foreground shadow-[0_10px_34px_rgba(116,124,91,0.3)] hover:-translate-y-0.5 hover:shadow-[0_14px_44px_rgba(116,124,91,0.45)] active:translate-y-0"
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

                {meta && (
                  <p className="text-center text-[11px] tracking-[0.18em] text-white/40 uppercase">
                    {meta.icon} {meta.ask}
                  </p>
                )}
              </form>
            )
          ) : entry.status === "solved" ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              className="rounded-2xl border border-primary/50 bg-primary/[0.09] px-4 py-6 text-center"
            >
              <p className="font-display text-3xl tracking-[0.12em] gold-text">
                🎉 YOU CRACKED ALL FOUR!
              </p>
              {entry.placement ? (
                <p className="font-display text-glow-gold mt-3 text-5xl leading-none gold-text">
                  {medalFor(entry.placement) ?? "🏁"}{" "}
                  <span className="text-3xl tracking-[0.06em]">
                    {placementLabel(entry.placement).toUpperCase()}
                  </span>
                </p>
              ) : null}
              <motion.p
                initial={{ opacity: 0, scale: 0.7 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: "spring", stiffness: 260, damping: 16, delay: 0.15 }}
                className="font-display mt-2 text-4xl leading-none text-primary"
              >
                +{entry.score}
              </motion.p>
              <p className="mt-2 text-sm text-white/65">
                Finished with {entry.lives} of 9 chances to spare
              </p>
              <p className="mt-1 text-xs text-white/45">
                Hang tight — the round ends when everyone is done.
              </p>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              className="rounded-2xl border border-destructive/40 bg-destructive/[0.08] px-4 py-6 text-center"
            >
              <p className="font-display text-3xl tracking-[0.12em] text-[#c08a6e] text-glow-ember">
                🎞️ OUT OF CHANCES
              </p>
              <p className="mt-2 text-sm text-white/65">
                The film got away this time — 0 points for this question.
              </p>
              <p className="mt-1 text-xs text-white/45">
                Stick around to watch the rest of the round play out.
              </p>
            </motion.div>
          )}

          {error && (
            <p className="mt-3 text-center text-sm text-[#c08a6e]">{error}</p>
          )}
        </div>
      </div>

      <AwaitingOthers room={room} />

      {room.guesses.length > 0 && (
        <div className="glass rounded-2xl p-4 sm:p-5">
          <p className="text-[11px] font-semibold tracking-[0.3em] text-white/55 uppercase">
            🎞️ Your guesses this round
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
    </>
  );
}

function CategoryButton({
  category,
  found,
  active,
  onSelect,
}: {
  category: Category;
  found: boolean;
  active: boolean;
  onSelect: (category: Category) => void;
}) {
  const meta = CATEGORY_META[category];
  return (
    <button
      type="button"
      disabled={found}
      onClick={() => onSelect(category)}
      aria-pressed={active}
      className={cn(
        "flex h-12 items-center justify-center gap-1.5 rounded-xl border text-sm font-semibold transition-all",
        found
          ? "cursor-default border-primary/35 bg-primary/[0.07] text-primary/70"
          : active
            ? "-translate-y-0.5 border-primary/70 bg-primary/15 text-primary shadow-[0_8px_24px_rgba(116,124,91,0.2)]"
            : "border-white/12 bg-white/[0.04] text-white/70 hover:-translate-y-0.5 hover:border-primary/45 hover:text-white",
      )}
    >
      <span aria-hidden>{meta.icon}</span>
      {meta.label}
      {found && <Check className="h-3.5 w-3.5" />}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Creator: the question control panel                                 */
/* ------------------------------------------------------------------ */

function CreatorPanel({ room, token }: { room: RoomState; token: string }) {
  const judgeGuess = useMutation(api.game.judgeGuess);
  const [busyId, setBusyId] = useState<PendingGuessId | null>(null);
  const [error, setError] = useState<string | null>(null);

  const answer = room.answerKey;
  const finished = room.entries.filter((e) => e.status !== "playing").length;
  const clueRequests = room.entries.filter((e) => e.clueRequested && !e.clue);

  const judge = async (guessId: PendingGuessId, correct: boolean) => {
    setBusyId(guessId);
    setError(null);
    try {
      await judgeGuess({ token, guessId, correct });
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <>
      <div className="glass-deep grain relative overflow-hidden rounded-3xl px-3 py-6 sm:px-8 sm:py-8">
        <RoundBanner room={room}>
          <span className="rounded-full border border-primary/35 bg-primary/10 px-2.5 py-1 text-[9px] font-semibold tracking-[0.16em] text-primary uppercase">
            👑 you judge
          </span>
        </RoundBanner>

        <h2 className="font-display mt-5 text-center text-2xl tracking-[0.1em] text-white sm:text-3xl">
          {room.entries.length} PLAYER
          {room.entries.length === 1 ? "" : "S"} ARE GUESSING
        </h2>
        <p className="mt-1.5 text-center text-xs text-white/50">
          {finished} of {room.entries.length} finished — the round only ends
          once everybody is done.
        </p>

        {/* ---------- answer key ---------- */}
        {answer && (
          <div className="mx-auto mt-5 max-w-lg rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3.5">
            <p className="flex items-center gap-1.5 text-[10px] font-semibold tracking-[0.3em] text-white/45 uppercase">
              <Lock className="h-3 w-3" /> Your answer key
            </p>
            <ul className="mt-2.5 grid gap-1.5 sm:grid-cols-2">
              {CATEGORY_ORDER.map((category) => (
                <li key={category} className="flex items-center gap-2 text-sm">
                  <span aria-hidden>{CATEGORY_META[category].icon}</span>
                  <span className="min-w-0 flex-1 truncate text-white/85">
                    {answer[category]}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* ---------- per-player cards ---------- */}
        <ul className="mt-6 grid gap-3">
          {room.entries.map((entry) => (
            <motion.li
              key={entry.playerId}
              layout
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn(
                "rounded-2xl border px-4 py-4",
                entry.pending
                  ? "border-primary/45 bg-primary/[0.07]"
                  : "border-white/[0.08] bg-white/[0.02]",
              )}
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-display grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gradient-to-br from-primary/70 to-[#8a5138]/70 text-sm text-black">
                  {entry.playerName.charAt(0).toUpperCase()}
                </span>
                <span className="min-w-0 flex-1 truncate text-sm font-semibold text-white/90">
                  {entry.playerName}
                </span>
                <span className="text-[11px] tabular-nums text-white/45">
                  {entry.lives}/9 chances
                </span>
                {entry.placement && (
                  <span
                    className="shrink-0 text-base leading-none"
                    title={placementLabel(entry.placement)}
                  >
                    {medalFor(entry.placement) ?? "🏁"}
                  </span>
                )}
                {entry.score > 0 && (
                  <span className="font-display text-lg leading-none gold-text">
                    +{entry.score}
                  </span>
                )}
                <StatusPill status={entry.status} />
              </div>

              <div className="mt-3">
                <ProgressDots entry={entry} />
              </div>

              {/* their guess, waiting on your call */}
              {entry.pending && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-3 rounded-xl border border-primary/40 bg-primary/[0.08] px-3.5 py-3"
                >
                  <p className="flex flex-wrap items-center gap-2 text-[10px] font-semibold tracking-[0.24em] text-primary uppercase">
                    🎯 guess
                    <span className="rounded-full border border-primary/45 px-2 py-0.5 tracking-[0.16em]">
                      {CATEGORY_META[entry.pending.category].icon}{" "}
                      {CATEGORY_META[entry.pending.category].label}
                    </span>
                  </p>
                  <p className="font-display mt-1.5 text-3xl leading-none tracking-wide gold-text">
                    “{entry.pending.text}”
                  </p>
                  <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                    <button
                      type="button"
                      disabled={busyId === entry.pending.id}
                      onClick={() => judge(entry.pending!.id, true)}
                      className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-primary text-sm font-semibold text-primary-foreground shadow-[0_8px_26px_rgba(116,124,91,0.3)] transition-all hover:-translate-y-0.5 disabled:opacity-60"
                    >
                      {busyId === entry.pending.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <Check className="h-4 w-4" /> CORRECT
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      disabled={busyId === entry.pending.id}
                      onClick={() => judge(entry.pending!.id, false)}
                      className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-destructive/55 bg-destructive/10 text-sm font-semibold text-[#c08a6e] transition-all hover:-translate-y-0.5 hover:bg-destructive/20 disabled:opacity-60"
                    >
                      <X className="h-4 w-4" /> WRONG
                    </button>
                  </div>
                </motion.div>
              )}

              {/* the clue you already handed over */}
              {entry.clue && (
                <p className="mt-2.5 text-xs text-white/50">
                  💡 Clue given:{" "}
                  <span className="text-white/80 italic">“{entry.clue}”</span>
                </p>
              )}

              {/* clue request waiting on you */}
              {entry.clueRequested &&
                !entry.clue &&
                entry.status === "playing" && (
                  <ClueForm
                    room={room}
                    token={token}
                    entry={entry}
                    onError={setError}
                  />
                )}
            </motion.li>
          ))}
        </ul>

        {error && (
          <p className="mt-4 text-center text-sm text-[#c08a6e]">{error}</p>
        )}
      </div>

      {clueRequests.length > 0 && (
        <p className="text-center text-xs text-white/45">
          💡 {clueRequests.length} player
          {clueRequests.length === 1 ? " is" : "s are"} waiting on a private
          clue.
        </p>
      )}

      {room.guesses.length > 0 && (
        <div className="glass rounded-2xl p-4 sm:p-5">
          <p className="text-[11px] font-semibold tracking-[0.3em] text-white/55 uppercase">
            🎞️ Every guess this round
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
    </>
  );
}

/** Hand ONE player a private clue, aimed at one of their missing parts. */
function ClueForm({
  room,
  token,
  entry,
  onError,
}: {
  room: RoomState;
  token: string;
  entry: RoomState["entries"][number];
  onError: (message: string | null) => void;
}) {
  const giveClue = useMutation(api.game.giveClue);
  const available = CATEGORY_ORDER.filter((c) => !entry.revealed[c]);
  const [category, setCategory] = useState<Category>(available[0] ?? "movie");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!text.trim()) return;
    setBusy(true);
    onError(null);
    try {
      await giveClue({ token, playerId: entry.playerId, category, text });
      setText("");
    } catch (err) {
      onError(friendlyError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <motion.form
      onSubmit={handleSubmit}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-3 rounded-xl border border-[#c0bba1]/40 bg-[#c0bba1]/10 px-3.5 py-3"
    >
      <p className="text-[10px] font-semibold tracking-[0.26em] text-[#c0bba1] uppercase">
        💡 {entry.playerName} asked for a clue
      </p>
      <p className="mt-1 text-[11px] text-white/50">
        Only {entry.playerName} will see it.
      </p>

      <div className="mt-2.5 flex flex-wrap gap-1.5">
        {available.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setCategory(c)}
            className={cn(
              "rounded-full border px-2.5 py-1 text-[11px] transition-all",
              category === c
                ? "border-[#c0bba1] bg-[#c0bba1]/20 text-[#c0bba1]"
                : "border-white/15 text-white/60 hover:border-[#c0bba1]/50 hover:text-white",
            )}
          >
            {CATEGORY_META[c].icon} {CATEGORY_META[c].label}
          </button>
        ))}
      </div>

      <div className="mt-2.5 flex flex-col gap-2 sm:flex-row">
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="This one released in 2004…"
          maxLength={140}
          className="h-10 flex-1 rounded-xl border-white/15 bg-white/5 text-sm placeholder:text-white/30 focus-visible:border-[#c0bba1]/60 focus-visible:ring-[#c0bba1]/30"
        />
        <button
          type="submit"
          disabled={busy || !text.trim()}
          className="flex h-10 items-center justify-center gap-1.5 rounded-xl bg-[#c0bba1] px-4 text-sm font-semibold text-black transition-all hover:-translate-y-0.5 disabled:opacity-55"
        >
          {busy ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              <Send className="h-3.5 w-3.5" /> SEND
            </>
          )}
        </button>
      </div>
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
  body: ReactNode;
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
