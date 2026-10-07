import { ConvexError, v } from "convex/values";
import { isAnswerCorrect, normalizeAnswer } from "../lib/answers";
import {
  answerAliasesFor,
  findMovieById,
  typedAliases,
  type AnswerCategory,
  type MovieRecord,
} from "../lib/movieDataset";
import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { mutation, query } from "./_generated/server";

/** Room codes look like ABX729 — no ambiguous 0/O or 1/I. */
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const CODE_LENGTH = 6;

/**
 * K · O · L · L · Y · W · O · O · D
 *
 * Every player gets their OWN nine, for every question they guess. These are
 * never shared, pooled or carried across rounds.
 */
export const MAX_LIVES = 9;
/** Chances a player must spend before they may ask for a clue. */
export const CLUE_UNLOCK_USED = 5;
const MAX_PLAYERS = 12;
const MAX_NAME = 18;
const MAX_GUESS = 90;

/** The four independent parts of every question, in board order. */
export const CATEGORY_ORDER = ["hero", "heroine", "movie", "song"] as const;
export type Category = (typeof CATEGORY_ORDER)[number];

/** Player-facing names for the four parts — used in guess messages. */
const CATEGORY_LABELS: Record<Category, string> = {
  hero: "Hero",
  heroine: "Heroine",
  movie: "Movie",
  song: "Song",
};

type Revealed = Record<Category, boolean>;

const categoryValidator = v.union(
  v.literal("hero"),
  v.literal("heroine"),
  v.literal("movie"),
  v.literal("song"),
);

function emptyRevealed(): Revealed {
  return { hero: false, heroine: false, movie: false, song: false };
}

/** Rows written before the four-part board show nothing as found yet. */
function revealedOf(entry: { revealed?: Revealed | null }): Revealed {
  return { ...emptyRevealed(), ...(entry.revealed ?? {}) };
}

/**
 * A board is closed only when THIS player has personally found all four
 * parts. A wrong guess reveals nothing, so nothing but their own discoveries
 * can ever fill a slot — and nothing they find is ever shown to anyone else.
 */
function boardComplete(revealed: Revealed): boolean {
  return CATEGORY_ORDER.every((c) => revealed[c]);
}

/**
 * Approved spellings for one question.
 *
 * A field the creator left matching the library row it came from borrows that
 * row's real-world aliases ("Thalapathy Vijay", "GOAT"…). A field they typed
 * or edited is accepted on its own spelling alone, so a hand-written name can
 * never be matched by a stale library alias.
 */
function buildAliases(
  picked: MovieRecord | null,
  values: Record<AnswerCategory, string>,
): Record<AnswerCategory, string[]> {
  const typed = typedAliases(values);
  if (!picked) return typed;
  const song = picked.songs.includes(values.song)
    ? values.song
    : (picked.songs[0] ?? values.song);
  const library = answerAliasesFor(picked, song);
  return {
    hero: values.hero === picked.hero ? library.hero : typed.hero,
    heroine: values.heroine === picked.heroine ? library.heroine : typed.heroine,
    movie: values.movie === picked.movie ? library.movie : typed.movie,
    song: values.song === song ? library.song : typed.song,
  };
}

type Ctx = QueryCtx | MutationCtx;
type Question = NonNullable<Doc<"rooms">["question"]>;

function answerFor(question: Question, category: Category): string {
  switch (category) {
    case "hero":
      return question.hero;
    case "heroine":
      return question.heroine;
    case "movie":
      return question.movie;
    case "song":
      return question.song;
  }
}

/** The approved alternate spellings for one part of this question. */
function aliasesFor(
  question: Question,
  category: Category,
): readonly string[] {
  const aliases: Record<AnswerCategory, readonly string[]> | null =
    question.aliases ?? null;
  if (!aliases) return [];
  return aliases[category] ?? [];
}

/**
 * The single source of truth for a guess: normalise, then require an exact
 * match against the stored answer or one of its approved aliases. No fuzzy
 * matching, no "close enough" — a wrong call costs a KOLLYWOOD letter.
 */
function gradeGuess(
  question: Question,
  category: Category,
  text: string,
): boolean {
  return isAnswerCorrect(text, answerFor(question, category), aliasesFor(question, category));
}

/**
 * Placement points — the race is the whole game, so finishing first is what
 * pays: 1st 100, 2nd 80, 3rd 60, 4th 40, 5th 20, sixth and beyond 0.
 */
function scoreForPlacement(placement: number): number {
  return Math.max(0, 120 - placement * 20);
}

/** Everyone sharing the top score — only consulted once a game is over. */
async function tiedTopPlayers(
  ctx: Ctx,
  roomId: Id<"rooms">,
): Promise<Doc<"players">[]> {
  const players = await playersInRoom(ctx, roomId);
  if (players.length < 2) return [];
  const top = Math.max(...players.map((p) => p.points));
  const tied = players.filter((p) => p.points === top);
  return tied.length > 1 ? tied : [];
}

function generateCode(): string {
  let code = "";
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  }
  return code;
}

function cleanName(raw: string): string {
  const name = raw.trim().replace(/\s+/g, " ");
  if (!name) throw new ConvexError("Enter a player name to continue.");
  return name.slice(0, MAX_NAME);
}

/**
 * First letter of a name — works for Latin *and* Tamil scripts, so
 * "விஜய்" still yields "வ" as the hero initial.
 */
