import { ConvexError } from "convex/values";
import { describe, expect, it } from "bun:test";
import { friendlyError } from "./utils";

describe("friendlyError — application errors keep their message", () => {
  it("returns the string carried by a ConvexError", () => {
    expect(
      friendlyError(
        new ConvexError(
          `You've already guessed "ajith" for Heroine. Try a different answer.`,
        ),
      ),
    ).toBe(`You've already guessed "ajith" for Heroine. Try a different answer.`);
  });

  it("returns the message carried in a ConvexError payload", () => {
    expect(friendlyError(new ConvexError({ message: "No question is in play.", code: 7 }))).toBe(
      "No question is in play.",
    );
  });

  it("never falls back to the redacted generic 'Server Error' text", () => {
    const message = friendlyError(
      new ConvexError("ROUND HAS ENDED — no more guesses for this question."),
    );
    expect(message).toBe(
      "ROUND HAS ENDED — no more guesses for this question.",
    );
    expect(message).not.toContain("Server Error");
  });
});

describe("friendlyError — legacy / plain errors still get stripped", () => {
  it("strips the Uncaught + [CONVEX] plumbing", () => {
    expect(
      friendlyError(
        new Error(
          "Uncaught Error: Type your guess first. [CONVEX M(game:submitGuess)] [Request ID: 123]",
        ),
      ),
    ).toBe("Type your guess first.");
  });

  it("falls back to a readable message for unknown values", () => {
    expect(friendlyError("boom")).toBe("boom");
  });
});
