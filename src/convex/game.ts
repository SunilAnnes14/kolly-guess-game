import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { mutation, query } from "./_generated/server";

/** Room codes look like ABX729 — no ambiguous 0/O or 1/I. */
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const CODE_LENGTH = 6;
/** K · O · L · L · Y · W · O · O · D */
export const MAX_LIVES = 9;
/** After this many wrong guesses the creator may drop a clue. */
export const CLUE_UNLOCK_AT = 5;
const MAX_PLAYERS = 12;
const MAX_NAME = 18;
const MAX_GUESS = 90;

type Ctx = QueryCtx | MutationCtx;

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

/** Everyone except the question creator, in join order — the guess rotation. */
function guessersOf(
  room: Doc<"rooms">,
  players: Doc<"players">[],
): Doc<"players">[] {
  return players.filter((p) => p._id !== room.creatorId);
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
      currentTurnId: null,
      pendingGuessId: null,
      round: 1,
      lives: MAX_LIVES,
      wrongGuesses: 0,
      clue: "",
      question: null,
      createdAt: now,
    });

    const token = crypto.randomUUID();
    const playerId = await ctx.db.insert("players", {
      roomId,
      token,
      name: clean,
      joinedAt: now,
      correct: 0,
      attempts: 0,
      points: 0,
      cluesUsed: 0,
    });
    // The room's first player becomes the question creator / judge.
    await ctx.db.patch(roomId, { creatorId: playerId });

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
        existing.some((p) => p.name.toLowerCase() === `${base} ${suffix}`.toLowerCase())
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
      joinedAt: Date.now(),
      correct: 0,
      attempts: 0,
      points: 0,
      cluesUsed: 0,
    });
    return { code: room.code, token, playerId, name: clean };
  },
});

/* ------------------------------------------------------------------ */
/* Read state                                                          */
/* ------------------------------------------------------------------ */

/**
 * The whole room, live. The answer (and the full hero/heroine/song names)
 * are only included for the question creator — and for everyone once the
 * round is revealed (won / over).
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
    const me = token
      ? (players.find((p) => p.token === token) ?? null)
      : null;
    const isCreator = !!me && me._id === room.creatorId;

    const questionVisible =
      room.question !== null &&
      (room.status === "playing" ||
        room.status === "won" ||
        room.status === "over");
    const revealAnswer =
      isCreator || room.status === "won" || room.status === "over";

    const guesses = questionVisible
      ? await ctx.db
          .query("guesses")
          .withIndex("by_room_round", (q) =>
            q.eq("roomId", room._id).eq("round", room.round),
          )
          .collect()
      : [];

    return {
      code: room.code,
      status: room.status,
      round: room.round,
      lives: room.lives,
      wrongGuesses: room.wrongGuesses,
      clue: room.clue,
      clueUnlocked: room.wrongGuesses >= CLUE_UNLOCK_AT && room.clue === "",
      hasPendingGuess: room.pendingGuessId !== null,
      myTurn:
        room.status === "playing" &&
        room.pendingGuessId === null &&
        !!me &&
        me._id === room.currentTurnId,
      question: room.question
        ? {
            initials: {
              hero: room.question.heroInitial,
              heroine: room.question.heroineInitial,
              movie: room.question.movieInitial,
              song: room.question.songInitial,
            },
            hero: questionVisible && revealAnswer ? room.question.hero : null,
            heroine:
              questionVisible && revealAnswer ? room.question.heroine : null,
            movie: questionVisible && revealAnswer ? room.question.movie : null,
            song: questionVisible && revealAnswer ? room.question.song : null,
          }
        : null,
      me: me
        ? { id: me._id, name: me.name, isCreator }
        : null,
      players: players.map((p) => ({
        id: p._id,
        name: p.name,
        points: p.points,
        correct: p.correct,
        attempts: p.attempts,
        cluesUsed: p.cluesUsed,
        isCreator: p._id === room.creatorId,
        isTurn: room.status === "playing" && p._id === room.currentTurnId,
      })),
      guesses: guesses
        .sort((a, b) => a.createdAt - b.createdAt)
        .map((g) => ({
          id: g._id,
          text: g.text,
          status: g.status,
          playerName: g.playerName,
          isMine: !!me && g.playerId === me._id,
          createdAt: g.createdAt,
        })),
    };
  },
});

/* ------------------------------------------------------------------ */
/* Round flow                                                          */
/* ------------------------------------------------------------------ */

