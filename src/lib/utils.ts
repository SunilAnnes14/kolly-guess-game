import { ConvexError } from "convex/values";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Strip Convex error plumbing so players just see the plain message. */
export function friendlyError(err: unknown): string {
  // Expected rejections arrive as ConvexError with the message on `data` — the
  // cleanest source, and the one that stays intact even in production.
  if (err instanceof ConvexError) {
    const data = err.data;
    const carried =
      typeof data === "string"
        ? data
        : data && typeof data === "object" && "message" in data
          ? String((data as { message?: unknown }).message ?? "")
          : "";
    if (carried.trim()) return carried.trim();
  }

  const raw = err instanceof Error ? err.message : String(err);
  const clean = raw
    .replace(/^Uncaught (Error|ConvexError): /, "")
    .split(" [CONVEX")[0]
    .split("\n")[0]
    .trim();
  return clean || "Something went wrong. Please try again.";
}