function initialOf(raw: string): string {
  const trimmed = raw.trim();
  const letter = trimmed.match(/\p{L}/u)?.[0];
  // Fall back to the first character for numeric titles like "96".
  return (letter ?? trimmed.charAt(0)).toUpperCase();
}

function cleanGuess(raw: string): string {
  const text = raw.trim().replace(/\s+/g, " ");
  if (!text) throw new ConvexError("Type your guess first.");
  if (text.length > MAX_GUESS) throw new ConvexError("That guess is too long.");
  return text;
}

async function roomByCode(ctx: Ctx, code: string): Promise<Doc<"rooms">> {
  const normalized = code.trim().toUpperCase();
  const room = await ctx.db
    .query("rooms")
    .withIndex("by_code", (q) => q.eq("code", normalized))
    .unique();
  if (!room) {
    throw new ConvexError("No room found for that code. Check it and try again.");
  }
  return room;
}

async function playerByToken(ctx: Ctx, token: string): Promise<Doc<"players">> {
  const player = await ctx.db
    .query("players")
    .withIndex("by_token", (q) => q.eq("token", token))
    .unique();
  if (!player) throw new ConvexError("Your seat expired. Rejoin the room.");
  return player;
}

/** Everyone in the room, in join order — this IS the creator rotation. */
async function playersInRoom(
  ctx: Ctx,
  roomId: Id<"rooms">,
): Promise<Doc<"players">[]> {
  const players = await ctx.db
    .query("players")
    .withIndex("by_room", (q) => q.eq("roomId", roomId))
    .collect();
  return players.sort((a, b) => a.joinedAt - b.joinedAt);
}

/**
 * Whose turn it is to write the question.
 *
 * The room host opens the game, then the role walks the join order. We rotate
 * against `roundsTotal` (fixed when the game starts) so players who join
 * mid-game land after the rotation instead of shifting it.
 */
function creatorIndex(round: number, roundsTotal: number): number {
  if (roundsTotal <= 0) return 0;
  return (round - 1) % roundsTotal;
}

async function entriesForRound(
  ctx: Ctx,
  roomId: Id<"rooms">,
  round: number,
): Promise<Doc<"roundEntries">[]> {
  return await ctx.db
    .query("roundEntries")
    .withIndex("by_room_round", (q) => q.eq("roomId", roomId).eq("round", round))
    .collect();
}

async function guessesForRound(
  ctx: Ctx,
  roomId: Id<"rooms">,
  round: number,
): Promise<Doc<"guesses">[]> {
  const guesses = await ctx.db
    .query("guesses")
    .withIndex("by_room_round", (q) => q.eq("roomId", roomId).eq("round", round))
    .collect();
  return guesses.sort((a, b) => a.createdAt - b.createdAt);
}

async function entryFor(
  ctx: Ctx,
  roomId: Id<"rooms">,
  round: number,
  playerId: Id<"players">,
): Promise<Doc<"roundEntries"> | null> {
  return await ctx.db
    .query("roundEntries")
    .withIndex("by_room_round_player", (q) =>
      q.eq("roomId", roomId).eq("round", round).eq("playerId", playerId),
    )
    .unique();
}

/**
 * Who must vote to move the current round on.
 *
 * The round's eligible voters are frozen when the question goes live (the
 * creator plus every guesser), so somebody joining mid-round can never raise
 * the bar. We then intersect that list with the players still in the room — a
 * seat that is gone must never hold the round hostage. Rooms written before
 * this feature have no frozen list, so we fall back to the same set derived
 * from the round's entries.
 */
function eligibleOf(
  room: Doc<"rooms">,
  entryPlayerIds: Id<"players">[],
  presentIds: Id<"players">[],
): Id<"players">[] {
  const stored = room.eligibleVoterIds ?? [];
  const base =
    stored.length > 0
      ? stored
      : [
          ...entryPlayerIds,
          ...(room.creatorId ? [room.creatorId] : []),
        ];
  return base.filter((id) => presentIds.includes(id));
}

/**
 * Where the tournament goes once a round is over — the normal finish AND the
 * unanimous skip both land here, so a round can only ever be handed on once.
 */
async function finishRound(ctx: MutationCtx, room: Doc<"rooms">) {
  // The showdown is the last word — nothing follows the tie-break round.
  if (room.status === "showdown") {
    await ctx.db.patch(room._id, { status: "finished" });
    return;
  }

  if (room.round >= room.roundsTotal) {
    const tied = await tiedTopPlayers(ctx, room._id);
    const players = await playersInRoom(ctx, room._id);
    // Top scores level, and someone is left over to set the decider → race it.
    if (tied.length > 1 && tied.length < players.length) {
      const tiedIds = tied.map((p) => p._id);
      const judge =
        players.find((p) => !tiedIds.includes(p._id)) ?? players[0];
      await ctx.db.patch(room._id, {
        status: "tiebreak",
        tiebreakIds: tiedIds,
        creatorId: judge._id,
        round: room.roundsTotal + 1,
        question: null,
        // The decider is a fresh round — its own vote state, if anyone asks.
        eligibleVoterIds: [],
        voteSkipIds: [],
        skippedRound: false,
      });
      return;
    }
    await ctx.db.patch(room._id, { status: "finished" });
    return;
  }

  await ctx.db.patch(room._id, { status: "roundComplete" });
}

