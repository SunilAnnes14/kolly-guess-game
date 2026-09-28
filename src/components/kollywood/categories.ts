/**
 * The four independent parts of a KOLLYWOOD question.
 *
 * Kept in sync with the server's `categoryValidator` — one order, one set of
 * labels, shared by the board, the guess desk and the clue form so the "+"
 * always reads the same way.
 */
export type Category = "hero" | "heroine" | "movie" | "song";

export const CATEGORY_ORDER: Category[] = ["hero", "heroine", "movie", "song"];

export const CATEGORY_META: Record<
  Category,
  {
    label: string;
    icon: string;
    /** Short prompt shown on the guess desk. */
    ask: string;
    /** Input placeholder, e.g. "Which movie is this?". */
    placeholder: string;
  }
> = {
  hero: {
    label: "Hero",
    icon: "👨",
    ask: "Who is the hero?",
    placeholder: "Vijay",
  },
  heroine: {
    label: "Heroine",
    icon: "👩",
    ask: "Who is the heroine?",
    placeholder: "Trisha",
  },
  movie: {
    label: "Movie",
    icon: "🎬",
    ask: "Which movie is this?",
    placeholder: "Ghilli",
  },
  song: {
    label: "Song",
    icon: "🎵",
    ask: "Name the song.",
    placeholder: "Appadi Podu",
  },
};
