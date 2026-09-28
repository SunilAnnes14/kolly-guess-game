import { ClueCross } from "@/components/kollywood/ClueCross";
import { Input } from "@/components/ui/input";
import { api } from "@/convex/_generated/api";
import { searchMovies, type MovieRecord } from "@/lib/movieDataset";
import { friendlyError } from "@/lib/utils";
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

const TYPED_FIELDS = [
  { key: "hero", label: "Hero", placeholder: "Vijay", Icon: User },
  { key: "heroine", label: "Heroine", placeholder: "Trisha", Icon: Heart },
  {
    key: "movie",
    label: "Movie",
    placeholder: "Ghilli",
    Icon: Clapperboard,
  },
  {
    key: "song",
    label: "Song",
    placeholder: "Appadi Podu",
    Icon: Music2,
  },
] as const;

/**
 * This round's question creator.
 *
 * The only real job is picking a movie and one of its songs — the server
 * derives the hero, the heroine, the title and the accepted aliases, then
 * validates every guess on its own. There is nothing to approve, reject or
 * score afterwards.
 */
export function QuestionCreator({
  room,
  token,
}: {
  room: RoomState;
  token: string;
}) {
  const submitQuestion = useMutation(api.game.submitQuestion);
  const [query, setQuery] = useState("");
  const [picked, setPicked] = useState<MovieRecord | null>(null);
  const [song, setSong] = useState("");
  const [manual, setManual] = useState(false);
  const [typed, setTyped] = useState({
    hero: "",
    heroine: "",
    movie: "",
    song: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const results = useMemo(
    () => (query.trim() ? searchMovies(query, 6) : []),
    [query],
  );

  const guessers = room.isShowdown
    ? room.tiebreakIds.filter((id) => id !== room.me?.id).length
    : Math.max(0, room.players.length - 1);

  const ready = manual
    ? Boolean(
        typed.hero.trim() &&
          typed.heroine.trim() &&
          typed.movie.trim() &&
          typed.song.trim(),
      )
    : Boolean(picked && song);

  const chooseMovie = (record: MovieRecord) => {
    setPicked(record);
    setSong(record.songs[0] ?? "");
    setQuery("");
    setManual(false);
    setError(null);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!ready) return;
    setBusy(true);
    setError(null);
    try {
      await submitQuestion(
        manual
          ? { token, ...typed }
          : { token, movieId: picked?.id, song },
      );
    } catch (err) {
      setError(friendlyError(err));
      setBusy(false);
    }
  };

  const preview = manual
    ? typed
    : {
        hero: picked?.hero ?? "",
        heroine: picked?.heroine ?? "",
        movie: picked?.movie ?? "",
        song,
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
          Pick the <span className="gold-text">four clues</span>
        </h1>
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-white/60">
          {room.isShowdown
            ? `One final question for the crown. ${guessers} ${
                guessers === 1 ? "player is" : "players are"
              } level at the top and will race this one.`
            : `Choose a movie and one of its songs. ${guessers} ${
                guessers === 1 ? "player" : "players"
              } get this exact question with their own nine chances — the game validates every answer on its own from here.`}
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

            {picked && !manual && (
              <div className="mt-3 rounded-2xl border border-primary/25 bg-primary/[0.06] px-3.5 py-3">
                <p className="text-[11px] tracking-[0.18em] text-primary/85 uppercase">
                  {picked.movie} · {picked.year}
                </p>
                <p className="mt-1 text-[11px] text-white/45">
                  {picked.hero} · {picked.heroine}
                </p>
                <p className="mt-2 text-[10px] tracking-[0.2em] text-white/45 uppercase">
                  Which song?
                </p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {picked.songs.map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setSong(option)}
                      className={
                        "rounded-full border px-3 py-1 text-xs transition-all " +
                        (song === option
                          ? "border-primary/70 bg-primary/20 text-primary"
                          : "border-white/15 text-white/65 hover:border-primary/45 hover:text-white")
                      }
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ---------- hand-typed fallback ---------- */}
          {manual ? (
            <>
              <div className="gold-rule my-5" />
              <div className="grid gap-4 sm:grid-cols-2">
                {TYPED_FIELDS.map((field) => (
                  <label key={field.key} className="grid gap-1.5">
                    <span className="flex items-center gap-1.5 text-[11px] font-semibold tracking-[0.2em] text-white/60 uppercase">
                      <field.Icon className="h-3.5 w-3.5 text-primary/80" />
                      {field.label}
                    </span>
                    <Input
                      value={typed[field.key]}
                      onChange={(e) =>
                        setTyped((prev) => ({
                          ...prev,
                          [field.key]: e.target.value,
                        }))
                      }
                      placeholder={field.placeholder}
                      maxLength={60}
                      className="h-12 rounded-xl border-white/15 bg-white/5 text-base placeholder:text-white/25 focus-visible:border-primary/60 focus-visible:ring-primary/30"
                    />
                  </label>
                ))}
              </div>
              <p className="mt-3 text-center text-[11px] text-white/40">
                Not in the library? Only your exact spelling will be accepted,
                along with ordinary spacing and punctuation variants.
              </p>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setManual(true)}
              className="mt-5 flex items-center gap-1.5 text-[11px] font-semibold tracking-[0.18em] text-white/45 uppercase transition-colors hover:text-primary"
            >
              <PencilLine className="h-3.5 w-3.5" />
              My movie isn&apos;t in the library
            </button>
          )}

          {error && <p className="mt-4 text-sm text-[#c08a6e]">{error}</p>}

          <button
            type="submit"
            disabled={busy || !ready}
            className={
              "kolly-cta mt-5 flex h-14 w-full items-center justify-center gap-2.5 rounded-2xl text-base font-semibold tracking-wide transition-all " +
              (ready
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
            Validation is automatic from here — you sit this one out and watch
            the boards fill in.
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
                hero: firstLetter(preview.hero),
                heroine: firstLetter(preview.heroine),
                movie: firstLetter(preview.movie),
                song: firstLetter(preview.song),
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