/**
 * Flip the room out of "playing" the moment the last player finishes.
 *
 * A round that ends the normal way also CANCELS any vote still running: the
 * pending votes are discarded here and are never carried forward.
 */
async function settleRound(ctx: MutationCtx, room: Doc<"rooms">) {
  const entries = await entriesForRound(ctx, room._id, room.round);
  if (entries.length === 0) return;
  if (entries.some((e) => e.status === "playing")) return;

  if ((room.voteSkipIds ?? []).length > 0) {
    await ctx.db.patch(room._id, { voteSkipIds: [] });
  }
  await finishRound(ctx, room);
}

/* ------------------------------------------------------------------ */
/* Room lifecycle                                                      */
/* ------------------------------------------------------------------ */

export const createRoom = mutation({
  args: { name: v.string() },
  handler: async (ctx, { name }) => {
    const clean = cleanName(name);

    let code = "";
    for (let attempt = 0; attempt < 10; attempt++) {
      const candidate = generateCode();
      const clash = await ctx.db
        .query("rooms")
        .withIndex("by_code", (q) => q.eq("code", candidate))
        .unique();
      if (!clash) {
        code = candidate;
        break;
      }
    }
    if (!code) throw new ConvexError("Could not open a room right now. Try again.");

    const now = Date.now();
    const roomId = await ctx.db.insert("rooms", {
      code,
      status: "lobby",
      creatorId: null,
      round: 1,
      roundsTotal: 0,
      question: null,
      createdAt: now,
    });

    const token = crypto.randomUUID();
    const playerId = await ctx.db.insert("players", {
      roomId,
      token,
      name: clean,
      joinedAt: now,
      points: 0,
      solves: 0,
      correct: 0,
      attempts: 0,
      cluesUsed: 0,
    });

    return { code, token, playerId };
  },
});

export const joinRoom = mutation({
  args: { code: v.string(), name: v.string() },
  handler: async (ctx, { code, name }) => {
    const room = await roomByCode(ctx, code);
    const existing = await playersInRoom(ctx, room._id);
    if (existing.length >= MAX_PLAYERS) {
      throw new ConvexError("This room is full (12 players max).");
    }

    let clean = cleanName(name);
    if (existing.some((p) => p.name.toLowerCase() === clean.toLowerCase())) {
      let suffix = 2;
      const base = clean.slice(0, MAX_NAME - 2);
      while (
        existing.some(
          (p) => p.name.toLowerCase() === `${base} ${suffix}`.toLowerCase(),
        )
      ) {
        suffix += 1;
      }
      clean = `${base} ${suffix}`;
    }

    const token = crypto.randomUUID();
    const playerId = await ctx.db.insert("players", {
      roomId: room._id,
      token,
      name: clean,
      // Nudge past any same-millisecond joins so the rotation order is stable.
      joinedAt: Date.now() + existing.length,
      points: 0,
      solves: 0,
      correct: 0,
      attempts: 0,
      cluesUsed: 0,
    });
    return { code: room.code, token, playerId, name: clean };
  },
});

/* ------------------------------------------------------------------ */
/* Read state                                                          */
/* ------------------------------------------------------------------ */

/**
 * The whole room, live — shaped around the viewer.
 *
 * A guesser only ever receives their OWN board values, their own clue and
 * their own nine chances. The creator receives the answer key so they can
 * judge, plus every player's guess waiting on their call.
 */
