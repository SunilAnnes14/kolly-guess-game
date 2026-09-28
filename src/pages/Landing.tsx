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
import {
  ArrowRight,
  Clapperboard,
  Film,
  Loader2,
  Popcorn,
  Star,
  Ticket,
} from "lucide-react";
import { useState, type CSSProperties, type FormEvent } from "react";
import { useInView } from "react-intersection-observer";
import { useNavigate, useSearchParams } from "react-router";

const TITLE = "KOLLYWOOD".split("");
const EASE = [0.16, 1, 0.3, 1] as const;

const FLOATERS = [
  {
    Icon: Clapperboard,
    className: "left-[6%] top-[22%] h-10 w-10 text-primary/35",
    style: { "--float-rotate": "-10deg", animationDelay: "0.2s" },
  },
  {
    Icon: Film,
    className: "right-[8%] top-[26%] h-9 w-9 text-[#7c5cff]/40",
    style: { "--float-rotate": "8deg", animationDelay: "1.6s" },
  },
  {
    Icon: Ticket,
    className: "left-[12%] bottom-[22%] h-8 w-8 text-[#ff5a2c]/35 hidden sm:block",
    style: { "--float-rotate": "6deg", animationDelay: "0.9s" },
  },
  {
    Icon: Star,
    className: "right-[14%] bottom-[26%] h-7 w-7 text-primary/40 hidden sm:block",
    style: { "--float-rotate": "-6deg", animationDelay: "2.4s" },
  },
  {
    Icon: Popcorn,
    className: "right-[26%] top-[12%] h-9 w-9 text-primary/25 hidden md:block",
    style: { "--float-rotate": "10deg", animationDelay: "3.1s" },
  },
] as const;

const STEPS = [
  {
    n: "01",
    title: "Open a private room",
    body: "Create a room, share the code or link, and your friends walk right into your screening. Everyone writes exactly one question — you go first.",
  },
  {
    n: "02",
    title: "Set the four clues",
    body: "Hero, heroine, movie and song. Everyone else only ever gets the first letter of each — and the whole room plays that same puzzle.",
  },
  {
    n: "03",
    title: "Guess, judge, reveal",
    body: "Everyone guesses at the same time with their own nine chances. The creator approves each player's call separately.",
  },
];

