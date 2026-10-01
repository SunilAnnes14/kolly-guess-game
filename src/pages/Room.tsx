import {
  FilmCountdown,
  ScreenBackdrop,
} from "@/components/cinema/CinemaDecor";
import { RoomHeader } from "@/components/kollywood/RoomHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/convex/_generated/api";
import {
  loadIdentity,
  saveIdentity,
  type RoomIdentity,
} from "@/lib/roomIdentity";
import { friendlyError } from "@/lib/utils";
import { GameScreen } from "@/pages/room/GameScreen";
import { Lobby } from "@/pages/room/Lobby";
import { QuestionCreator } from "@/pages/room/QuestionCreator";
import { Champion, RoundComplete } from "@/pages/room/ResultOverlays";
import type { RoomState } from "@/pages/room/types";
import { AnimatePresence, motion } from "framer-motion";
import { useMutation, useQuery } from "convex/react";
import { Film, Loader2 } from "lucide-react";
import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import { useNavigate, useParams } from "react-router";

/**
 * `/room/ABX729` — the private screening.
 *
 * Identity is a secret token in localStorage: refreshes resume the same seat,
 * a fresh device always sees the join gate.
 */
export default function Room() {
  const params = useParams();
  const code = (params.code ?? "").trim().toUpperCase();
  const [identity, setIdentity] = useState<RoomIdentity | null>(() =>
    loadIdentity(code),
  );
  const room = useQuery(api.game.getRoom, {
    code,
    token: identity?.token ?? undefined,
  });

  // A short film-leader countdown whenever a fresh question goes live.
  const status = room?.status;
  const [countdown, setCountdown] = useState(0);
  const lastStatus = useRef(status);
  useEffect(() => {
    if (status === "playing" && lastStatus.current !== "playing") {
      setCountdown((n) => n + 1);
    }
    lastStatus.current = status;
  }, [status]);

  if (!code) return <RoomMissing code="—" />;
  if (room === undefined) return <ProjectorLoading />;
  if (room === null) return <RoomMissing code={code} />;

  const token = identity?.token ?? "";

  if (!room.me) {
    return (
      <div className="relative flex min-h-screen flex-col">
        <RoomHeader code={room.code} />
        <JoinGate
          code={room.code}
          room={room}
          prefillName={identity?.name ?? ""}
          onJoined={(next) => {
            saveIdentity(room.code, next);
            setIdentity(next);
          }}
        />
      </div>
    );
  }

  let view: ReactNode;
  switch (room.status) {
    case "lobby":
      view = <Lobby room={room} token={token} />;
      break;
    case "creating":
    case "tiebreak":
      view = room.me.isCreator ? (
        <QuestionCreator room={room} token={token} />
      ) : (
        <CreatorWriting room={room} />
      );
      break;
    case "showdown":
      view = <GameScreen room={room} token={token} />;
      break;
    case "roundComplete":
      view = <RoundComplete room={room} token={token} />;
      break;
    case "finished":
      view = <Champion room={room} token={token} />;
      break;
    default:
      view = <GameScreen room={room} token={token} />;
  }

  return (
    <div className="relative flex min-h-screen flex-col">
      <ScreenBackdrop />

      <RoomHeader code={room.code} />

      {countdown > 0 && (
        <FilmCountdown
          key={countdown}
          label={
            room.isShowdown
              ? "The final showdown"
              : `Round ${room.round} of ${room.roundsTotal}`
          }
        />
      )}

      <AnimatePresence mode="wait" initial={false}>
        <motion.main
          key={room.status}
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-1 flex-col"
        >
          {view}
        </motion.main>
      </AnimatePresence>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function ProjectorLoading() {
  return (
    <div className="grid min-h-screen place-items-center px-4">
      <div className="flex flex-col items-center gap-4 text-center">
        <motion.span
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 3.2, ease: "linear" }}
          className="block"
        >
          <Film className="h-9 w-9 text-primary" />
        </motion.span>
        <p className="font-display text-lg tracking-[0.28em] text-white/65">
          THREADING THE PROJECTOR…
        </p>
      </div>
    </div>
  );
}

function RoomMissing({ code }: { code: string }) {
  const navigate = useNavigate();
  return (
    <div className="grid min-h-screen place-items-center px-4">
      <div className="glass-deep w-full max-w-md rounded-3xl p-8 text-center">
        <p className="text-4xl">🎞️</p>
        <p className="font-display mt-4 text-3xl tracking-[0.1em] text-white">
          NO SUCH SCREENING
        </p>
        <p className="mt-3 text-sm leading-relaxed text-white/60">
          Room <span className="font-display text-primary">{code}</span>{" "}
          doesn&apos;t exist — double-check the code your friend shared.
        </p>
        <Button
          type="button"
          onClick={() => navigate("/")}
          className="mt-6 h-12 w-full rounded-xl bg-primary font-semibold text-primary-foreground"
        >
          BACK TO HOME
        </Button>
      </div>
    </div>
  );
}