export const getRoom = query({
  args: { code: v.string(), token: v.optional(v.string()) },
  handler: async (ctx, { code, token }) => {
    const normalized = code.trim().toUpperCase();
    const room = await ctx.db
      .query("rooms")
      .withIndex("by_code", (q) => q.eq("code", normalized))
      .unique();
    if (!room) return null;

    const players = await playersInRoom(ctx, room._id);
    const me = token ? (players.find((p) => p.token === token) ?? null) : null;
    const hostId = players[0]?._id ?? null;
    const isCreator = !!me && me._id === room.creatorId;
    const isHost = !!me && me._id === hostId;
    const roundOver =
      room.status === "roundComplete" || room.status === "finished";
    const question = room.question;

    const entries = (await entriesForRound(ctx, room._id, room.round)).sort(
      (a, b) => a.createdAt - b.createdAt,
    );
    const guesses = await guessesForRound(ctx, room._id, room.round);
    const myEntry = entries.find((e) => e.playerId === me?._id) ?? null;

    // Once the round is over the whole board is public — nothing left to spoil.
    const holdsAnswerKey = isCreator || roundOver;
    const valueFor = (category: Category): string | null => {
      if (!question) return null;
      if (holdsAnswerKey) return answerFor(question, category);
      // The answer is private: only the player who found this part sees it.
      const mine = myEntry ? revealedOf(myEntry)[category] : false;
      return mine ? answerFor(question, category) : null;
    };

    const revealedMe = myEntry ? revealedOf(myEntry) : emptyRevealed();
    const chancesUsed = myEntry ? MAX_LIVES - myEntry.lives : 0;

    const tiebreakIds = room.tiebreakIds ?? [];
    const nextRound = roundOver && room.round < room.roundsTotal
      ? room.round + 1
      : null;
    const nextCreator =
      nextRound !== null
        ? (players[creatorIndex(nextRound, room.roundsTotal)] ?? null)
        : null;

    /*
     * VOTE TO MOVE ON. Voting is only ever open while a question is live, and
     * only the players frozen into this round may cast a vote. The counter is
     * public — who has voted, never why.
     */
    const votingOpen =
      !!question && (room.status === "playing" || room.status === "showdown");
    // A skipped round keeps its tally on screen for the reveal, even though
    // voting itself is long closed.
    const eligibleIds =
      (votingOpen || !!room.skippedRound) && question
        ? eligibleOf(
            room,
            entries.map((e) => e.playerId),
            players.map((p) => p._id),
          )
        : [];
    const votedIds = (room.voteSkipIds ?? []).filter((id) =>
      eligibleIds.includes(id),
    );
    const voters = eligibleIds.flatMap((id) => {
      const p = players.find((x) => x._id === id);
      if (!p) return [];
      return [
        {
          playerId: p._id,
          name: p.name,
          voted: votedIds.includes(p._id),
          isMe: !!me && p._id === me._id,
          isCreator: p._id === room.creatorId,
        },
      ];
    });

    return {
      code: room.code,
      status: room.status,
      round: room.round,
      roundsTotal: room.roundsTotal,
      creatorId: room.creatorId,
      creatorName:
        players.find((p) => p._id === room.creatorId)?.name ?? null,
      nextCreatorId: nextCreator?._id ?? null,
      nextCreatorName: nextCreator?.name ?? null,
      /** Non-empty only during a tie-break — who is level at the top. */
      tiebreakIds,
      tiebreakNames: players
        .filter((p) => tiebreakIds.includes(p._id))
        .map((p) => p.name),
      /** True while a tie-break decider is being written or raced. */
      isShowdown:
        room.status === "tiebreak" || room.status === "showdown",
      /** This round ended by unanimous VOTE TO MOVE ON, not by being solved. */
      skippedRound: !!room.skippedRound,
      question: question
        ? {
            initials: {
              hero: question.heroInitial,
              heroine: question.heroineInitial,
              movie: question.movieInitial,
              song: question.songInitial,
            },
            values: {
              hero: valueFor("hero"),
              heroine: valueFor("heroine"),
              movie: valueFor("movie"),
              song: valueFor("song"),
            },
          }
        : null,
      // The creator's cheat sheet — everyone holds it once the round is over.
      answerKey: holdsAnswerKey && question
        ? {
            hero: question.hero,
            heroine: question.heroine,
            movie: question.movie,
            song: question.song,
          }
        : null,
      /**
       * The room's live miss feed: every WRONG guess made this round, oldest
       * first. Correct guesses are NEVER listed here — they stay private to
       * the player who found them. This is the only public guess information
       * in the game: player + category + wrong text, never the answer.
       */
      wrongGuesses: guesses
        .filter((g) => g.status === "wrong")
        .map((g) => ({
          id: g._id,
          playerId: g.playerId,
          playerName: g.playerName,
          category: (g.category ?? "movie") as Category,
          text: g.text,
          normalized: g.normalized || normalizeAnswer(g.text),
          createdAt: g.createdAt,
        })),
      /** The viewer's own nine chances, board and clue. Never anyone else's. */
      entry: myEntry
        ? {
            lives: myEntry.lives,
            revealed: revealedMe,
            guesses: myEntry.guesses,
            status: myEntry.status,
            score: myEntry.score,
            placement: myEntry.placement ?? null,
            chancesUsed,
            clue: myEntry.clue,
            clueCategory: myEntry.clueCategory ?? null,
            clueRequested: myEntry.clueRequested,
            clueEligible: chancesUsed >= CLUE_UNLOCK_USED,
            canRequestClue:
              myEntry.status === "playing" &&
              chancesUsed >= CLUE_UNLOCK_USED &&
              !myEntry.clueRequested &&
              myEntry.clue === "",
          }
        : null,
      /**
       * Who guessed what. Nobody is a judge any more, so a guess is private to
       * the person who made it — nobody else's typing leaks.
       */
      guesses: guesses
        .filter((g) => g.playerId === me?._id)
        .map((g) => ({
          id: g._id,
          category: (g.category ?? "movie") as Category,
          text: g.text,
          status: g.status,
          playerName: g.playerName,
          isMine: !!me && g.playerId === me._id,
          createdAt: g.createdAt,
        })),
      /**
       * Where everyone stands — progress counts and chances only. Nobody sees
       * another player's board, solved or not.
       */
      entries: entries.map((entry) => {
        return {
          playerId: entry.playerId,
          playerName: entry.playerName,
          lives: entry.lives,
          revealed: revealedOf(entry),
          status: entry.status,
          score: entry.score,
          placement: entry.placement ?? null,
          guesses: entry.guesses,
          clueRequested: entry.clueRequested,
          clue: isCreator ? entry.clue : "",
          isMine: entry.playerId === me?._id,
        };
      }),
      /**
       * Live vote-to-skip state. `voters` lists every eligible player with
       * whether they have voted — never a yes/no, because there is none: this
       * is a unanimous agreement to move on, not a contest.
       */
      voting: {
        /** True while votes are still being collected for a live question. */
        open: votingOpen,
        /** True when this round ended by unanimous vote, not by solving it. */
        skipped: !!room.skippedRound,
        eligibleCount: eligibleIds.length,
        votedCount: votedIds.length,
        /** Most recent vote — `voteSkipIds` is append-ordered. */
        lastVoterId:
          votedIds.length > 0 ? votedIds[votedIds.length - 1] : null,
        iVoted: !!me && votedIds.includes(me._id),
        canVote:
          votingOpen &&
          !!me &&
          eligibleIds.includes(me._id) &&
          !votedIds.includes(me._id),
        voters,
      },
      me: me ? { id: me._id, name: me.name, isCreator, isHost } : null,
      players: players.map((p) => ({
        id: p._id,
        name: p.name,
        points: p.points,
        solves: p.solves ?? 0,
        correct: p.correct,
        attempts: p.attempts,
        cluesUsed: p.cluesUsed,
        isCreator: p._id === room.creatorId,
        isHost: p._id === hostId,
      })),
    };
  },
});

