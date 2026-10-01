import {
  FilmReel,
  ScreenBackdrop,
  TicketCard,
} from "@/components/cinema/CinemaDecor";
import { ClueCross } from "@/components/kollywood/ClueCross";
import { LivesRow } from "@/components/kollywood/LivesRow";
import { PlusBoard } from "@/components/kollywood/PlusBoard";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/convex/_generated/api";
import { saveIdentity } from "@/lib/roomIdentity";
import { friendlyError } from "@/lib/utils";
import { motion } from "framer-motion";
import { useMutation } from "convex/react";
import { ArrowRight, Clapperboard, Loader2, Ticket } from "lucide-react";
import { useState, type FormEvent } from "react";
import { useInView } from "react-intersection-observer";
import { useNavigate, useSearchParams } from "react-router";

const TITLE = "KOLLYWOOD".split("");
const EASE = [0.16, 1, 0.3, 1] as const;

const STEPS = [
  {
    n: "01",
    title: "Open a private room",
    body: "Create a room, share the code or link, and your friends walk right into your screening. Everyone writes exactly one question — you go first.",
  },
  {
    n: "02",
    title: "Write the four answers",
    body: "Hero, heroine, movie and song — type them yourself for any Tamil film, or pull them from the built-in library and edit what you like. Everyone else only ever gets the first letter of each part.",
  },
  {
    n: "03",
    title: "Guess, validate, score",
    body: "Everyone guesses at the same time with their own nine chances. The game checks every answer the instant it lands — no waiting, no approving.",
  },
];

/** The GUESS → VALIDATE → REVEAL loop that drives a round. */
const LOOP = [
  {
    icon: "🎯",
    title: "Pick a part",
    body: "Four buttons — hero, heroine, movie or song. Attack them in whatever order you like.",
  },
  {
    icon: "⚡",
    title: "Checked instantly",
    body: "No judge, no approval queue. Your answer is compared against the four answers the creator wrote, the moment you press submit.",
  },
  {
    icon: "✓",
    title: "Keep it, or give it away",
    body: "Land a part and it is yours alone — nobody else is told. Miss one and the answer goes up on every screen, locked for good. That miss also burns one of your KOLLYWOOD letters.",
  },
  {
    icon: "🏆",
    title: "Solve all four",
    body: "Cover hero, heroine, movie and song and that round is yours. The quicker the solve, the bigger the share of the pot.",
  },
  {
    icon: "🔁",
    title: "Pass the clapperboard",
    body: "When everyone finishes, the room rolls straight on to the next player. Everyone creates one, everyone guesses the rest — highest total takes the crown.",
  },
];

const PLACINGS = [
  { place: "01", label: "First to solve", points: "100" },
  { place: "02", label: "Second to solve", points: "080" },
  { place: "03", label: "Third to solve", points: "060" },
  { place: "—", label: "Ran out of letters", points: "000" },
];

function toFriendlyError(error: unknown) {
  return friendlyError(error);
}

