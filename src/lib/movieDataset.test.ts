import { describe, expect, it } from "bun:test";
import { findMovieById, searchMovies } from "./movieDataset";

describe("searchMovies — empty search must not produce a query", () => {
  it("returns [] for an empty string", () => {
    expect(searchMovies("")).toEqual([]);
  });

  it("returns [] for whitespace-only strings", () => {
    expect(searchMovies("   ")).toEqual([]);
    expect(searchMovies(" \t ")).toEqual([]);
  });

  it("always returns a real array (never undefined/null)", () => {
    expect(Array.isArray(searchMovies(""))).toBe(true);
    expect(Array.isArray(searchMovies("   "))).toBe(true);
    expect(Array.isArray(searchMovies("xyzrandommovie"))).toBe(true);
  });
});

describe("searchMovies — partial and case-insensitive matching", () => {
  const partials = ["G", "Gh", "Ghi", "Ghilli", "ghilli", "GHILLI", "ghil"];

  for (const query of partials) {
    it(`finds Ghilli for "${query}"`, () => {
      const titles = searchMovies(query, 6).map((entry) => entry.movie);
      expect(titles).toContain("Ghilli");
    });
  }

  it("returns nothing for a movie that does not exist", () => {
    expect(searchMovies("xyzrandommovie")).toEqual([]);
  });

  it("honours the limit", () => {
    expect(searchMovies("v", 3).length).toBeLessThanOrEqual(3);
    expect(searchMovies("v", 3).length).toBeGreaterThan(0);
  });
});

describe("searchMovies — real field names used by the form", () => {
  const [ghilli] = searchMovies("Ghilli", 6);

  it("exposes movie / hero / heroine / songs / id", () => {
    expect(ghilli.movie).toBe("Ghilli");
    expect(ghilli.hero).toBe("Vijay");
    expect(ghilli.heroine).toBe("Trisha");
    expect(Array.isArray(ghilli.songs)).toBe(true);
    expect(ghilli.songs[0]).toBe("Appadi Podu");
    expect(typeof ghilli.id).toBe("string");
    expect(ghilli.id.length).toBeGreaterThan(0);
  });

  it("resolves back through findMovieById (the key React uses)", () => {
    const record = findMovieById(ghilli.id);
    expect(record).not.toBeNull();
    expect(record?.movie).toBe(ghilli.movie);
    expect(findMovieById("not-a-real-id")).toBeNull();
  });
});