/* ------------------------------------------------------------------ */
/* Round flow                                                          */
/* ------------------------------------------------------------------ */

/** The host opens the game — every player will write exactly one question. */
export const startGame = mutation({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const player = await playerByToken(ctx, token);
    const room = await ctx.db.get(player.roomId);
    if (!room) throw new ConvexError("Room not found.");
    // Only from the lobby: a finished game must be reset so nobody carries a
    // stale board or a half-used set of chances into the new tournament.
    if (room.status !== "lobby") {
      throw new ConvexError(
        room.status === "finished"
          ? "Use \"Run it back\" to start a fresh tournament."
          : "The game is already running.",
      );
    }

    const players = await playersInRoom(ctx, room._id);
    if (players.length < 2) {
      throw new ConvexError("Share your invite link — you need a friend to play.");
    }
    if (players[0]._id !== player._id) {
      throw new ConvexError("Only the room host can start the game.");
    }

    await ctx.db.patch(room._id, {
      status: "creating",
      round: 1,
      roundsTotal: players.length,
      creatorId: players[0]._id,
      question: null,
      tiebreakIds: [],
      eligibleVoterIds: [],
      voteSkipIds: [],
      skippedRound: false,
    });
  },
});

/**
 * The round's creator writes ONE question with four answers of their own
 * choosing: hero, heroine, movie and song.
 *
 * The movie library is only a head start — the creator can pick a row to
 * prefill the four fields, edit any of them afterwards, or skip the library
 * entirely and type a film nobody has heard of. Whatever they send back is the
 * authoritative answer, so from this moment on validation is entirely
 * automatic: the creator never judges, scores or approves anything again.
 */
export const submitQuestion = mutation({
  args: {
    token: v.string(),
    /** Set when the creator picked from the movie library. */
    movieId: v.optional(v.string()),
    /** Hand-typed fallback when a title is not in the library. */
    hero: v.optional(v.string()),
    heroine: v.optional(v.string()),
    movie: v.optional(v.string()),
    song: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const player = await playerByToken(ctx, args.token);
    const room = await ctx.db.get(player.roomId);
    if (!room) throw new ConvexError("Room not found.");
    if (room.creatorId !== player._id) {
      throw new ConvexError("Only this round's question creator can write it.");
    }
    const showdown = room.status === "tiebreak";
    if (room.status !== "creating" && !showdown) {
      throw new ConvexError("A question is already in play.");
    }

    // The creator's own entries are authoritative. A library pick only fills
    // in whatever they left blank, so an edit made on the form always wins.
    const picked = args.movieId ? findMovieById(args.movieId) : null;
    const hero = (args.hero ?? "").trim() || (picked?.hero ?? "");
    const heroine = (args.heroine ?? "").trim() || (picked?.heroine ?? "");
    const movie = (args.movie ?? "").trim() || (picked?.movie ?? "");
    const song = (args.song ?? "").trim() || (picked?.songs[0] ?? "");

    if (!hero || !heroine || !movie || !song) {
      throw new ConvexError("Fill in the hero, heroine, movie and song.");
    }
    if (
      movie.length > 80 ||
      song.length > 80 ||
      hero.length > 60 ||
      heroine.length > 60
    ) {
      throw new ConvexError("One of those entries is too long.");
    }

    const players = await playersInRoom(ctx, room._id);
    const tiedIds = room.tiebreakIds ?? [];
    // In a tie-break only the players who are level on points race for it.
    const guessers = players.filter(
      (p) => p._id !== player._id && (!showdown || tiedIds.includes(p._id)),
    );
    if (guessers.length === 0) {
      throw new ConvexError("Share your invite link — you need a friend to play.");
    }

    const now = Date.now();
    // A brand-new, fully independent board + nine chances for each guesser.
    for (const guesser of guessers) {
      const existing = await entryFor(ctx, room._id, room.round, guesser._id);
      if (existing) continue;
      await ctx.db.insert("roundEntries", {
        roomId: room._id,
        round: room.round,
        playerId: guesser._id,
        playerName: guesser.name,
        lives: MAX_LIVES,
        revealed: emptyRevealed(),
        guesses: 0,
        clueRequested: false,
        clue: "",
        clueCategory: null,
        status: "playing",
        score: 0,
        completedAt: null,
        createdAt: now + guessers.indexOf(guesser),
      });
    }

    const questionId = crypto.randomUUID();
    const aliases = buildAliases(picked, { hero, heroine, movie, song });

    await ctx.db.patch(room._id, {
      status: showdown ? "showdown" : "playing",
      question: {
        questionId,
        movieId: picked?.id,
        creatorId: player._id,
        hero: hero.slice(0, 60),
        heroine: heroine.slice(0, 60),
        movie: movie.slice(0, 80),
        song: song.slice(0, 80),
        heroInitial: initialOf(hero),
        heroineInitial: initialOf(heroine),
        movieInitial: initialOf(movie),
        songInitial: initialOf(song),
        aliases: {
          hero: aliases.hero.slice(0, 12),
          heroine: aliases.heroine.slice(0, 12),
          movie: aliases.movie.slice(0, 12),
          song: aliases.song.slice(0, 12),
        },
      },
      /**
       * Freeze this question's voters the instant it goes live: the creator
       * plus every player guessing it. A vote to skip needs ALL of them, and
       * nobody who arrives later can change that list.
       */
      eligibleVoterIds: [player._id, ...guessers.map((g) => g._id)],
      voteSkipIds: [],
      skippedRound: false,
    });

    return { questionId };
  },
});

