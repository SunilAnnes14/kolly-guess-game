import { Clapperboard as ClapperboardArt, FilmReel, Projector } from "@/components/cinema/CinemaDecor";
import { ClueCross } from "@/components/kollywood/ClueCross";
import { Input } from "@/components/ui/input";
import { api } from "@/convex/_generated/api";
import { searchMovies, type MovieRecord } from "@/lib/movieDataset";
import { cn, friendlyError } from "@/lib/utils";
import type { RoomState } from "@/pages/room/types";
import { AnimatePresence, motion } from "framer-motion";
import { useMutation } from "convex/react";
import {
  Clapperboard,
  Heart,
  Loader2,
  Music2,
  PencilLine,
  Search,
  Sparkles,
  User,
} from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";

/** Same first-letter rule the server uses (Latin or Tamil script). */
function firstLetter(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "?";
  const letter = trimmed.match(/\p{L}/u)?.[0];
  return (letter ?? trimmed.charAt(0)).toUpperCase();
}

/** The four answers the creator writes — the whole question. */
type Answers = { hero: string; heroine: string; movie: string; song: string };

const EMPTY_ANSWERS: Answers = { hero: "", heroine: "", movie: "", song: "" };

const FIELDS = [
  { key: "hero", label: "Hero", placeholder: "Vijay", Icon: User },
  { key: "heroine", label: "Heroine", placeholder: "Trisha", Icon: Heart },
  { key: "movie", label: "Movie", placeholder: "Ghilli", Icon: Clapperboard },
  { key: "song", label: "Song", placeholder: "Appadi Podu", Icon: Music2 },
] as const;

const MAX = { hero: 60, heroine: 60, movie: 80, song: 80 } as const;

/**
 * This round's question creator — the vintage production desk.
 *
 * The creator types all four answers themselves (hero, heroine, movie, song).
 * The movie library is only a head start: pick a row and it prefills the four
 * fields, which stay fully editable, or skip it entirely and type a film that
 * is not in the book. Whatever is in the fields when the clapperboard drops IS
 * the question, and the server validates every guess against it automatically.
 */
