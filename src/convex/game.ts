import { v } from "convex/values";
import { isAnswerCorrect } from "../lib/answers";
import {
  answerAliasesFor,
  findMovieById,
  typedAliases,
  type AnswerCategory,
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

function isComplete(revealed: Revealed): boolean {
  return CATEGORY_ORDER.every((c) => revealed[c]);
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
  if (!name) throw new Error("Enter a player name to continue.");
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
  if (!text) throw new Error("Type your guess first.");
  if (text.length > MAX_GUESS) throw new Error("That guess is too long.");
  return text;
}

async function roomByCode(ctx: Ctx, code: string): Promise<Doc<"rooms">> {
  const normalized = code.trim().toUpperCase();
  const room = await ctx.db
    .query("rooms")
    .withIndex("by_code", (q) => q.eq("code", normalized))
    .unique();
  if (!room) {
    throw new Error("No room found for that code. Check it and try again.");
  }
  return room;
}

async function playerByToken(ctx: Ctx, token: string): Promise<Doc<"players">> {
  const player = await ctx.db
    .query("players")
    .withIndex("by_token", (q) => q.eq("token", token))
    .unique();
  if (!player) throw new Error("Your seat expired. Rejoin the room.");
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

/** Flip the room out of "playing" the moment the last player finishes. */
async function settleRound(ctx: MutationCtx, room: Doc<"rooms">) {
  const entries = await entriesForRound(ctx, room._id, room.round);
  if (entries.length === 0) return;
  if (entries.some((e) => e.status === "playing")) return;

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
      });
      return;
    }
    await ctx.db.patch(room._id, { status: "finished" });
    return;
  }

  await ctx.db.patch(room._id, { status: "roundComplete" });
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
    if (!code) throw new Error("Could not open a room right now. Try again.");

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
      throw new Error("This room is full (12 players max).");
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
    if (!room) throw new Error("Room not found.");
    // Only from the lobby: a finished game must be reset so nobody carries a
    // stale board or a half-used set of chances into the new tournament.
    if (room.status !== "lobby") {
      throw new Error(
        room.status === "finished"
          ? "Use \"Run it back\" to start a fresh tournament."
          : "The game is already running.",
      );
    }

    const players = await playersInRoom(ctx, room._id);
    if (players.length < 2) {
      throw new Error("Share your invite link — you need a friend to play.");
    }
    if (players[0]._id !== player._id) {
      throw new Error("Only the room host can start the game.");
    }

    await ctx.db.patch(room._id, {
      status: "creating",
      round: 1,
      roundsTotal: players.length,
      creatorId: players[0]._id,
      question: null,
      tiebreakIds: [],
    });
  },
});

/**
 * The round's creator writes ONE question by picking a movie (and a song from
 * it). The library row is the source of truth for all four answers and for the
 * approved aliases, so from this moment on validation is entirely automatic —
 * the creator never judges, scores or approves anything again.
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
    if (!room) throw new Error("Room not found.");
    if (room.creatorId !== player._id) {
      throw new Error("Only this round's question creator can write it.");
    }
    const showdown = room.status === "tiebreak";
    if (room.status !== "creating" && !showdown) {
      throw new Error("A question is already in play.");
    }

    // A library pick wins outright; anything typed in is used verbatim.
    const picked = args.movieId ? findMovieById(args.movieId) : null;
    const hero = (picked?.hero ?? args.hero ?? "").trim();
    const heroine = (picked?.heroine ?? args.heroine ?? "").trim();
    const movie = (picked?.movie ?? args.movie ?? "").trim();
    const song = (args.song ?? "").trim() || picked?.songs[0] || "";

    if (!hero || !heroine || !movie || !song) {
      throw new Error("Pick a movie (and one of its songs) to set the question.");
    }
    if (
      movie.length > 80 ||
      song.length > 80 ||
      hero.length > 60 ||
      heroine.length > 60
    ) {
      throw new Error("One of those entries is too long.");
    }
    if (picked && !picked.songs.includes(song)) {
      throw new Error("Pick one of that movie's songs.");
    }

    const players = await playersInRoom(ctx, room._id);
    const tiedIds = room.tiebreakIds ?? [];
    // In a tie-break only the players who are level on points race for it.
    const guessers = players.filter(
      (p) => p._id !== player._id && (!showdown || tiedIds.includes(p._id)),
    );
    if (guessers.length === 0) {
      throw new Error("Share your invite link — you need a friend to play.");
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
    const aliases = picked
      ? answerAliasesFor(picked, song)
      : typedAliases({ hero, heroine, movie, song });

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
    });

    return { questionId };
  },
});

/**
 * One guess aimed at ONE part — validated and settled entirely on the server.
 *
 * Correct → that part is revealed and locked for THIS player only. Wrong →
 * one KOLLYWOOD letter burns, this player only. Closing all four parts stamps
 * a finishing position and pays its points immediately, so nobody's browser
 * can talk its way to a better score.
 */