/**
 * One guess aimed at ONE part — validated and settled entirely on the server.
 *
 * Two visibility rules, and they are completely different:
 *
 *   • WRONG   → one KOLLYWOOD letter burns and the guess TEXT itself becomes
 *               a public clue (player + category + wrong text on the room's
 *               miss feed). The actual answer is NEVER revealed — not to the
 *               room, not even to the player who missed. Misses never solve
 *               or lock a part for anyone.
 *   • CORRECT → the answer is handed back only to the guesser; every other
 *               board still shows "?" for that part until the round ends.
 *
 * Repeats are server-authoritative: a normalized guess this player already
 * made for this part is ignored — no chance spent, no feed spam — and a
 * replayed submissionId (double-click, second tab) is answered from the row
 * the first request already wrote. Closing all four parts stamps a finishing
 * position and pays its points immediately, so no browser can talk its way
 * to a better score.
 */
export const submitGuess = mutation({
  args: {
    token: v.string(),
    category: categoryValidator,
    text: v.string(),
    /** Idempotency key — the same submission is only ever processed once. */
    submissionId: v.optional(v.string()),
  },
  handler: async (ctx, { token, category, text, submissionId }) => {
    // Nothing undefined or empty ever reaches a database call. The validator
    // already narrows `category`, but the token and the guess text are checked
    // here so a malformed call fails with a plain, controlled message.
    if (!token.trim()) throw new ConvexError("Your seat expired. Rejoin the room.");
    if (!CATEGORY_ORDER.includes(category)) {
      throw new ConvexError("Pick which part you're guessing first.");
    }
    if (!text.trim()) throw new ConvexError("Type your guess first.");

    const player = await playerByToken(ctx, token);
    const room = await ctx.db.get(player.roomId);
    if (!room) throw new ConvexError("Room not found.");
    if (room.status !== "playing" && room.status !== "showdown") {
      // A stale tab firing after the whistle must never touch score or state.
      throw new ConvexError(
        room.status === "roundComplete" || room.status === "finished"
          ? "ROUND HAS ENDED — no more guesses for this question."
          : "No question is in play.",
      );
    }
    const question = room.question;
    if (!question) throw new ConvexError("No question is in play.");
    if (room.creatorId === player._id) {
      throw new ConvexError("You wrote this question — you sit this one out.");
    }

    const entry = await entryFor(ctx, room._id, room.round, player._id);
    if (!entry) throw new ConvexError("You are not guessing this question.");

    // Every guess this player has made on this question — the single source
    // of truth for idempotency and repeated-guess detection.
    const mine = await ctx.db
      .query("guesses")
      .withIndex("by_room_round_player", (q) =>
        q
          .eq("roomId", room._id)
          .eq("round", room.round)
          .eq("playerId", player._id),
      )
      .collect();

    // The same request replayed (double-click / second tab): answer from the
    // row the first one already wrote instead of processing it again.
    if (submissionId) {
      const replayed = mine.find((g) => g.submissionId === submissionId);
      if (replayed) {
        const replayCorrect = replayed.status === "correct";
        const replayCategory = (replayed.category ?? category) as Category;
        return {
          correct: replayCorrect,
          category: replayCategory,
          answer: replayCorrect ? answerFor(question, replayCategory) : null,
          solved: entry.status === "solved",
          placement: entry.placement ?? null,
          score: entry.score,
          lives: entry.lives,
          remaining: entry.lives,
        };
      }
    }

    if (entry.status === "solved") {
      throw new ConvexError(
        "🎉 YOU SOLVED THE MOVIE! Waiting for the other players...",
      );
    }
    if (entry.status === "failed" || entry.lives <= 0) {
      throw new ConvexError("NO CHANCES LEFT — you can watch the remaining round.");
    }
    const label = CATEGORY_LABELS[category];
    // A part is locked the moment THIS player has it — no farming, no repeats.
    if (revealedOf(entry)[category]) {
      throw new ConvexError(`✓ ${label} already solved.`);
    }

    const clean = cleanGuess(text);
    const normalized = normalizeAnswer(clean);

    // Repeated guess by THIS player for THIS part (case, spacing, punctuation
    // and marks all folded away) → ignored: no chance spent, no broadcast.
    const prior = mine.find(
      (g) =>
        g.category === category &&
        (g.normalized || normalizeAnswer(g.text)) === normalized,
    );
    if (prior) {
      throw new ConvexError(
        prior.status === "correct"
          ? `✓ ${label} already solved.`
          : `You've already guessed "${clean}" for ${label}. Try a different answer.`,
      );
    }

    const correct = gradeGuess(question, category, clean);
    const now = Date.now();

    await ctx.db.insert("guesses", {
      roomId: room._id,
      round: room.round,
      questionId: question.questionId,
      playerId: player._id,
      playerName: player.name,
      category,
      text: clean,
      normalized,
      submissionId,
      status: correct ? "correct" : "wrong",
      createdAt: now,
    });
    await ctx.db.patch(player._id, { attempts: player.attempts + 1 });

    let revealed = revealedOf(entry);
    let solved = false;
    let placement: number | null = entry.placement ?? null;
    let score = entry.score;
    let lives = entry.lives;

    if (correct) {
      // Private progress: this discovery is written to MY board only and is
      // never broadcast — nobody else is told the part was found, or by whom.
      revealed = { ...revealed, [category]: true };
      solved = boardComplete(revealed);

      if (solved) {
        // Closing the board earns a placement, paid the instant it lands.
        const roundEntries = await entriesForRound(ctx, room._id, room.round);
        placement =
          roundEntries.filter(
            (e) => e.status === "solved" && e._id !== entry._id,
          ).length + 1;
        score = scoreForPlacement(placement);
      }

      await ctx.db.patch(player._id, {
        correct: player.correct + 1,
        points: player.points + (solved ? score - entry.score : 0),
        solves: (player.solves ?? 0) + (solved ? 1 : 0),
      });
      await ctx.db.patch(entry._id, {
        revealed,
        guesses: entry.guesses + 1,
        status: solved ? "solved" : "playing",
        score,
        placement: solved ? (placement ?? undefined) : entry.placement,
        completedAt: solved ? now : null,
      });
    } else {
      // The miss is public, the answer is not: the guess row itself feeds the
      // room's miss feed, one letter burns, and the part stays wide open.
      lives = Math.max(0, entry.lives - 1);
      await ctx.db.patch(entry._id, {
        lives,
        guesses: entry.guesses + 1,
        status: lives === 0 ? "failed" : "playing",
        completedAt: lives === 0 ? now : null,
      });
    }

    // Only the fresh row tells us whether everyone is done.
    const fresh = await ctx.db.get(room._id);
    if (fresh) await settleRound(ctx, fresh);

    return {
      correct,
      category,
      /** The answer itself, handed back only on a correct guess. */
      answer: correct ? answerFor(question, category) : null,
      solved,
      placement,
      score,
      lives,
      /** Chances this player still has on this board, not chances spent. */
      remaining: lives,
    };
  },
});

