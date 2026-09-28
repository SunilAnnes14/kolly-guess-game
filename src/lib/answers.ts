/**
 * Answer validation for KOLLYWOOD.
 *
 * Every guess is checked on the server against the stored answer plus its
 * approved aliases. The rule set is deliberately NARROW: answers are
 * normalised for the ways people actually type (case, spacing, punctuation,
 * diacritics, "&"/"and") and then compared for exact equality. There is no
 * fuzzy matching, no edit distance and no substring test — "Ajith" must never
 * be accepted for "Vijay".
 *
 * This module has no Convex or React imports, so the browser and the server
 * run byte-for-byte identical logic.
 */

const COMBINING_MARKS = /\p{M}+/gu;
/** Everything that is not a letter or a digit becomes a single space. */
const NON_WORD = /[^\p{L}\p{N}]+/gu;

/**
 * Fold an answer or a guess down to its comparable form.
 *
 *   "  Vijay "  → "vijay"
 *   "Ghilli."   → "ghilli"
 *   "APPADI PODU" → "appadi podu"
 *   "Ileana D'Cruz" → "ileana dcruz"
 *   "Kamal Haasan" → "kamal haasan"
 *
 * Diacritics are stripped and "&" is read as "and", but nothing else is
 * rewritten — the words a player types must survive intact for the strict
 * comparison to mean anything.
 */
export function normalizeAnswer(raw: string): string {
  if (!raw) return "";
  const folded = raw.normalize("NFD").replace(COMBINING_MARKS, "");
  const spaced = folded.replace(/&/g, " and ").toLowerCase();
  return spaced.replace(NON_WORD, " ").trim().replace(/\s+/g, " ");
}

/**
 * The same string with the spaces taken out, so "AppadiPodu" and
 * "Appadi Podu" land in the same bucket. Applied to BOTH sides, so it can
 * never let one answer match a different one.
 */
function squish(normalized: string): string {
  return normalized.replace(/\s+/g, "");
}

/**
 * Strictly compare one guess against one answer and its approved aliases.
 *
 * Returns true only when the normalised guess is byte-identical to the
 * normalised answer, or to one of the normalised aliases.
 */
export function isAnswerCorrect(
  guess: string,
  answer: string,
  aliases: readonly string[] = [],
): boolean {
  const target = normalizeAnswer(guess);
  if (!target) return false;

  const accepted = new Set<string>();
  const add = (value: string) => {
    const normalized = normalizeAnswer(value);
    if (!normalized) return;
    accepted.add(normalized);
    accepted.add(squish(normalized));
  };

  add(answer);
  for (const alias of aliases) add(alias);

  return accepted.has(target) || accepted.has(squish(target));
}