/** The GUESS → APPROVAL → REVEAL loop that drives a round. */
const LOOP = [
  {
    icon: "🎯",
    title: "Pick a part",
    body: "Four buttons — hero, heroine, movie or song. Attack them in whatever order you like.",
  },
  {
    icon: "👑",
    title: "The creator judges",
    body: "Nothing is auto-marked. The friend running the round calls your guess right or wrong.",
  },
  {
    icon: "✨",
    title: "Reveal or burn",
    body: "A correct call flips that part to the full answer. A miss burns one KOLLYWOOD letter.",
  },
  {
    icon: "🏆",
    title: "Solve all four",
    body: "Get hero, heroine, movie and song on your board and that round is yours. The quicker the solve, the bigger the score.",
  },
  {
    icon: "🔁",
    title: "Pass the clapperboard",
    body: "When everyone finishes, the next player writes a brand-new question. Everyone creates one, everyone guesses the rest — highest total takes the trophy.",
  },
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
    <div className="relative min-h-screen overflow-x-hidden">
      {/* ---------- cinematic backdrop ---------- */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,#1c1440_0%,transparent_58%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,#2b1018_0%,transparent_52%)]" />
        {/* marquee spotlights */}
        <div className="absolute -top-32 left-[16%] h-[62vh] w-64 rotate-[16deg] rounded-full bg-gradient-to-b from-[rgba(245,197,66,0.17)] to-transparent blur-3xl sm:w-80" />
        <div className="absolute -top-28 right-[14%] h-[58vh] w-56 -rotate-[14deg] rounded-full bg-gradient-to-b from-[rgba(124,92,255,0.16)] to-transparent blur-3xl sm:w-72" />
        {/* drifting film strips */}
        <div className="film-strip animate-strip absolute top-[14%] -left-[8%] h-16 w-[120%] -rotate-[3deg] opacity-60 sm:h-20" />
        <div className="film-strip animate-strip absolute bottom-[16%] -left-[8%] h-16 w-[120%] rotate-[2deg] opacity-45 [animation-duration:3.4s] [animation-direction:reverse] sm:h-20" />
        {/* floating cinema ephemera */}
        {FLOATERS.map(({ Icon, className, style }, index) => (
          <Icon
            key={index}
            className={`animate-float absolute ${className}`}
            style={style as CSSProperties}
          />
        ))}
        {/* seat-row vignette */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_45%,rgba(0,0,0,0.65)_100%)]" />
      </div>

      {/* ---------- header ---------- */}
      <header className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-5">
        <div className="flex items-center gap-2.5">
          <Clapperboard className="h-5 w-5 text-primary" />
          <span className="font-display text-xl tracking-[0.22em] gold-text">
            KOLLYWOOD
          </span>
        </div>
        <p className="hidden text-xs tracking-[0.24em] text-white/45 uppercase sm:block">
          Made for Tamil movie lovers
        </p>
      </header>

      {/* ---------- hero ---------- */}
      <main className="relative z-10">
        <section className="mx-auto flex max-w-5xl flex-col items-center px-5 pt-10 pb-24 text-center sm:pt-16">
          <motion.p
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.6, ease: EASE }}
            className="text-[11px] font-semibold tracking-[0.45em] text-primary/85 uppercase sm:text-xs"
          >
            A Tamil cinema party game
          </motion.p>

          <h1
            aria-label="KOLLYWOOD"
            className="mt-5 flex justify-center text-[clamp(3.4rem,13vw,8.5rem)] leading-[0.92] [perspective:900px]"
          >
            {TITLE.map((letter, index) => (
              <motion.span
                key={index}
                aria-hidden
                initial={{ opacity: 0, y: 70, rotateX: -75 }}
                animate={{ opacity: 1, y: 0, rotateX: 0 }}
                transition={{
                  delay: 0.18 + index * 0.07,
                  duration: 0.75,
                  ease: EASE,
                }}
                className="font-display gold-text text-glow-gold inline-block"
              >
                {letter}
              </motion.span>
            ))}
          </h1>

          <motion.p
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.05, duration: 0.7, ease: EASE }}
            className="mt-4 max-w-xl text-lg text-white/85 sm:text-2xl"
          >
            Guess the hero. The heroine. The movie. The song.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.25, duration: 0.7, ease: EASE }}
            className="mt-10 flex w-full flex-col items-center justify-center gap-4 sm:w-auto sm:flex-row"
          >
            <Button
              type="button"
              onClick={() => setDialog("create")}
              className="kolly-cta h-14 w-full rounded-full px-9 text-base font-semibold tracking-wide shadow-[0_0_0_rgba(245,197,66,0)] transition-all hover:-translate-y-0.5 hover:shadow-[0_10px_36px_rgba(245,197,66,0.35)] active:translate-y-0 sm:w-auto"
            >
              <span className="text-lg">🎬</span> CREATE ROOM
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDialog("join")}
              className="h-14 w-full rounded-full border-primary/45 bg-transparent px-9 text-base font-semibold tracking-wide text-primary transition-all hover:-translate-y-0.5 hover:border-primary hover:bg-primary/10 hover:shadow-[0_10px_30px_rgba(245,197,66,0.2)] active:translate-y-0 sm:w-auto"
            >
              <span className="text-lg">🎟️</span> JOIN ROOM
            </Button>
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.5, duration: 0.8 }}
            className="mt-6 flex items-center gap-2 text-sm text-white/50"
          >
            <Star className="h-3.5 w-3.5 text-primary/70" />
            Made for Tamil movie lovers.
          </motion.p>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.7, duration: 0.8 }}
            className="mt-14 text-[10px] tracking-[0.35em] text-white/35 uppercase"
          >
            Private rooms · Real friends · One movie
          </motion.p>
        </section>

        {/* ---------- how it plays ---------- */}
        <section className="mx-auto w-full max-w-6xl px-5 pb-20 sm:pb-24">
          <div className="mb-10 text-center">
            <p className="text-[11px] font-semibold tracking-[0.4em] text-primary/80 uppercase">
              How it plays
            </p>
            <h2 className="font-display mt-3 text-4xl tracking-[0.06em] text-white sm:text-5xl">
              Four clues. One movie. <span className="gold-text">Nine lives.</span>
            </h2>
          </div>

          <div className="grid items-center gap-8 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="grid gap-4">
              {STEPS.map((step, index) => (
                <motion.div
                  key={step.n}
                  initial={{ opacity: 0, x: -26 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, margin: "-60px" }}
                  transition={{ delay: index * 0.1, duration: 0.6, ease: EASE }}
                  className="glass flex items-start gap-5 rounded-2xl p-5 transition-colors hover:border-primary/30"
                >
                  <span className="font-display text-3xl leading-none text-primary/60">
                    {step.n}
                  </span>
                  <div>
                    <h3 className="text-base font-semibold text-white">
                      {step.title}
                    </h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-white/60">
                      {step.body}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>

            <motion.div
              initial={{ opacity: 0, scale: 0.94 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.7, ease: EASE }}
              className="glass relative rounded-3xl px-5 py-9 sm:px-8"
            >
              <p className="text-center text-[10px] font-semibold tracking-[0.35em] text-white/45 uppercase">
                Current question
              </p>
              <div
                ref={demoRef}
                className="mt-7 flex min-h-[300px] items-center justify-center sm:min-h-[340px]"
              >
                {demoInView && (
                  <ClueCross
                    initials={{
                      hero: "V",
                      heroine: "T",
                      movie: "G",
                      song: "A",
                    }}
                  />
                )}
              </div>
              <div className="gold-rule mt-6" />
              <p className="mt-4 text-center text-sm text-white/70">
                <span className="text-primary">Vijay</span> ·{" "}
                <span className="text-primary">Trisha</span> ·{" "}
                <span className="text-primary">Ghilli</span> ·{" "}
                <span className="text-primary">Appadi Podu</span>
              </p>
              <p className="mt-1 text-center text-xs text-white/45">
                Your friends only get the first letter of each part.
              </p>
            </motion.div>
          </div>
        </section>

        {/* ---------- progressive discovery ---------- */}
        <section className="mx-auto w-full max-w-6xl px-5 pb-20 sm:pb-24">
          <div className="mb-10 text-center">
            <p className="text-[11px] font-semibold tracking-[0.4em] text-primary/80 uppercase">
              Guess · approve · reveal
            </p>
            <h2 className="font-display mt-3 text-4xl tracking-[0.06em] text-white sm:text-5xl">
              Four parts.{" "}
              <span className="gold-text">Discover them one by one.</span>
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-white/60 sm:text-base">
              Nobody has to know the whole film. Pick the part you&apos;re sure
              about and guess just that — each answer you land lights up the
              &ldquo;+&rdquo; a little more.
            </p>
          </div>

          <div className="grid items-center gap-8 lg:grid-cols-[0.95fr_1.05fr]">
            <motion.div
              initial={{ opacity: 0, scale: 0.94 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.7, ease: EASE }}
              className="glass-deep rounded-3xl px-4 py-8 sm:px-8"
            >
              <p className="text-center text-[10px] font-semibold tracking-[0.35em] text-white/45 uppercase">
                Two parts found
              </p>
              <div className="mt-6">
                <PlusBoard
                  initials={{ hero: "V", heroine: "T", movie: "G", song: "A" }}
                  revealed={{
                    hero: true,
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
              <div className="gold-rule mt-6" />
              <p className="mt-4 text-center text-sm leading-relaxed text-white/65">
                ✓ Vijay and Trisha are on the board. The movie and the song are
                still hiding behind their initials.
              </p>
            </motion.div>

            <div className="grid gap-3">
              {LOOP.map((step, index) => (
                <motion.div
                  key={step.title}
                  initial={{ opacity: 0, x: 26 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, margin: "-60px" }}
                  transition={{ delay: index * 0.09, duration: 0.6, ease: EASE }}
                  className="glass flex items-start gap-4 rounded-2xl p-5 transition-colors hover:border-primary/30"
                >
                  <span aria-hidden className="text-2xl leading-none">
                    {step.icon}
                  </span>
                  <div>
                    <h3 className="text-base font-semibold text-white">
                      {step.title}
                    </h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-white/60">
                      {step.body}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ---------- nine lives ---------- */}
        <section className="mx-auto w-full max-w-4xl px-5 pb-24">
          <motion.div
            initial={{ opacity: 0, y: 26 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.7, ease: EASE }}
            className="glass-deep rounded-3xl px-5 py-9 text-center sm:px-10"
          >
            <p className="text-[11px] font-semibold tracking-[0.4em] text-[#ff5a2c] uppercase">
              Nine chances
            </p>
            <div className="mt-6">
              <LivesRow lives={6} />
            </div>
            <p className="mx-auto mt-6 max-w-lg text-sm leading-relaxed text-white/65">
              Every player gets their OWN nine letters for every question. The
              hero, the heroine, the movie and the song all draw from your own
              pool — burn all nine and the film gets away while your friends
              are still guessing.
            </p>
          </motion.div>
        </section>

        {/* ---------- final cta ---------- */}
        <section className="mx-auto w-full max-w-3xl px-5 pb-24 text-center">
          <h2 className="font-display text-4xl tracking-[0.06em] text-white sm:text-5xl">
            Ready for the <span className="gold-text">first show?</span>
          </h2>
          <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button
              type="button"
              onClick={() => setDialog("create")}
              className="kolly-cta h-14 w-full rounded-full px-8 text-base font-semibold shadow-[0_10px_36px_rgba(245,197,66,0.25)] transition-all hover:-translate-y-0.5 hover:shadow-[0_14px_44px_rgba(245,197,66,0.4)] sm:w-auto"
            >
              <Clapperboard className="h-4 w-4" /> CREATE ROOM
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDialog("join")}
              className="h-14 w-full rounded-full border-primary/45 bg-transparent px-8 text-base font-semibold text-primary transition-all hover:-translate-y-0.5 hover:border-primary hover:bg-primary/10 sm:w-auto"
            >
              <ArrowRight className="h-4 w-4" /> JOIN WITH A CODE
            </Button>
          </div>
        </section>
      </main>

      <footer className="relative z-10 border-t border-white/10 py-7">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-2 px-5 text-center sm:flex-row sm:justify-between sm:text-left">
          <span className="font-display text-lg tracking-[0.24em] gold-text">
            KOLLYWOOD
          </span>
          <p className="text-xs text-white/45">
            Made for Tamil movie lovers · Private rooms, no sign-ups
          </p>
        </div>
      </footer>

      {/* ---------- create room dialog ---------- */}
      <Dialog open={dialog === "create"} onOpenChange={closeDialog}>
        <DialogContent className="glass-deep gap-5 border-white/10 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display gold-text text-3xl tracking-[0.1em]">
              OPEN A SCREENING
            </DialogTitle>
            <DialogDescription className="text-white/60">
              Pick your marquee name — you&apos;ll write the questions and judge
              every guess.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate} className="grid gap-4">
            <div className="grid gap-2">
              <Label
                htmlFor="create-name"
                className="text-xs tracking-[0.22em] text-white/55 uppercase"
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
                className="h-12 rounded-xl border-white/15 bg-white/5 text-base placeholder:text-white/25 focus-visible:border-primary/60 focus-visible:ring-primary/40"
              />
            </div>
            {error && <p className="text-sm text-[#ff7a55]">{error}</p>}
            <DialogFooter className="gap-2 pt-1">
              <Button
                type="submit"
                disabled={busy || name.trim().length === 0}
                className="kolly-cta h-12 w-full rounded-xl text-base font-semibold"
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
        <DialogContent className="glass-deep gap-5 border-white/10 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display gold-text text-3xl tracking-[0.1em]">
              ENTER THE SCREENING
            </DialogTitle>
            <DialogDescription className="text-white/60">
              Drop your name and the 6-character code your friend shared.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleJoin} className="grid gap-4">
            <div className="grid gap-2">
              <Label
                htmlFor="join-name"
                className="text-xs tracking-[0.22em] text-white/55 uppercase"
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
                className="h-12 rounded-xl border-white/15 bg-white/5 text-base placeholder:text-white/25 focus-visible:border-primary/60 focus-visible:ring-primary/40"
              />
            </div>
            <div className="grid gap-2">
              <Label
                htmlFor="join-code"
                className="text-xs tracking-[0.22em] text-white/55 uppercase"
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
                className="font-display h-12 rounded-xl border-white/15 bg-white/5 text-center text-2xl tracking-[0.45em] uppercase placeholder:text-white/20 focus-visible:border-primary/60 focus-visible:ring-primary/40"
              />
            </div>
            {error && <p className="text-sm text-[#ff7a55]">{error}</p>}
            <DialogFooter className="gap-2 pt-1">
              <Button
                type="submit"
                disabled={busy || name.trim().length === 0 || code.length < 6}
                className="h-12 w-full rounded-xl border-primary/50 bg-primary/10 text-base font-semibold text-primary hover:bg-primary/20"
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