export const submitGuess = mutation({
  args: {
    token: v.string(),
    category: categoryValidator,
    text: v.string(),
  },
  handler: async (ctx, { token, category, text }) => {
    const player = await playerByToken(ctx, token);
    const room = await ctx.db.get(player.roomId);
    if (!room) throw new Error("Room not found.");
    if (room.status !== "playing" && room.status !== "showdown") {
      throw new Error("No question is in play.");
    }
    const question = room.question;
    if (!question) throw new Error("No question is in play.");
    if (room.creatorId === player._id) {
      throw new Error("You wrote this question — you sit this one out.");
    }

    const entry = await entryFor(ctx, room._id, room.round, player._id);
    if (!entry) throw new Error("You are not guessing this question.");
    if (entry.status !== "playing") {
      throw new Error("You have already finished this question.");
    }
    // A solved part is locked — no farming it for extra points.
    if (revealedOf(entry)[category]) {
      throw new Error("That part is already on your board.");
    }

    const clean = cleanGuess(text);
    const correct = gradeGuess(question, category, clean);
    const now = Date.now();

    await ctx.db.insert("guesses", {
      roomId: room._id,
      round: room.round,
      playerId: player._id,
      playerName: player.name,
      category,
      text: clean,
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
      revealed = { ...revealed, [category]: true };
      solved = isComplete(revealed);

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
      remaining: Math.max(0, MAX_LIVES - lives),
    };
  },
});

/** A player who has burned five of their own chances may ask for a clue. */
export const requestClue = mutation({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const player = await playerByToken(ctx, token);
    const room = await ctx.db.get(player.roomId);
    if (!room) throw new Error("Room not found.");
    if (room.status !== "playing" && room.status !== "showdown") {
      throw new Error("No question is in play.");
    }

    const entry = await entryFor(ctx, room._id, room.round, player._id);
    if (!entry) throw new Error("You are not guessing this question.");
    if (entry.status !== "playing") {
      throw new Error("You have already finished this question.");
    }
    if (entry.clue) throw new Error("Your clue is already on screen.");
    if (entry.clueRequested) throw new Error("You already asked for a clue.");
    if (MAX_LIVES - entry.lives < CLUE_UNLOCK_USED) {
      throw new Error(`A clue unlocks after ${CLUE_UNLOCK_USED} chances spent.`);
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
    if (!room) throw new Error("Room not found.");
    if (room.creatorId !== creator._id) {
      throw new Error("Only this round's question creator can drop a clue.");
    }
    if (room.status !== "playing" && room.status !== "showdown") {
      throw new Error("No question is in play.");
    }

    const entry = await entryFor(ctx, room._id, room.round, playerId);
    if (!entry) throw new Error("That player is not in this round.");
    if (entry.clue) throw new Error("That player already has their clue.");
    if (!entry.clueRequested && MAX_LIVES - entry.lives < CLUE_UNLOCK_USED) {
      throw new Error("That player hasn't reached the clue yet.");
    }
    if (revealedOf(entry)[category]) {
      throw new Error("That part is already on their board.");
    }

    const clue = text.trim().replace(/\s+/g, " ");
    if (!clue) throw new Error("Type a clue first.");
    if (clue.length > 140) throw new Error("Keep the clue under 140 characters.");

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
    if (!room) throw new Error("Room not found.");
    if (room.status !== "roundComplete") {
      throw new Error("This round hasn't finished yet.");
    }

    const players = await playersInRoom(ctx, room._id);
    const next = players[creatorIndex(room.round + 1, room.roundsTotal)];
    if (!next) throw new Error("Nobody is left to write the next question.");

    await ctx.db.patch(room._id, {
      round: room.round + 1,
      creatorId: next._id,
      status: "creating",
      question: null,
    });
  },
});

/** After the final round, the host can wipe the board and run it back. */
export const restartGame = mutation({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const player = await playerByToken(ctx, token);
    const room = await ctx.db.get(player.roomId);
    if (!room) throw new Error("Room not found.");
    if (room.status !== "finished") {
      throw new Error("Finish the game before starting a new one.");
    }

    const players = await playersInRoom(ctx, room._id);
    if (players[0] && players[0]._id !== player._id) {
      throw new Error("Only the room host can start a new game.");
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
    });
  },
});
