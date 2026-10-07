import { api } from "@/convex/_generated/api";
import { cn, friendlyError } from "@/lib/utils";
import type { RoomState } from "@/pages/room/types";
import { AnimatePresence, motion } from "framer-motion";
import { useMutation } from "convex/react";
import { Check, Loader2 } from "lucide-react";
import { useState } from "react";

/**
 * 🗳 VOTE TO MOVE ON.
 *
 * A question nobody can crack shouldn't hold the room hostage. Every player
 * frozen into this round gets exactly one vote, and the round moves on only
 * when EVERY one of them has voted — strictly unanimous.
 *
 * There is no majority here (three of four is not enough) and no way for a
 * single player, not even the question's author, to force a skip. The tally is
 * public: who has voted, never why. There is no "against" vote to read into
 * it, because voting is agreement, not a contest. All of it lives on the
 * server, so a refresh never loses a vote.
 */
export function VotePanel({ room, token }: { room: RoomState; token: string }) {
  const castVote = useMutation(api.game.voteToSkipRound);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const voting = room.voting;
  // Voting only exists while a question is live.
  if (!voting.open) return null;

  const mine = voting.voters.find((voter) => voter.isMe);
  const eligible = !!mine;
  const pct =
    voting.eligibleCount > 0
      ? Math.round((voting.votedCount / voting.eligibleCount) * 100)
      : 0;
  // The most recent vote in the room, so the tally reads like a live feed.
  const lastVoter = voting.lastVoterId
    ? voting.voters.find((voter) => voter.playerId === voting.lastVoterId)
    : undefined;
  const announcement =
    lastVoter && lastVoter.voted && !lastVoter.isMe ? lastVoter : null;

  const handleVote = async () => {
    if (busy || !voting.canVote) return;
    setBusy(true);
    setError(null);
    try {
      await castVote({ token });
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 220, damping: 24 }}
      className="glass rounded-2xl p-4 sm:p-5"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[11px] font-semibold tracking-[0.3em] text-white/55 uppercase">
          🗳 Move to next round
        </p>
        <motion.span
          key={voting.votedCount}
          initial={{ scale: 0.82, opacity: 0.4 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 320, damping: 20 }}
          className="font-display rounded-full border border-primary/35 bg-primary/10 px-3 py-1 text-sm tracking-[0.14em] text-primary tabular-nums"
        >
          {voting.votedCount} / {voting.eligibleCount} VOTED
        </motion.span>
      </div>

      <p className="mt-1.5 text-[11px] leading-relaxed text-white/40">
        Stuck on a question nobody can crack? Everyone has to agree — the round
        only moves on once all {voting.eligibleCount} player
        {voting.eligibleCount === 1 ? "" : "s"} have voted. Exactly one vote
        each, no majority, nobody can force it.
      </p>

      <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
        <motion.div
          className="h-full rounded-full bg-primary/70"
          animate={{ width: `${pct}%` }}
          transition={{ type: "spring", stiffness: 200, damping: 26 }}
        />
      </div>

      <ul className="mt-3 grid gap-2 sm:grid-cols-2">
        {voting.voters.map((voter) => (
          <li
            key={voter.playerId}
            className={cn(
              "flex items-center gap-2.5 rounded-xl border px-3 py-2",
              voter.isMe
                ? "border-primary/35 bg-primary/[0.07]"
                : "border-white/[0.07] bg-white/[0.02]",
            )}
          >
            <span className="font-display grid h-7 w-7 shrink-0 place-items-center rounded-full bg-gradient-to-br from-primary/70 to-[#8a5138]/70 text-xs text-black">
              {voter.name.charAt(0).toUpperCase()}
            </span>
            <span className="min-w-0 flex-1 truncate text-sm text-white/85">
              {voter.name}
              {voter.isMe && (
                <span className="ml-1.5 text-[10px] tracking-wider text-white/40 uppercase">
                  you
                </span>
              )}
            </span>
            <motion.span
              key={`${voter.playerId}-${voter.voted}`}
              initial={{ scale: 0.85, opacity: 0.45 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
              className={cn(
                "flex shrink-0 items-center gap-1 text-[10px] font-semibold tracking-[0.16em] uppercase",
                voter.voted ? "text-primary" : "text-white/40",
              )}
            >
              {voter.voted ? (
                <>
                  <Check className="h-3 w-3" /> Voted
                </>
              ) : (
                <>⏳ Waiting</>
              )}
            </motion.span>
          </li>
        ))}
      </ul>

      {eligible ? (
        voting.iVoted ? (
          <motion.div
            key="recorded"
            initial={{ scale: 0.94, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 260, damping: 18 }}
            className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-primary/45 bg-primary/[0.12] text-sm font-semibold tracking-[0.16em] text-primary uppercase"
          >
            <Check className="h-4 w-4" /> Vote recorded
          </motion.div>
        ) : (
          <button
            type="button"
            onClick={handleVote}
            disabled={busy}
            className="kolly-cta mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-[#c0bba1]/30 bg-[#c0bba1]/[0.06] text-sm font-semibold tracking-[0.16em] text-[#e7e3d2] transition-all hover:-translate-y-0.5 hover:border-[#c0bba1]/55 hover:bg-[#c0bba1]/10 disabled:opacity-60"
          >
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>🗳 Vote to move on</>
            )}
          </button>
        )
      ) : (
        <p className="mt-4 rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2.5 text-center text-[11px] leading-relaxed text-white/40">
          This question went live before you joined — the players already in it
          decide this one.
        </p>
      )}

      <AnimatePresence mode="wait" initial={false}>
        {voting.iVoted ? (
          <motion.p
            key="mine"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mt-2.5 text-center text-[11px] text-primary/85"
          >
            ✓ You voted to move to the next round.
          </motion.p>
        ) : announcement ? (
          <motion.p
            key={`${announcement.playerId}-${voting.votedCount}`}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mt-2.5 text-center text-[11px] text-white/45"
          >
            🗳 {announcement.name} voted to move on. {voting.votedCount} /{" "}
            {voting.eligibleCount} players have voted.
          </motion.p>
        ) : (
          <motion.p
            key="waiting"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mt-2.5 text-center text-[11px] text-white/35"
          >
            Waiting for the room to make up its mind…
          </motion.p>
        )}
      </AnimatePresence>

      {error && (
        <p className="mt-2 text-center text-sm text-[#c08a6e]">{error}</p>
      )}
    </motion.div>
  );
}