/** Name gate for anyone entering the room without a seat yet. */
function JoinGate({
  code,
  room,
  prefillName,
  onJoined,
}: {
  code: string;
  room: RoomState;
  prefillName: string;
  onJoined: (identity: RoomIdentity) => void;
}) {
  const joinRoom = useMutation(api.game.joinRoom);
  const [name, setName] = useState(prefillName);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const res = await joinRoom({ code, name });
      onJoined({ token: res.token, name: res.name });
    } catch (err) {
      setError(friendlyError(err));
      setBusy(false);
    }
  };

  const creator = room.players.find((p) => p.isCreator);
  const host = room.players.find((p) => p.isHost);

  return (
    <div className="grid flex-1 place-items-center px-4 py-10">
      <motion.form
        onSubmit={handleSubmit}
        initial={{ opacity: 0, y: 22, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="glass-deep grain w-full max-w-md rounded-lg px-5 py-8 text-center sm:px-8"
      >
        <p className="font-type text-[11px] tracking-[0.42em] text-[#898675] uppercase">
          Private screening
        </p>
        <p className="font-display paper-text text-glow-gold mt-4 text-5xl leading-none tracking-[0.28em] sm:text-6xl">
          {code}
        </p>
        <p className="mt-3 text-sm text-white/60">
          {host ? (
            <>
              <span className="font-semibold text-white/90">{host.name}</span>{" "}
              invited you to a KOLLYWOOD game
              {room.roundsTotal > 0 && creator ? (
                <> — {creator.name} is on the mic right now.</>
              ) : (
                <>.</>
              )}
            </>
          ) : (
            "You've been invited to a private screening."
          )}
        </p>

        <div className="mt-6 grid gap-2 text-left">
          <Label
            htmlFor="gate-name"
            className="text-xs tracking-[0.22em] text-white/55 uppercase"
          >
            Your name
          </Label>
          <Input
            id="gate-name"
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Arun"
            maxLength={18}
            className="h-12 rounded-md border-[#c0bba1]/16 bg-[#11120f]/60 text-base text-[#c0bba1] placeholder:text-[#898675]/55 focus-visible:border-[#747c5b]/60 focus-visible:ring-[#747c5b]/30"
          />
        </div>

        {error && <p className="mt-3 text-sm text-[#c08a6e]">{error}</p>}

        <button
          type="submit"
          disabled={busy || !name.trim()}
          className={
            "kolly-cta lift font-display mt-5 flex h-14 w-full items-center justify-center gap-2 rounded-md text-lg tracking-[0.18em] transition-all " +
            (name.trim()
              ? "border border-[#747c5b]/45 bg-[#596344] text-[#e7e3d2] hover:bg-[#616c49]"
              : "cursor-not-allowed border border-white/10 bg-white/[0.04] text-white/35")
          }
        >
          {busy ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              <span>🎬</span> JOIN THE ROOM
            </>
          )}
        </button>
        <p className="mt-3 text-xs text-white/40">
          No account needed — just a name for the marquee.
        </p>
      </motion.form>
    </div>
  );
}

/** Guessers wait while this round's creator writes the question. */
function CreatorWriting({ room }: { room: RoomState }) {
  const creator = room.players.find((p) => p.isCreator);
  return (
    <div className="grid flex-1 place-items-center px-4 py-16">
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-deep w-full max-w-md rounded-3xl p-8 text-center"
      >
        <p className="text-4xl">🎬</p>
        <p className="font-display mt-4 text-2xl tracking-[0.14em] text-white">
          {room.isShowdown
            ? `${creator?.name?.toUpperCase() ?? "THE CREATOR"} IS SETTING THE DECIDER…`
            : `${creator?.name?.toUpperCase() ?? "THE CREATOR"} IS WRITING THE ANSWERS…`}
        </p>
        <p className="mt-3 text-sm leading-relaxed text-white/60">
          {room.isShowdown
            ? "The players level on points are about to race one final question for the crown. Sit back — this one decides everything."
            : `Round ${room.round} of ${room.roundsTotal}. They're setting the hero, the heroine, the movie and the song for everyone to crack — your own nine chances start the moment the question lands.`}
        </p>
        <span className="mt-5 flex items-center justify-center gap-2">
          <span className="h-2 w-2 animate-pulse rounded-full bg-primary" />
          <span className="h-2 w-2 animate-pulse rounded-full bg-primary [animation-delay:0.2s]" />
          <span className="h-2 w-2 animate-pulse rounded-full bg-primary [animation-delay:0.4s]" />
        </span>
      </motion.div>
    </div>
  );
}
