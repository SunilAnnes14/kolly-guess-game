# Kolly Guess Game

**The classic KOLLYWOOD paper game, played live with friends in the browser.**

Live: **[attividuuu.vercel.app](https://attividuuu.vercel.app/)**

One player picks a Tamil film and hides four things about it: the **hero**, the **heroine**, the **movie** and a **song**. Everyone else races to guess all four. Every wrong guess crosses off one letter of K-O-L-L-Y-W-O-O-D, so you get nine chances. Lose them all and you're out for that question.

## How a game works

1. **Create a private room** and share the invite code (for example `/room/ABX729`).
2. **Take turns asking.** Each player writes exactly one question, and the rotation continues until everyone has asked.
3. **Race to solve.** Everyone guesses the same question with their own independent nine chances, their own board and their own clue.
4. **Score by placement.** Finishing first pays 100 points, then 80, 60, 40 and 20. The tournament total decides the winner.
5. **Settle ties.** If the top scores are level when the game ends, only the tied players race a final tiebreak question.

Stuck players can ask the question's creator for a private clue, and the room can vote unanimously to skip a question.

## Fair play by design

- **Answers never reach a guesser's browser** until they've earned them. Every guess is validated on the server.
- **Matching is strict.** Guesses are normalized for case, spacing, punctuation, diacritics and "&" vs "and", then compared exactly against the answer and its approved aliases. There's no fuzzy matching, so "Ajith" can never pass for "Vijay".
- **The browser and the server run the same validation module**, so what you see is exactly what the server checks.
- **Scores are paid server-side** the moment a player finishes, so no client can claim points it didn't earn.

## Tech stack

| Layer | Tools |
|---|---|
| Frontend | React 19, TypeScript, Vite, React Router v7 |
| UI | Tailwind CSS v4, shadcn/ui (Radix), Framer Motion, Lucide icons |
| Backend | Convex (real-time database and server functions), Convex Auth (email OTP and guest sign-in) |

Game logic lives in `src/convex/game.ts` (rooms, rounds, guesses, clues, votes, scoring) and `src/lib/answers.ts` (answer normalization). The UI is in `src/components/kollywood/`.

## Run it locally

```bash
bun install
cp .env.example .env.local   # fill in your Convex deployment values
npx convex dev               # starts the Convex backend
bun run dev                  # starts the Vite dev server
```

## Author

**Sunil Annes S K** · [GitHub](https://github.com/SunilAnnes14) · [Kaggle](https://www.kaggle.com/sunilannessk)
