import type { api } from "@/convex/_generated/api";
import type { FunctionReturnType } from "convex/server";

/** The live room snapshot returned by `api.game.getRoom`. */
export type RoomState = NonNullable<FunctionReturnType<typeof api.game.getRoom>>;
export type RoomPlayer = RoomState["players"][number];
export type RoomGuess = RoomState["guesses"][number];
