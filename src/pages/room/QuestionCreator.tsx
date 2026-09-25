import { ClueCross } from "@/components/kollywood/ClueCross";
import { Input } from "@/components/ui/input";
import { api } from "@/convex/_generated/api";
import { friendlyError } from "@/lib/utils";
import type { RoomState } from "@/pages/room/types";
import { motion } from "framer-motion";
import { useMutation } from "convex/react";
import {
  ArrowLeft,
  Clapperboard,
  Heart,
  Loader2,
  Music2,
  User,
} from "lucide-react";
import { useState, type FormEvent } from "react";

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
    hint: "The answer to guess",
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
 * The question creator's desk: four clues in, a live "+" preview out, and
 * one big CREATE QUESTION lever.
 */
export function QuestionCreator({
  room,
  token,
  onBack,
}: {
  room: RoomState;
  token: string;
  onBack: () => void;
}) {
  const submitQuestion = useMutation(api.game.submitQuestion);
  const [values, setValues] = useState({
    hero: "",
    heroine: "",
    movie: "",
    song: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const filled =
    values.hero.trim() &&
    values.heroine.trim() &&
    values.movie.trim() &&
    values.song.trim();

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!filled) {
      setError("Fill in all four clues to create the question.");
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
        <p className="text-[11px] font-semibold tracking-[0.4em] text-primary/85 uppercase">
          🎬 You&apos;re the question creator
        </p>
        <h1 className="font-display mt-2 text-4xl tracking-[0.06em] text-white sm:text-5xl">
          Set the <span className="gold-text">scene</span>
        </h1>
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-white/60">
          Your friends only see the first letters — the full answer stays
          hidden until someone wins.
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
                  onChange={(e) =>
                    setValues((prev) => ({ ...prev, [field.key]: e.target.value }))
                  }
                  placeholder={field.placeholder}
                  maxLength={60}
                  className="h-12 rounded-xl border-white/15 bg-white/5 text-base placeholder:text-white/25 focus-visible:border-primary/60 focus-visible:ring-primary/30"
                />
              </label>
            ))}
          </div>

          {error && <p className="mt-4 text-sm text-[#ff7a55]">{error}</p>}

          <button
            type="submit"
            disabled={busy || !filled}
            className={
              "kolly-cta mt-5 flex h-14 w-full items-center justify-center gap-2.5 rounded-2xl text-base font-semibold tracking-wide transition-all " +
              (filled
                ? "bg-primary text-primary-foreground shadow-[0_10px_34px_rgba(245,197,66,0.3)] hover:-translate-y-0.5 hover:shadow-[0_14px_44px_rgba(245,197,66,0.45)] active:translate-y-0"
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

          <button
            type="button"
            onClick={onBack}
            className="mt-3 flex w-full items-center justify-center gap-1.5 text-xs tracking-wider text-white/45 uppercase transition-colors hover:text-white/75"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> back to the lobby
          </button>
        </motion.form>

        {/* ---------- live preview ---------- */}
        <motion.div
          initial={{ opacity: 0, x: 18 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.16, ease: [0.16, 1, 0.3, 1] }}
          className="glass-deep relative flex flex-col items-center rounded-3xl px-4 py-7"
        >
          <p className="text-[10px] font-semibold tracking-[0.32em] text-white/45 uppercase">
            Your friends will see
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
            Four letters, nine lives, one movie.{" "}
            {room.players.length > 1
              ? `${room.players.length - 1} friend${room.players.length > 2 ? "s" : ""} will try to crack it.`
              : "Waiting for a friend to join."}
          </p>
        </motion.div>
      </div>
    </div>
  );
}