export const startCreating = mutation({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const player = await playerByToken(ctx, token);
    const room = await ctx.db.get(player.roomId);
    if (!room) throw new Error("Room not found.");
    if (room.creatorId !== player._id) {
      throw new Error("Only the question creator can write the next question.");
    }
    if (room.status !== "lobby") {
      throw new Error("The question creator is busy right now.");
    }
    await ctx.db.patch(room._id, { status: "creating" });
  },
});

export const submitQuestion = mutation({
  args: {
    token: v.string(),
    hero: v.string(),
    heroine: v.string(),
    movie: v.string(),
    song: v.string(),
  },
  handler: async (ctx, args) => {
    const player = await playerByToken(ctx, args.token);
    const room = await ctx.db.get(player.roomId);
    if (!room) throw new Error("Room not found.");
    if (room.creatorId !== player._id) {
      throw new Error("Only the question creator can create a question.");
    }
    if (room.status !== "creating" && room.status !== "lobby") {
      throw new Error("A question is already in play.");
    }

    const hero = args.hero.trim();
    const heroine = args.heroine.trim();
    const movie = args.movie.trim();
    const song = args.song.trim();
    if (!hero || !heroine || !movie || !song) {
      throw new Error("Fill in all four clues to create the question.");
    }
    if (movie.length > 80 || song.length > 80 || hero.length > 60 || heroine.length > 60) {
      throw new Error("One of those entries is too long.");
    }

    const everyone = await playersInRoom(ctx, room._id);
    const rotation = guessersOf(room, everyone);
    if (rotation.length === 0) {
      throw new Error("Share your invite link — you need a friend to play.");
    }

    await ctx.db.patch(room._id, {
      status: "playing",
      question: {
        hero: hero.slice(0, 60),
        heroine: heroine.slice(0, 60),
        movie: movie.slice(0, 80),
        song: song.slice(0, 80),
        heroInitial: initialOf(hero),
        heroineInitial: initialOf(heroine),
        movieInitial: initialOf(movie),
        songInitial: initialOf(song),
      },
      lives: MAX_LIVES,
      wrongGuesses: 0,
      clue: "",
      pendingGuessId: null,
      currentTurnId: rotation[0]._id,
    });
  },
});

export const submitGuess = mutation({
  args: { token: v.string(), text: v.string() },
  handler: async (ctx, { token, text }) => {
    const player = await playerByToken(ctx, token);
    const room = await ctx.db.get(player.roomId);
    if (!room) throw new Error("Room not found.");
    if (room.status !== "playing") throw new Error("No round is in play.");
    if (room.creatorId === player._id) {
      throw new Error("You wrote this question — your friend guesses first.");
    }
    if (room.currentTurnId !== player._id) {
      throw new Error("It is not your turn yet.");
    }
    if (room.pendingGuessId !== null) {
      throw new Error("A guess is waiting to be judged.");
    }

    const clean = cleanGuess(text);
    const now = Date.now();
    const guessId = await ctx.db.insert("guesses", {
      roomId: room._id,
      playerId: player._id,
      playerName: player.name,
      round: room.round,
      text: clean,
      status: "pending",
      createdAt: now,
    });
    await ctx.db.patch(room._id, { pendingGuessId: guessId });
    await ctx.db.patch(player._id, { attempts: player.attempts + 1 });
  },
});