export default function Landing() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const createRoom = useMutation(api.game.createRoom);
  const joinRoom = useMutation(api.game.joinRoom);

  const [dialog, setDialog] = useState<"create" | "join" | null>(
    searchParams.get("room") ? "join" : null,
  );
  const [name, setName] = useState("");
  const [code, setCode] = useState(
    (searchParams.get("room") ?? "").toUpperCase().slice(0, 6),
  );
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [demoRef, demoInView] = useInView({
    triggerOnce: true,
    rootMargin: "-40px",
  });

  const closeDialog = (open: boolean) => {
    if (!open) {
      setDialog(null);
      setError(null);
    }
  };

  const handleCreate = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await createRoom({ name });
      saveIdentity(res.code, { token: res.token, name: name.trim() });
      navigate(`/room/${res.code}`);
    } catch (err) {
      setError(toFriendlyError(err));
      setBusy(false);
    }
  };

  const handleJoin = async (event: FormEvent) => {
    event.preventDefault();
    if (code.trim().length < 6) {
      setError("Room codes are 6 characters, like ABX729.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await joinRoom({ code, name });
      saveIdentity(res.code, { token: res.token, name: res.name });
      navigate(`/room/${res.code}`);
    } catch (err) {
      setError(toFriendlyError(err));
      setBusy(false);
    }
  };

  return (
    <div className="grain relative min-h-screen overflow-x-hidden">
      <ScreenBackdrop />

      {/* ---------- lights down: the projector warms up ---------- */}
      <motion.div
        initial={{ opacity: 1 }}
        animate={{ opacity: 0 }}
        transition={{ delay: 0.85, duration: 1.15, ease: "easeInOut" }}
        className="pointer-events-none fixed inset-0 z-50 bg-[#11120f]"
      />

      {/* ---------- header ---------- */}
      <header className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-5">
        <div className="flex items-center gap-2.5">
          <Clapperboard className="h-5 w-5 text-[#898675]" />
          <span className="font-display paper-text text-xl tracking-[0.26em]">
            KOLLYWOOD
          </span>
        </div>
        <p className="font-type hidden text-[11px] tracking-[0.28em] text-[#898675] uppercase sm:block">
          Est. — a private screening
        </p>
      </header>

      <main className="relative z-10">
        {/* ---------- hero ---------- */}
        <section className="mx-auto flex max-w-5xl flex-col items-center px-5 pt-14 pb-24 text-center sm:pt-24">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.9, ease: EASE }}
            className="relative"
          >
            <FilmReel
              spin
              className="h-12 w-12 text-[#747c5b]/80 sm:h-14 sm:w-14"
            />
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.9, duration: 0.8 }}
            className="font-type mt-6 text-[11px] tracking-[0.5em] text-[#898675] uppercase sm:text-xs"
          >
            The Tamil movie game
          </motion.p>

          <h1
            aria-label="KOLLYWOOD"
            className="text-lift mt-4 flex justify-center text-[clamp(3rem,12vw,8rem)] leading-[0.94]"
          >
            {TITLE.map((letter, index) => (
              <motion.span
                key={index}
                aria-hidden
                initial={{ opacity: 0, y: 44, filter: "blur(14px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                transition={{
                  delay: 1.05 + index * 0.06,
                  duration: 0.8,
                  ease: EASE,
                }}
                className="font-display paper-text inline-block tracking-[0.04em]"
              >
                {letter}
              </motion.span>
            ))}
          </h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.7, duration: 0.8, ease: EASE }}
            className="mt-5 max-w-xl text-lg leading-relaxed text-[#c0bba1]/80 sm:text-xl"
          >
            Guess the hero. The heroine. The movie. The song.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.95, duration: 0.8, ease: EASE }}
            className="mt-11 flex w-full flex-col items-center justify-center gap-4 sm:w-auto sm:flex-row"
          >
            <Button
              type="button"
              onClick={() => setDialog("create")}
              className="kolly-cta lift font-display h-14 w-full rounded-md border border-[#747c5b]/45 bg-[#596344] px-9 text-lg tracking-[0.2em] text-[#e7e3d2] hover:bg-[#616c49] sm:w-auto"
            >
              <span className="text-base">🎬</span> CREATE ROOM
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDialog("join")}
              className="lift font-display h-14 w-full rounded-md border border-[#c0bba1]/22 bg-transparent px-9 text-lg tracking-[0.2em] text-[#c0bba1] hover:border-[#747c5b]/60 hover:bg-[#30372a]/50 sm:w-auto"
            >
              <span className="text-base">🎟️</span> JOIN ROOM
            </Button>
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 2.2, duration: 0.9 }}
            className="font-type mt-8 text-[10px] tracking-[0.34em] text-[#898675] uppercase"
          >
            Private rooms · Real friends · One film
          </motion.p>
        </section>

        {/* ---------- how it plays ---------- */}
        <section className="mx-auto w-full max-w-6xl px-5 pb-20 sm:pb-28">
          <div className="mb-11 text-center">
            <p className="font-type text-[11px] tracking-[0.42em] text-[#898675] uppercase">
              How it plays
            </p>
            <h2 className="font-display mt-3 text-4xl tracking-[0.05em] text-[#c0bba1] sm:text-5xl">
              Four clues. One film.{" "}
              <span className="paper-text">Nine letters.</span>
            </h2>
          </div>

          <div className="grid items-center gap-9 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="grid gap-4">
              {STEPS.map((step, index) => (
                <motion.div
                  key={step.n}
                  initial={{ opacity: 0, x: -24 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, margin: "-60px" }}
                  transition={{ delay: index * 0.1, duration: 0.6, ease: EASE }}
                  className="glass lift flex items-start gap-5 rounded-lg p-5 hover:border-[#747c5b]/45"
                >
                  <span className="font-display text-3xl leading-none text-[#747c5b]">
                    {step.n}
                  </span>
                  <div>
                    <h3 className="font-display text-xl tracking-[0.06em] text-[#c0bba1]">
                      {step.title}
                    </h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-[#898675]">
                      {step.body}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>

            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.7, ease: EASE }}
              className="glass-deep grain relative rounded-lg px-5 py-9 sm:px-8"
            >
              <p className="font-type text-center text-[10px] tracking-[0.35em] text-[#898675] uppercase">
                Current question
              </p>
              <div
                ref={demoRef}
                className="mt-7 flex min-h-[300px] items-center justify-center sm:min-h-[340px]"
              >
                {demoInView && (
                  <ClueCross
                    initials={{ hero: "V", heroine: "T", movie: "G", song: "A" }}
                  />
                )}
              </div>
              <div className="olive-rule mt-6" />
              <p className="font-type mt-4 text-center text-sm text-[#c0bba1]">
                Vijay · Trisha · Ghilli · Appadi Podu
              </p>
              <p className="mt-1 text-center text-xs text-[#898675]">
                Your friends only get the first letter of each part.
              </p>
            </motion.div>
          </div>
        </section>

        {/* ---------- progressive discovery ---------- */}
        <section className="mx-auto w-full max-w-6xl px-5 pb-20 sm:pb-28">
          <div className="mb-11 text-center">
            <p className="font-type text-[11px] tracking-[0.42em] text-[#898675] uppercase">
              Guess · validate · reveal
            </p>
            <h2 className="font-display mt-3 text-4xl tracking-[0.05em] text-[#c0bba1] sm:text-5xl">
              Four parts.{" "}
              <span className="paper-text">Discover them one by one.</span>
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-[#898675] sm:text-base">
              Nobody has to know the whole film. Pick the part you&apos;re sure
              about and guess just that — each answer you land lights up the
              &ldquo;+&rdquo; a little more.
            </p>
          </div>

          <div className="grid items-center gap-9 lg:grid-cols-[0.95fr_1.05fr]">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.7, ease: EASE }}
              className="glass-deep grain rounded-lg px-4 py-8 sm:px-8"
            >
              <p className="font-type text-center text-[10px] tracking-[0.35em] text-[#898675] uppercase">
                One found · one revealed
              </p>
              <div className="mt-6">
                <PlusBoard
                  initials={{ hero: "V", heroine: "T", movie: "G", song: "A" }}
                  revealed={{
                    hero: true,
                    heroine: false,
                    movie: false,
                    song: false,
                  }}
                  revealedToAll={{
                    hero: false,
                    heroine: true,
                    movie: false,
                    song: false,
                  }}
                  values={{
                    hero: "Vijay",
                    heroine: "Trisha",
                    movie: null,
                    song: null,
                  }}
                />
              </div>
              <div className="olive-rule mt-6" />
              <p className="mt-4 text-center text-sm leading-relaxed text-[#898675]">
                ✓ You found Vijay yourself. Trisha went public after somebody
                guessed her wrong — the movie and the song are still hiding
                behind their initials.
              </p>
            </motion.div>

            <div className="grid gap-3">
              {LOOP.map((step, index) => (
                <motion.div
                  key={step.title}
                  initial={{ opacity: 0, x: 24 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, margin: "-60px" }}
                  transition={{ delay: index * 0.09, duration: 0.6, ease: EASE }}
                  className="glass lift flex items-start gap-4 rounded-lg p-5 hover:border-[#747c5b]/45"
                >
                  <span
                    aria-hidden
                    className="font-display mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-full border border-[#747c5b]/40 text-base text-[#c0bba1]"
                  >
                    {step.icon}
                  </span>
                  <div>
                    <h3 className="font-display text-xl tracking-[0.06em] text-[#c0bba1]">
                      {step.title}
                    </h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-[#898675]">
                      {step.body}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ---------- one miss, everyone knows ---------- */}
        <section className="mx-auto w-full max-w-4xl px-5 pb-20 sm:pb-28">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.7, ease: EASE }}
            className="glass-deep grain rounded-lg px-5 py-9 sm:px-10"
          >
            <div className="text-center">
              <p className="font-type text-[11px] tracking-[0.42em] text-[#c08a6e] uppercase">
                One miss, everyone knows
              </p>
              <h2 className="font-display mt-3 text-3xl tracking-[0.05em] text-[#c0bba1] sm:text-4xl">
                A right guess is{" "}
                <span className="paper-text">yours alone.</span>
              </h2>
            </div>

            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              <div className="rounded-lg border border-[#747c5b]/35 bg-[#596344]/10 px-5 py-5">
                <p className="font-display text-xl tracking-[0.06em] text-[#c0bba1]">
                  ✓ You land it
                </p>
                <p className="mt-2 text-sm leading-relaxed text-[#898675]">
                  The part flips to the full answer on your board and locks.
                  Everyone else still sees its first letter — nobody is told
                  who found what.
                </p>
              </div>
              <div className="rounded-lg border border-[#8a5138]/45 bg-[#8a5138]/10 px-5 py-5">
                <p className="font-display text-xl tracking-[0.06em] text-[#c08a6e]">
                  ✕ Somebody misses
                </p>
                <p className="mt-2 text-sm leading-relaxed text-[#898675]">
                  That answer goes up on every screen the instant it lands,
                  marked <span className="text-[#c08a6e]">REVEALED</span>, and
                  the part closes for the whole room. The miss also burns one
                  of their nine letters.
                </p>
              </div>
            </div>

            <p className="mx-auto mt-6 max-w-xl text-center text-xs leading-relaxed text-[#898675]/70">
              Nobody is given credit for a leaked part — the round is still
              decided by who covers all four first.
            </p>
          </motion.div>
        </section>

        {/* ---------- nine letters ---------- */}
        <section className="mx-auto w-full max-w-4xl px-5 pb-20 sm:pb-28">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.7, ease: EASE }}
            className="glass-deep grain rounded-lg px-5 py-9 text-center sm:px-10"
          >
            <p className="font-type text-[11px] tracking-[0.42em] text-[#c08a6e] uppercase">
              Nine letters
            </p>
            <div className="mt-7">
              <LivesRow lives={6} />
            </div>
            <p className="mx-auto mt-7 max-w-lg text-sm leading-relaxed text-[#898675]">
              Every player gets their OWN nine letters for every question. The
              hero, the heroine, the movie and the song all draw from your own
              pool — burn all nine and the film gets away while your friends are
              still guessing.
            </p>
            <p className="mx-auto mt-4 max-w-lg text-xs leading-relaxed text-[#898675]/70">
              🎞 The game speaks too: a projector click and camera flash when a
              guess lands, a soft rewind when a letter burns. Volume, music and
              effects are all yours to dial — in the corner of the screen.
            </p>
          </motion.div>
        </section>

        {/* ---------- the scoreboard ---------- */}
        <section className="mx-auto w-full max-w-5xl px-5 pb-20 sm:pb-28">
          <div className="mb-10 text-center">
            <p className="font-type text-[11px] tracking-[0.42em] text-[#898675] uppercase">
              How you win
            </p>
            <h2 className="font-display mt-3 text-4xl tracking-[0.05em] text-[#c0bba1] sm:text-5xl">
              The faster the solve,{" "}
              <span className="paper-text">the bigger the share.</span>
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-[#898675]">
              Everyone races the same question at once. Finishing first is what
              pays — the round only ends once every guesser is done.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {PLACINGS.map((row, index) => (
              <motion.div
                key={row.place}
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ delay: index * 0.08, duration: 0.55, ease: EASE }}
              >
                <TicketCard className="lift h-full text-center">
                  <p className="font-type text-[10px] tracking-[0.34em] text-[#898675] uppercase">
                    {row.place}
                  </p>
                  <p className="font-display mt-3 text-5xl leading-none paper-text">
                    {row.points}
                  </p>
                  <div className="olive-rule my-4" />
                  <p className="text-xs leading-relaxed text-[#898675]">
                    {row.label}
                  </p>
                </TicketCard>
              </motion.div>
            ))}
          </div>
        </section>

        {/* ---------- final cta ---------- */}
        <section className="mx-auto w-full max-w-3xl px-5 pb-24 text-center">
          <div className="mx-auto mb-8 flex items-center justify-center gap-3 text-[#747c5b]">
            <span className="h-px w-10 bg-[#747c5b]/50" />
            <Ticket className="h-4 w-4" />
            <span className="h-px w-10 bg-[#747c5b]/50" />
          </div>
          <h2 className="font-display text-4xl tracking-[0.05em] text-[#c0bba1] sm:text-5xl">
            Ready for the <span className="paper-text">first show?</span>
          </h2>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button
              type="button"
              onClick={() => setDialog("create")}
              className="lift font-display h-14 w-full rounded-md border border-[#747c5b]/45 bg-[#596344] px-8 text-lg tracking-[0.2em] text-[#e7e3d2] hover:bg-[#616c49] sm:w-auto"
            >
              🎬 CREATE ROOM
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDialog("join")}
              className="lift font-display h-14 w-full rounded-md border border-[#c0bba1]/22 bg-transparent px-8 text-lg tracking-[0.2em] text-[#c0bba1] hover:border-[#747c5b]/60 hover:bg-[#30372a]/50 sm:w-auto"
            >
              <ArrowRight className="h-4 w-4" /> JOIN WITH A CODE
            </Button>
          </div>
        </section>
      </main>

      <footer className="relative z-10 border-t border-[#c0bba1]/12 py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-2 px-5 text-center sm:flex-row sm:justify-between sm:text-left">
          <span className="font-display paper-text text-lg tracking-[0.26em]">
            KOLLYWOOD
          </span>
          <p className="font-type text-[11px] tracking-[0.18em] text-[#898675]">
            Made for Tamil movie lovers · Private rooms, no sign-ups
          </p>
        </div>
      </footer>

      {/* ---------- create room dialog ---------- */}
      <Dialog open={dialog === "create"} onOpenChange={closeDialog}>
        <DialogContent className="glass-deep grain gap-5 border-[#c0bba1]/14 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display paper-text text-3xl tracking-[0.1em]">
              OPEN A SCREENING
            </DialogTitle>
            <DialogDescription className="text-[#898675]">
              Pick your marquee name — you&apos;ll write the first question
              yourself.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate} className="grid gap-4">
            <div className="grid gap-2">
              <Label
                htmlFor="create-name"
                className="font-type text-[11px] tracking-[0.22em] text-[#898675] uppercase"
              >
                Player name
              </Label>
              <Input
                id="create-name"
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Sunil"
                maxLength={18}
                className="h-12 rounded-md border-[#c0bba1]/16 bg-[#11120f]/60 text-base text-[#c0bba1] placeholder:text-[#898675]/60 focus-visible:border-[#747c5b]/60 focus-visible:ring-[#747c5b]/30"
              />
            </div>
            {error && <p className="text-sm text-[#c08a6e]">{error}</p>}
            <DialogFooter className="gap-2 pt-1">
              <Button
                type="submit"
                disabled={busy || name.trim().length === 0}
                className="kolly-cta lift font-display h-12 w-full rounded-md border border-[#747c5b]/45 bg-[#596344] text-lg tracking-[0.18em] text-[#e7e3d2] hover:bg-[#616c49]"
              >
                {busy ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <span>🎬</span> CREATE ROOM
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ---------- join room dialog ---------- */}
      <Dialog open={dialog === "join"} onOpenChange={closeDialog}>
        <DialogContent className="glass-deep grain gap-5 border-[#c0bba1]/14 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display paper-text text-3xl tracking-[0.1em]">
              ENTER THE SCREENING
            </DialogTitle>
            <DialogDescription className="text-[#898675]">
              Drop your name and the 6-character code your friend shared.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleJoin} className="grid gap-4">
            <div className="grid gap-2">
              <Label
                htmlFor="join-name"
                className="font-type text-[11px] tracking-[0.22em] text-[#898675] uppercase"
              >
                Player name
              </Label>
              <Input
                id="join-name"
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Arun"
                maxLength={18}
                className="h-12 rounded-md border-[#c0bba1]/16 bg-[#11120f]/60 text-base text-[#c0bba1] placeholder:text-[#898675]/60 focus-visible:border-[#747c5b]/60 focus-visible:ring-[#747c5b]/30"
              />
            </div>
            <div className="grid gap-2">
              <Label
                htmlFor="join-code"
                className="font-type text-[11px] tracking-[0.22em] text-[#898675] uppercase"
              >
                Room code
              </Label>
              <Input
                id="join-code"
                value={code}
                onChange={(e) =>
                  setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))
                }
                placeholder="ABX729"
                maxLength={6}
                className="font-display h-12 rounded-md border-[#c0bba1]/16 bg-[#11120f]/60 text-center text-2xl tracking-[0.45em] text-[#c0bba1] uppercase placeholder:text-[#898675]/40 focus-visible:border-[#747c5b]/60 focus-visible:ring-[#747c5b]/30"
              />
            </div>
            {error && <p className="text-sm text-[#c08a6e]">{error}</p>}
            <DialogFooter className="gap-2 pt-1">
              <Button
                type="submit"
                disabled={busy || name.trim().length === 0 || code.length < 6}
                className="lift font-display h-12 w-full rounded-md border border-[#c0bba1]/25 bg-[#30372a]/60 text-lg tracking-[0.18em] text-[#c0bba1] hover:border-[#747c5b]/60 hover:bg-[#30372a]"
              >
                {busy ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <span>🎟️</span> JOIN ROOM
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