/**
 * 🗳 VOTE TO MOVE ON — the safe alternative ending for a question nobody can
 * crack.
 *
 * One vote per eligible player, and the round only moves on when EVERY
 * eligible player has voted. There is no majority: three of four is not
 * enough, and nobody — not even the question's author — can force a skip on
 * their own.
 *
 * A skipped round ends exactly like any other: the answers are revealed, NO
 * placement points are awarded (a skipped round simply doesn't pay, so scores
 * stay exactly as they were), and the creator rotation hands the next question
 * to the next player.
 *
 * Race protection: the whole handler runs in ONE Convex transaction, and the
 * transition is guarded on the round still being live. Two players voting at
 * the same instant can never start the next round twice — the loser of the
 * race re-reads a closed round and does nothing. A round that gets solved the
 * normal way first clears its votes, so the answer can never be skipped away
 * after it has been earned.
 */
export const voteToSkipRound = mutation({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    if (!token.trim()) {
      throw new ConvexError("Your seat expired. Rejoin the room.");
    }
    const player = await playerByToken(ctx, token);
    const room = await ctx.db.get(player.roomId);
    if (!room) throw new ConvexError("Room not found.");

    const votes = room.voteSkipIds ?? [];
    const live = room.status === "playing" || room.status === "showdown";

    // The round has already ended (solved, skipped, or the game is over).
    // A late vote is ignored rather than counted — it must never be a step
    // towards starting a second next round.
    if (!live || !room.question) {
      return {
        voted: false,
        skipped: !!room.skippedRound,
        voteCount: votes.length,
        eligibleCount: votes.length,
      };
    }

    const players = await playersInRoom(ctx, room._id);
    const entries = await entriesForRound(ctx, room._id, room.round);
    const eligible = eligibleOf(
      room,
      entries.map((e) => e.playerId),
      players.map((p) => p._id),
    );

    // Only the players frozen into this round may vote — a late arrival only
    // ever watches this one.
    if (!eligible.includes(player._id)) {
      throw new ConvexError("You joined this round late — no vote to cast.");
    }
    // One vote per player, enforced here and not just by the disabled button.
    if (votes.includes(player._id)) {
      throw new ConvexError("You've already voted to move on.");
    }

    const nextVotes = [...votes, player._id];
    // Count only votes from players still in the room, so a seat that left can
    // never hold the round open forever.
    const unanimous = eligible.every((id) => nextVotes.includes(id));

    if (!unanimous) {
      await ctx.db.patch(room._id, { voteSkipIds: nextVotes });
      return {
        voted: true,
        skipped: false,
        voteCount: nextVotes.length,
        eligibleCount: eligible.length,
      };
    }

    // THE LAST VOTE → the round is abandoned. Close voting, mark it skipped so
    // the reveal can say so, award nothing, and hand the clapperboard on.
    await ctx.db.patch(room._id, {
      voteSkipIds: nextVotes,
      skippedRound: true,
    });
    await finishRound(ctx, room);

    return {
      voted: true,
      skipped: true,
      voteCount: nextVotes.length,
      eligibleCount: eligible.length,
    };
  },
});

