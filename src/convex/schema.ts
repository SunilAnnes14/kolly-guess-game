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

    // KOLLYWOOD game rooms — one private room per invite code (e.g. /room/ABX729).
    rooms: defineTable({
      code: v.string(),
      status: v.union(
        v.literal("lobby"), // invite / waiting screen
        v.literal("creating"), // question creator is filling in the 4 clues
        v.literal("playing"), // guessing round in progress
        v.literal("won"), // someone guessed correctly
        v.literal("over"), // all 9 KOLLYWOOD letters gone
      ),
      // The question creator (also the judge). Seeded after the first player
      // is inserted, hence nullable.
      creatorId: v.nullable(v.id("players")),
      // Whose turn it is to guess (null while nobody can guess).
      currentTurnId: v.nullable(v.id("players")),
      // The guess waiting for the creator's approval.
      pendingGuessId: v.nullable(v.id("guesses")),
      round: v.number(),
      lives: v.number(), // KOLLYWOOD letters remaining (starts at 9)
      wrongGuesses: v.number(), // total wrong guesses this round
      clue: v.string(), // "" = no clue yet, one clue per question
      question: v.nullable(
        v.object({
          hero: v.string(),
          heroine: v.string(),
          movie: v.string(), // the answer — never sent to guessers
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
      joinedAt: v.number(),
      correct: v.number(), // correct guesses across rounds
      attempts: v.number(), // guesses submitted across rounds
      points: v.number(),
      cluesUsed: v.number(), // times this player spent a clue as creator
    })
      .index("by_room", ["roomId"])
      .index("by_token", ["token"]),

    guesses: defineTable({
      roomId: v.id("rooms"),
      playerId: v.id("players"),
      playerName: v.string(),
      round: v.number(),
      text: v.string(),
      status: v.union(
        v.literal("pending"), // waiting for the creator to judge
        v.literal("correct"),
        v.literal("wrong"),
      ),
      createdAt: v.number(),
    }).index("by_room_round", ["roomId", "round"])
  },
  {
    schemaValidation: false,
  },
);

export default schema;
