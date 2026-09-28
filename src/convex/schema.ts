import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { Infer, v } from "convex/values";

// default user roles. can add / remove based on the project as needed
export const ROLES = {
  ADMIN: "admin",
  USER: "user",
  MEMBER: "member",
} as const;

export const roleValidator = v.union(
  v.literal(ROLES.ADMIN),
  v.literal(ROLES.USER),
  v.literal(ROLES.MEMBER),
);
export type Role = Infer<typeof roleValidator>;

// The four independent parts of a KOLLYWOOD question. Every guess and clue is
// scoped to one of these.
export const categoryValidator = v.union(
  v.literal("hero"),
  v.literal("heroine"),
  v.literal("movie"),
  v.literal("song"),
);
export type Category = Infer<typeof categoryValidator>;

/** Which of the four parts a player has discovered. */
export const revealedValidator = v.object({
  hero: v.boolean(),
  heroine: v.boolean(),
  movie: v.boolean(),
  song: v.boolean(),
});
export type Revealed = Infer<typeof revealedValidator>;

/** Somebody's progress on the current question. */
export const progressValidator = v.union(
  v.literal("playing"), // still guessing
  v.literal("solved"), // all four parts discovered
  v.literal("failed"), // ran out of the nine KOLLYWOOD chances
);
export type Progress = Infer<typeof progressValidator>;

const schema = defineSchema(
  {
    // default auth tables using convex auth.
    ...authTables, // do not remove or modify

    // the users table is the default users table that is brought in by the authTables
    users: defineTable({
      name: v.optional(v.string()), // name of the user. do not remove
      image: v.optional(v.string()), // image of the user. do not remove
      email: v.optional(v.string()), // email of the user. do not remove
      emailVerificationTime: v.optional(v.number()), // email verification time. do not remove
      isAnonymous: v.optional(v.boolean()), // is the user anonymous. do not remove

      role: v.optional(roleValidator), // role of the user. do not remove
    }).index("email", ["email"]), // index for the email. do not remove or modify

    /**
     * KOLLYWOOD game rooms — one private room per invite code (e.g. /room/ABX729).
     *
     * A game is a rotation: every player writes exactly ONE question, and
     * everyone else guesses that same question with their own independent nine
     * chances. `round` walks the rotation; `roundsTotal` is fixed when the
     * host starts the game.
     */
    rooms: defineTable({
      code: v.string(),
      status: v.union(
        v.literal("lobby"), // invite screen, waiting for the host to start
        v.literal("creating"), // this round's creator is writing the question
        v.literal("playing"), // the question is live, everyone guesses
        v.literal("roundComplete"), // everyone finished this question
        v.literal("finished"), // all rounds played — final leaderboard
      ),
      // Who wrote the CURRENT round's question. Null in the lobby.
      creatorId: v.nullable(v.id("players")),
      round: v.number(), // 1-based
      roundsTotal: v.number(), // 0 until the game starts
      question: v.nullable(
        v.object({
          hero: v.string(),
          heroine: v.string(),
          movie: v.string(),
          song: v.string(),
          heroInitial: v.string(),
          heroineInitial: v.string(),
          movieInitial: v.string(),
          songInitial: v.string(),
        }),
      ),
      createdAt: v.number(),
    }).index("by_code", ["code"]),

    players: defineTable({
      roomId: v.id("rooms"),
      token: v.string(), // secret kept in the player's browser — identifies them
      name: v.string(),
      joinedAt: v.number(), // also the creator rotation order
      points: v.number(), // tournament total across every round
      solves: v.optional(v.number()), // questions fully cracked
      correct: v.number(), // parts discovered
      attempts: v.number(), // guesses submitted
      cluesUsed: v.number(), // clues handed out as creator
    })
      .index("by_room", ["roomId"])
      .index("by_token", ["token"]),

    /**
     * One row per player per round — that player's OWN nine chances, board and
     * clue. Nothing here is ever shared with another player.
     */
    roundEntries: defineTable({
      roomId: v.id("rooms"),
      round: v.number(),
      playerId: v.id("players"),
      playerName: v.string(),
      lives: v.number(), // own KOLLYWOOD letters, starts at 9 every round
      revealed: revealedValidator, // own discoveries
      guesses: v.number(), // own guess count
      clueRequested: v.boolean(),
      clue: v.string(), // "" = none — only this player ever sees it
      clueCategory: v.nullable(categoryValidator),
      status: progressValidator,
      score: v.number(), // this round's score
      completedAt: v.nullable(v.number()),
      createdAt: v.number(),
    })
      .index("by_room", ["roomId"])
      .index("by_room_round", ["roomId", "round"])
      .index("by_room_round_player", ["roomId", "round", "playerId"]),

    guesses: defineTable({
      roomId: v.id("rooms"),
      round: v.number(),
      playerId: v.id("players"),
      playerName: v.string(),
      category: categoryValidator, // what the player was guessing
      text: v.string(),
      status: v.union(
        v.literal("pending"), // waiting for the creator to judge
        v.literal("correct"),
        v.literal("wrong"),
      ),
      createdAt: v.number(),
    })
      .index("by_room", ["roomId"])
      .index("by_room_round", ["roomId", "round"]),
  },
  {
    schemaValidation: false,
  },
);

export default schema;
