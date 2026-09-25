import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Strip Convex error plumbing so players just see the plain message. */
export function friendlyError(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err);
  const clean = raw
    .replace(/^Uncaught (Error|ConvexError): /, "")
    .split(" [CONVEX")[0]
    .split("\n")[0]
    .trim();
  return clean || "Something went wrong. Please try again.";
}
