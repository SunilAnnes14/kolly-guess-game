import { ClueCross } from "@/components/kollywood/ClueCross";
import { Input } from "@/components/ui/input";
import { api } from "@/convex/_generated/api";
import { pickSong, searchMovies, type MovieEntry } from "@/lib/movieDataset";
import { friendlyError } from "@/lib/utils";
import type { RoomState } from "@/pages/room/types";
import { AnimatePresence, motion } from "framer-motion";
import { useMutation } from "convex/react";
import {
  Clapperboard,
  Heart,
  Loader2,
  Music2,
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

const FIELDS = [
  {
    key: "hero",
    label: "Hero",
    hint: "Actor's name",
    placeholder: "Vijay",
    Icon: User,
  },
  {
    key: "heroine",
    label: "Heroine",
    hint: "Actress's name",
    placeholder: "Trisha",
    Icon: Heart,
  },
  {
    key: "movie",
    label: "Movie",
    hint: "Part of the answer",
    placeholder: "Ghilli",
    Icon: Clapperboard,
  },
  {
    key: "song",
    label: "Song",
    hint: "A song from the movie",
    placeholder: "Appadi Podu",
    Icon: Music2,
  },
] as const;

/**
 * This round's question creator: search the Tamil movie library or type your
 * own four parts, watch the "+" preview, then pull the CREATE QUESTION lever.
 *
 * The whole room plays this exact question at the same time, each with their
 * own nine chances — then the clapperboard passes to the next player.
 */
export function QuestionCreator({
  room,
  token,
}: {
  room: RoomState;
  token: string;
}) {
  const submitQuestion = useMutation(api.game.submitQuestion);
  const [values, setValues] = useState({
    hero: "",
    heroine: "",
    movie: "",
    song: "",
  });
  const [query, setQuery] = useState("");
  const [picked, setPicked] = useState<MovieEntry | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const results = useMemo(
    () => (query.trim() ? searchMovies(query, 6) : []),
    [query],
  );

  const guessers = room.isShowdown
    ? room.tiebreakIds.filter((id) => id !== room.me?.id).length
    : Math.max(0, room.players.length - 1);
  const filled =
    values.hero.trim() &&
    values.heroine.trim() &&
    values.movie.trim() &&
    values.song.trim();

  const chooseMovie = (entry: MovieEntry) => {
    setPicked(entry);
    setValues({
      hero: entry.hero,
      heroine: entry.heroine,
      movie: entry.movie,
      song: pickSong(entry),
    });
    setQuery("");
    setError(null);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!filled) {
      setError("Fill in all four parts to create the question.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await submitQuestion({ token, ...values });
    } catch (err) {
      setError(friendlyError(err));
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-5 px-4 py-6 sm:py-9">
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
        <h1 className="font-display mt-3 text-4xl tracking-[0.06em] text-white sm:text-5xl">
          Set the <span className="gold-text">four clues</span>
        </h1>
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-white/60">
          {room.isShowdown
            ? `One final question for the crown. ${guessers} ${
                guessers === 1 ? "player is" : "players are"
              } level at the top and will race this one — you judge every guess.`
            : `Hero, heroine, movie and song. ${guessers} ${
                guessers === 1 ? "player" : "players"
              } get this exact question with their own nine chances — and you judge every guess.`}
        </p>
      </motion.div>

      <div className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
        {/* ---------- form ---------- */}
        <motion.form
          onSubmit={handleSubmit}
          initial={{ opacity: 0, x: -18 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
          className="glass rounded-3xl p-5 sm:p-6"
        >
          {/* ---------- movie library search ---------- */}
          <div className="relative">
            <label
              htmlFor="movie-search"
              className="flex items-center gap-1.5 text-[11px] font-semibold tracking-[0.2em] text-white/60 uppercase"
            >
              <Sparkles className="h-3.5 w-3.5 text-primary/80" />
              Pick from the movie library
            </label>
            <div className="relative mt-1.5">
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
                  className="absolute inset-x-0 top-full z-20 mt-2 overflow-hidden rounded-2xl border border-white/12 bg-[#1b1c17]/95 p-1.5 shadow-[0_18px_50px_rgba(0,0,0,0.55)] backdrop-blur-xl"
                >
                  {results.map((entry) => (
                    <li key={`${entry.movie}-${entry.year}`}>
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

            {picked && (
              <div className="mt-3 rounded-2xl border border-primary/25 bg-primary/[0.06] px-3.5 py-3">
                <p className="text-[11px] tracking-[0.18em] text-primary/85 uppercase">
                  {picked.movie} · {picked.year}
                </p>
                {picked.songs.length > 1 && (
                  <>
                    <p className="mt-2 text-[10px] tracking-[0.2em] text-white/45 uppercase">
                      Which song?
                    </p>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {picked.songs.map((song) => (
                        <button
                          key={song}
                          type="button"
                          onClick={() =>
                            setValues((prev) => ({ ...prev, song }))
                          }
                          className={
                            "rounded-full border px-3 py-1 text-xs transition-all " +
                            (values.song === song
                              ? "border-primary/70 bg-primary/20 text-primary"
                              : "border-white/15 text-white/65 hover:border-primary/45 hover:text-white")
                          }
                        >
                          {song}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          <div className="gold-rule my-5" />

          <div className="grid gap-4 sm:grid-cols-2">
            {FIELDS.map((field) => (
              <label key={field.key} className="grid gap-1.5">
                <span className="flex items-center gap-1.5 text-[11px] font-semibold tracking-[0.2em] text-white/60 uppercase">
                  <field.Icon className="h-3.5 w-3.5 text-primary/80" />
                  {field.label}
                  <span className="font-normal tracking-normal text-white/35 lowercase">
                    — {field.hint}
                  </span>
                </span>
                <Input
                  value={values[field.key]}
                  onChange={(e) => {
                    const next = e.target.value;
                    setValues((prev) => ({ ...prev, [field.key]: next }));
                  }}
                  placeholder={field.placeholder}
                  maxLength={60}
                  className="h-12 rounded-xl border-white/15 bg-white/5 text-base placeholder:text-white/25 focus-visible:border-primary/60 focus-visible:ring-primary/30"
                />
              </label>
            ))}
          </div>

          {error && <p className="mt-4 text-sm text-[#c08a6e]">{error}</p>}

          <button
            type="submit"
            disabled={busy || !filled}
            className={
              "kolly-cta mt-5 flex h-14 w-full items-center justify-center gap-2.5 rounded-2xl text-base font-semibold tracking-wide transition-all " +
              (filled
                ? "bg-primary text-primary-foreground shadow-[0_10px_34px_rgba(116,124,91,0.3)] hover:-translate-y-0.5 hover:shadow-[0_14px_44px_rgba(116,124,91,0.45)] active:translate-y-0"
                : "cursor-not-allowed border border-white/10 bg-white/[0.04] text-white/35")
            }
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
            You sit this one out — the others are guessing.
          </p>
        </motion.form>

        {/* ---------- live preview ---------- */}
        <motion.div
          initial={{ opacity: 0, x: 18 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.16, ease: [0.16, 1, 0.3, 1] }}
          className="glass-deep relative flex flex-col items-center rounded-3xl px-4 py-7"
        >
          <p className="text-[10px] font-semibold tracking-[0.32em] text-white/45 uppercase">
            Everyone will see
          </p>
          <div className="mt-5 w-full">
            <ClueCross
              initials={{
                hero: firstLetter(values.hero),
                heroine: firstLetter(values.heroine),
                movie: firstLetter(values.movie),
                song: firstLetter(values.song),
              }}
            />
          </div>
          <div className="gold-rule mt-3 w-full" />
          <p className="mt-3 px-2 text-center text-xs leading-relaxed text-white/50">
            Four initials, nine chances each. Everyone has to call the hero, the
            heroine, the movie and the song — in any order they like.
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