/** A player who has burned five of their own chances may ask for a clue. */
export const requestClue = mutation({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const player = await playerByToken(ctx, token);
    const room = await ctx.db.get(player.roomId);
    if (!room) throw new ConvexError("Room not found.");
    if (room.status !== "playing" && room.status !== "showdown") {
      throw new ConvexError("No question is in play.");
    }

    const entry = await entryFor(ctx, room._id, room.round, player._id);
    if (!entry) throw new ConvexError("You are not guessing this question.");
    if (entry.status !== "playing") {
      throw new ConvexError("You have already finished this question.");
    }
    if (entry.clue) throw new ConvexError("Your clue is already on screen.");
    if (entry.clueRequested) throw new ConvexError("You already asked for a clue.");
    if (MAX_LIVES - entry.lives < CLUE_UNLOCK_USED) {
      throw new ConvexError(`A clue unlocks after ${CLUE_UNLOCK_USED} chances spent.`);
    }

    await ctx.db.patch(entry._id, { clueRequested: true });
  },
});

/** The creator answers ONE player's clue request. Nobody else sees it. */
export const giveClue = mutation({
  args: {
    token: v.string(),
    playerId: v.id("players"),
    category: categoryValidator,
    text: v.string(),
  },
  handler: async (ctx, { token, playerId, category, text }) => {
    const creator = await playerByToken(ctx, token);
    const room = await ctx.db.get(creator.roomId);
    if (!room) throw new ConvexError("Room not found.");
    if (room.creatorId !== creator._id) {
      throw new ConvexError("Only this round's question creator can drop a clue.");
    }
    if (room.status !== "playing" && room.status !== "showdown") {
      throw new ConvexError("No question is in play.");
    }

    const entry = await entryFor(ctx, room._id, room.round, playerId);
    if (!entry) throw new ConvexError("That player is not in this round.");
    if (entry.clue) throw new ConvexError("That player already has their clue.");
    if (!entry.clueRequested && MAX_LIVES - entry.lives < CLUE_UNLOCK_USED) {
      throw new ConvexError("That player hasn't reached the clue yet.");
    }
    if (revealedOf(entry)[category]) {
      throw new ConvexError("That part is already on their board.");
    }

    const clue = text.trim().replace(/\s+/g, " ");
    if (!clue) throw new ConvexError("Type a clue first.");
    if (clue.length > 140) throw new ConvexError("Keep the clue under 140 characters.");

    await ctx.db.patch(entry._id, { clue, clueCategory: category });
    await ctx.db.patch(creator._id, { cluesUsed: creator.cluesUsed + 1 });
  },
});

/**
 * The round is done — hand the question-writing job to the next player in the
 * rotation. Nobody has to be "on the hook": any player in the room can roll
 * the clapperboard forward, and the room auto-advances on its own if nobody
 * touches it.
 */
export const startNextRound = mutation({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const player = await playerByToken(ctx, token);
    const room = await ctx.db.get(player.roomId);
    if (!room) throw new ConvexError("Room not found.");
    if (room.status !== "roundComplete") {
      throw new ConvexError("This round hasn't finished yet.");
    }

    const players = await playersInRoom(ctx, room._id);
    const next = players[creatorIndex(room.round + 1, room.roundsTotal)];
    if (!next) throw new ConvexError("Nobody is left to write the next question.");

    await ctx.db.patch(room._id, {
      round: room.round + 1,
      creatorId: next._id,
      status: "creating",
      question: null,
      // A brand-new round starts with a clean voting slate.
      eligibleVoterIds: [],
      voteSkipIds: [],
      skippedRound: false,
    });
  },
});

/** After the final round, the host can wipe the board and run it back. */
export const restartGame = mutation({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const player = await playerByToken(ctx, token);
    const room = await ctx.db.get(player.roomId);
    if (!room) throw new ConvexError("Room not found.");
    if (room.status !== "finished") {
      throw new ConvexError("Finish the game before starting a new one.");
    }

    const players = await playersInRoom(ctx, room._id);
    if (players[0] && players[0]._id !== player._id) {
      throw new ConvexError("Only the room host can start a new game.");
    }

    const entries = await ctx.db
      .query("roundEntries")
      .withIndex("by_room", (q) => q.eq("roomId", room._id))
      .collect();
    for (const entry of entries) await ctx.db.delete(entry._id);

    const guesses = await ctx.db
      .query("guesses")
      .withIndex("by_room", (q) => q.eq("roomId", room._id))
      .collect();
    for (const guess of guesses) await ctx.db.delete(guess._id);

    for (const p of players) {
      await ctx.db.patch(p._id, {
        points: 0,
        solves: 0,
        correct: 0,
        attempts: 0,
        cluesUsed: 0,
      });
    }

    await ctx.db.patch(room._id, {
      status: "lobby",
      round: 1,
      roundsTotal: 0,
      creatorId: null,
      question: null,
      tiebreakIds: [],
      eligibleVoterIds: [],
      voteSkipIds: [],
      skippedRound: false,
    });
  },
});