export function QuestionCreator({
  room,
  token,
}: {
  room: RoomState;
  token: string;
}) {
  const submitQuestion = useMutation(api.game.submitQuestion);
  const [mode, setMode] = useState<"library" | "manual">("library");
  const [query, setQuery] = useState("");
  const [picked, setPicked] = useState<MovieRecord | null>(null);
  const [answers, setAnswers] = useState<Answers>(EMPTY_ANSWERS);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const results = useMemo(
    () => (query.trim() ? searchMovies(query, 6) : []),
    [query],
  );

  const guessers = room.isShowdown
    ? room.tiebreakIds.filter((id) => id !== room.me?.id).length
    : Math.max(0, room.players.length - 1);

  // Every one of the four answers is required — there is no database to fall
  // back on, so the question is only ready when all four fields are filled.
  const ready = FIELDS.every((field) => answers[field.key].trim().length > 0);

  const chooseMovie = (record: MovieRecord) => {
    setPicked(record);
    setAnswers({
      hero: record.hero,
      heroine: record.heroine,
      movie: record.movie,
      song: record.songs[0] ?? "",
    });
    setQuery("");
    setError(null);
  };

  const chooseMode = (next: "library" | "manual") => {
    if (next === mode) return;
    setMode(next);
    setQuery("");
    setError(null);
    // Manual entry starts from a blank slate; the library path is opt-in.
    setPicked(null);
    if (next === "manual") setAnswers(EMPTY_ANSWERS);
  };

  const setField = (key: keyof Answers, value: string) => {
    setAnswers((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!ready) return;
    setBusy(true);
    setError(null);
    try {
      // All four values always travel together, so an edit made after picking
      // a movie is what the room actually gets asked.
      await submitQuestion({
        token,
        movieId: mode === "library" ? picked?.id : undefined,
        hero: answers.hero.trim(),
        heroine: answers.heroine.trim(),
        movie: answers.movie.trim(),
        song: answers.song.trim(),
      });
    } catch (err) {
      setError(friendlyError(err));
      setBusy(false);
    }
  };

  return (
    <div className="relative mx-auto flex w-full max-w-5xl flex-col gap-5 px-4 py-6 sm:py-9">
      {/* ---------- low-opacity production-room decor ---------- */}
      <FilmReel
        spin
        className="pointer-events-none absolute -top-6 -right-10 hidden h-32 w-32 text-[#747c5b]/12 lg:block"
      />
      <ClapperboardArt className="pointer-events-none absolute bottom-4 -left-10 hidden h-24 w-28 text-[#c0bba1]/10 xl:block" />

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="text-center"
      >
        <p className="flex flex-wrap items-center justify-center gap-2 text-[11px] font-semibold tracking-[0.4em] text-primary/85 uppercase">
          <span className="rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 tracking-[0.18em]">
            {room.isShowdown
              ? "⚡ Final showdown"
              : `Round ${room.round} / ${room.roundsTotal}`}
          </span>
          🎬 You&apos;re{" "}
          {room.isShowdown ? "setting the decider" : "the question creator"}
        </p>
        <h1 className="font-display mt-3 text-3xl tracking-[0.06em] text-white sm:text-5xl">
          🎬 CREATE <span className="gold-text">KOLLYWOOD</span> QUESTION
        </h1>
        <p className="mx-auto mt-2 max-w-lg text-sm leading-relaxed text-white/60">
          {room.isShowdown
            ? `One final question for the crown. ${guessers} ${
                guessers === 1 ? "player is" : "players are"
              } level at the top and will race this one.`
            : `Write the hero, the heroine, the movie and the song. ${guessers} ${
                guessers === 1 ? "player" : "players"
              } get this exact question with their own nine chances — every guess is checked automatically against your answers.`}
        </p>
      </motion.div>

      <div className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
        {/* ---------- the production desk ---------- */}
        <motion.form
          onSubmit={handleSubmit}
          initial={{ opacity: 0, x: -18 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
          className="glass grain relative overflow-hidden rounded-3xl p-5 sm:p-6"
        >
          {/* film edge along the top of the desk, low-opacity */}
          <div className="film-strip animate-strip pointer-events-none absolute inset-x-0 top-0 h-5 opacity-20" />

          {/* ---------- two ways to write it ---------- */}
          <p className="flex items-center gap-1.5 text-[11px] font-semibold tracking-[0.2em] text-white/55 uppercase">
            <Sparkles className="h-3.5 w-3.5 text-primary/80" />
            How do you want to set the answers?
          </p>

          <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
            <ModeButton
              active={mode === "library"}
              onClick={() => chooseMode("library")}
              icon="🎞️"
              label="SELECT MOVIE FROM DATABASE"
              hint="Prefill all four, then edit"
            />
            <ModeButton
              active={mode === "manual"}
              onClick={() => chooseMode("manual")}
              icon="✍️"
              label="ENTER ANSWERS MANUALLY"
              hint="Any Tamil film, in or out of the book"
            />
          </div>

          {/* ---------- optional library helper ---------- */}
          <AnimatePresence initial={false}>
            {mode === "library" && (
              <motion.div
                key="library"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="relative mt-4">
                  <div className="relative">
                    <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-white/35" />
                    <Input
                      id="movie-search"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Search 100+ Tamil movies, actors…"
                      autoComplete="off"
                      className="h-12 rounded-xl border-white/15 bg-white/5 pl-9 text-base placeholder:text-white/25 focus-visible:border-primary/60 focus-visible:ring-primary/30"
                    />
                  </div>

                  <AnimatePresence>
                    {results.length > 0 && (
                      <motion.ul
                        initial={{ opacity: 0, y: -6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                        className="absolute inset-x-0 top-full z-20 mt-2 max-h-72 overflow-y-auto rounded-2xl border border-white/12 bg-[#1b1c17]/95 p-1.5 shadow-[0_18px_50px_rgba(0,0,0,0.55)] backdrop-blur-xl"
                      >
                        {results.map((entry) => (
                          <li key={entry.id}>
                            <button
                              type="button"
                              onClick={() => chooseMovie(entry)}
                              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-primary/12"
                            >
                              <span className="font-display text-lg leading-none text-primary/80">
                                {entry.year}
                              </span>
                              <span className="min-w-0 flex-1">
                                <span className="block truncate text-sm font-semibold text-white">
                                  {entry.movie}
                                </span>
                                <span className="block truncate text-[11px] text-white/50">
                                  {entry.hero} · {entry.heroine}
                                </span>
                              </span>
                            </button>
                          </li>
                        ))}
                      </motion.ul>
                    )}
                  </AnimatePresence>
                </div>

                {picked && (
                  <div className="mt-3 rounded-2xl border border-primary/25 bg-primary/[0.06] px-3.5 py-3">
                    <p className="text-[11px] tracking-[0.18em] text-primary/85 uppercase">
                      Loaded {picked.movie} · {picked.year} — edit anything below
                    </p>
                    <p className="mt-2 text-[10px] tracking-[0.2em] text-white/45 uppercase">
                      Its songs
                    </p>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {picked.songs.map((option) => (
                        <button
                          key={option}
                          type="button"
                          onClick={() => setField("song", option)}
                          className={cn(
                            "rounded-full border px-3 py-1 text-xs transition-all",
                            answers.song.trim() === option
                              ? "border-primary/70 bg-primary/20 text-primary"
                              : "border-white/15 text-white/65 hover:border-primary/45 hover:text-white",
                          )}
                        >
                          {option}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <p className="mt-2 text-[11px] text-white/40">
                  Nothing in the book? Switch to manual entry — or just edit the
                  fields after picking.
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="gold-rule my-5" />

          {/* ---------- the four answers ---------- */}
          <p className="flex items-center gap-1.5 text-[11px] font-semibold tracking-[0.2em] text-white/55 uppercase">
            <PencilLine className="h-3.5 w-3.5 text-primary/80" />
            The four answers — all required
          </p>

          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            {FIELDS.map((field) => (
              <label key={field.key} className="grid gap-1.5">
                <span className="flex items-center gap-1.5 text-[11px] font-semibold tracking-[0.2em] text-white/60 uppercase">
                  <field.Icon className="h-3.5 w-3.5 text-primary/80" />
                  {field.label}
                  <span className="text-[#c08a6e]">*</span>
                </span>
                <Input
                  id={`answer-${field.key}`}
                  value={answers[field.key]}
                  onChange={(e) => setField(field.key, e.target.value)}
                  placeholder={field.placeholder}
                  maxLength={MAX[field.key]}
                  autoComplete="off"
                  className="h-12 rounded-xl border-white/15 bg-white/5 text-base placeholder:text-white/25 focus-visible:border-primary/60 focus-visible:ring-primary/30"
                />
              </label>
            ))}
          </div>

          <p className="mt-3 text-[11px] text-white/40">
            These exact spellings are the answers. Ordinary spacing, case and
            punctuation variants are still accepted — nothing else.
          </p>

          {error && <p className="mt-4 text-sm text-[#c08a6e]">{error}</p>}

          <button
            type="submit"
            disabled={busy || !ready}
            className={cn(
              "kolly-cta mt-5 flex h-14 w-full items-center justify-center gap-2.5 rounded-2xl text-base font-semibold tracking-wide transition-all",
              ready
                ? "bg-primary text-primary-foreground shadow-[0_10px_34px_rgba(116,124,91,0.3)] hover:-translate-y-0.5 hover:shadow-[0_14px_44px_rgba(116,124,91,0.45)] active:translate-y-0"
                : "cursor-not-allowed border border-white/10 bg-white/[0.04] text-white/35",
            )}
          >
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <span className="text-lg">🎬</span> CREATE QUESTION
              </>
            )}
          </button>

          <p className="mt-3 text-center text-xs text-white/40">
            Validation is automatic from here — you sit this one out and watch
            the boards fill in.
          </p>
        </motion.form>

        {/* ---------- live preview ---------- */}
        <motion.div
          initial={{ opacity: 0, x: 18 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.16, ease: [0.16, 1, 0.3, 1] }}
          className="glass-deep grain relative flex flex-col items-center overflow-hidden rounded-3xl px-4 py-7"
        >
          <Projector className="pointer-events-none absolute -bottom-4 left-1/2 h-20 w-32 -translate-x-1/2 text-[#747c5b]/15" />
          <p className="text-[10px] font-semibold tracking-[0.32em] text-white/45 uppercase">
            Everyone will see
          </p>
          <div className="mt-5 w-full">
            <ClueCross
              initials={{
                hero: firstLetter(answers.hero),
                heroine: firstLetter(answers.heroine),
                movie: firstLetter(answers.movie),
                song: firstLetter(answers.song),
              }}
            />
          </div>
          <div className="gold-rule mt-3 w-full" />
          <p className="mt-3 px-2 text-center text-xs leading-relaxed text-white/50">
            Four initials, nine chances each. Everyone has to call the hero, the
            heroine, the movie and the song — in any order they like.
          </p>
          <p className="mt-3 px-2 text-center text-[11px] leading-relaxed text-[#c08a6e]/85">
            A wrong guess shows the room WHAT was guessed — never your answer.
            So write answers worth racing for.
          </p>
          {guessers > 0 ? (
            <p className="mt-2 text-center text-[11px] tracking-[0.18em] text-primary/70 uppercase">
              {guessers} {guessers === 1 ? "player" : "players"} ready to guess
            </p>
          ) : (
            <p className="mt-2 text-center text-[11px] tracking-[0.18em] text-white/40 uppercase">
              Waiting for a friend to join
            </p>
          )}
        </motion.div>
      </div>
    </div>
  );
}

/** One half of the "library or manual" switch. */
function ModeButton({
  active,
  onClick,
  icon,
  label,
  hint,
}: {
  active: boolean;
  onClick: () => void;
  icon: string;
  label: string;
  hint: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "flex flex-col items-start gap-0.5 rounded-2xl border px-3.5 py-2.5 text-left transition-all",
        active
          ? "-translate-y-0.5 border-primary/70 bg-primary/12 shadow-[0_8px_24px_rgba(116,124,91,0.18)]"
          : "border-white/12 bg-white/[0.03] hover:-translate-y-0.5 hover:border-primary/40",
      )}
    >
      <span
        className={cn(
          "flex items-center gap-1.5 text-[11px] font-semibold tracking-[0.14em] uppercase",
          active ? "text-primary" : "text-white/65",
        )}
      >
        <span aria-hidden>{icon}</span>
        {label}
      </span>
      <span className="text-[10px] text-white/40">{hint}</span>
    </button>
  );
}