export const judgeGuess = mutation({
  args: { token: v.string(), guessId: v.id("guesses"), correct: v.boolean() },
  handler: async (ctx, { token, guessId, correct }) => {
    const player = await playerByToken(ctx, token);
    const room = await ctx.db.get(player.roomId);
    if (!room) throw new Error("Room not found.");
    if (room.creatorId !== player._id) {
      throw new Error("Only the question creator can judge guesses.");
    }
    if (room.status !== "playing" || room.pendingGuessId !== guessId) {
      throw new Error("That guess is no longer waiting.");
    }

    const guess = await ctx.db.get(guessId);
    if (!guess || guess.roomId !== room._id) throw new Error("Guess not found.");
    const guesser = await ctx.db.get(guess.playerId);
    if (!guesser) throw new Error("Guess player not found.");

    if (correct) {
      // Score rewards finishing with lives to spare.
      const gained = 300 + room.lives * 50;
      await ctx.db.patch(guessId, { status: "correct" });
      await ctx.db.patch(guesser._id, {
        correct: guesser.correct + 1,
        points: guesser.points + gained,
      });
      await ctx.db.patch(room._id, {
        status: "won",
        pendingGuessId: null,
        currentTurnId: null,
      });
      return;
    }

    const lives = Math.max(0, room.lives - 1);
    const wrongGuesses = room.wrongGuesses + 1;
    await ctx.db.patch(guessId, { status: "wrong" });

    if (lives === 0) {
      await ctx.db.patch(room._id, {
        lives: 0,
        wrongGuesses,
        pendingGuessId: null,
        currentTurnId: null,
        status: "over",
      });
      return;
    }

    // Pass the mic to the next guesser in the rotation.
    const everyone = await playersInRoom(ctx, room._id);
    const rotation = guessersOf(room, everyone);
    const index = rotation.findIndex((p) => p._id === guess.playerId);
    const next =
      index >= 0 ? rotation[(index + 1) % rotation.length] : rotation[0];
    await ctx.db.patch(room._id, {
      lives,
      wrongGuesses,
      pendingGuessId: null,
      currentTurnId: next ? next._id : null,
    });
  },
});

export const createClue = mutation({
  args: { token: v.string(), text: v.string() },
  handler: async (ctx, { token, text }) => {
    const player = await playerByToken(ctx, token);
    const room = await ctx.db.get(player.roomId);
    if (!room) throw new Error("Room not found.");
    if (room.creatorId !== player._id) {
      throw new Error("Only the question creator can drop a clue.");
    }
    if (room.status !== "playing") throw new Error("No round is in play.");
    if (room.wrongGuesses < CLUE_UNLOCK_AT) {
      throw new Error(`Clue unlocks after ${CLUE_UNLOCK_AT} wrong guesses.`);
    }
    if (room.clue) throw new Error("This question already used its clue.");

    const clue = text.trim().replace(/\s+/g, " ");
    if (!clue) throw new Error("Type a clue first.");
    if (clue.length > 140) throw new Error("Keep the clue under 140 characters.");

    await ctx.db.patch(room._id, { clue });
    await ctx.db.patch(player._id, { cluesUsed: player.cluesUsed + 1 });
  },
});

/** Win / game-over / lobby transitions — creator decides what happens next. */
export const advanceRound = mutation({
  args: {
    token: v.string(),
    mode: v.union(
      v.literal("replay"), // same question, fresh 9 lives
      v.literal("next"), // creator writes a new question
      v.literal("lobby"), // back to the invite screen
    ),
  },
  handler: async (ctx, { token, mode }) => {
    const player = await playerByToken(ctx, token);
    const room = await ctx.db.get(player.roomId);
    if (!room) throw new Error("Room not found.");
    if (room.creatorId !== player._id) {
      throw new Error("Only the question creator can start the next round.");
    }
    if (mode === "replay" && !room.question) {
      throw new Error("There is no question to replay.");
    }

    await ctx.db.patch(room._id, {
      status: mode === "replay" ? "playing" : mode === "next" ? "creating" : "lobby",
      question: mode === "replay" ? room.question : null,
      lives: MAX_LIVES,
      wrongGuesses: 0,
      clue: "",
      pendingGuessId: null,
      currentTurnId: null,
      round: room.round + 1,
    });

    if (mode === "replay") {
      const everyone = await playersInRoom(ctx, room._id);
      const rotation = guessersOf(room, everyone);
      await ctx.db.patch(room._id, {
        currentTurnId: rotation[0]?._id ?? null,
      });
    }
  },
});

/** The creator can hand the question-writing job to someone else between rounds. */
export const passCreator = mutation({
  args: { token: v.string(), playerId: v.id("players") },
  handler: async (ctx, { token, playerId }) => {
    const player = await playerByToken(ctx, token);
    const room = await ctx.db.get(player.roomId);
    if (!room) throw new Error("Room not found.");
    if (room.creatorId !== player._id) {
      throw new Error("Only the current question creator can pass it on.");
    }
    if (room.status === "playing") {
      throw new Error("Finish the round before passing the creator seat.");
    }
    const target = await ctx.db.get(playerId);
    if (!target || target.roomId !== room._id) {
      throw new Error("That player is not in this room.");
    }
    await ctx.db.patch(room._id, { creatorId: playerId });
  },
});
