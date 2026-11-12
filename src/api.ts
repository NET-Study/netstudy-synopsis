import { invoke } from "@tauri-apps/api/core";

export interface Verse {
  book: string;
  chapter: number;
  verse: number;
  text: string;
}

export class PassageError extends Error {}

const memory = new Map<string, Verse[]>();
const pending = new Map<string, Promise<Verse[]>>();

/** Fetch a passage such as "Matthew 5:3-12" through the Rust side, which caches it on disk. */
export async function fetchPassage(reference: string): Promise<Verse[]> {
  const hit = memory.get(reference);
  if (hit) return hit;
  const inflight = pending.get(reference);
  if (inflight) return inflight;

  const request = invoke<Verse[]>("passage", { reference })
    .then((verses) => {
      if (!Array.isArray(verses) || verses.length === 0) {
        throw new PassageError("No verses came back for that reference.");
      }
      const clean = verses.map((v) => ({
        book: v.book,
        chapter: v.chapter,
        verse: v.verse,
        text: normalize(v.text),
      }));
      memory.set(reference, clean);
      return clean;
    })
    .catch((error: unknown) => {
      const message =
        typeof error === "string"
          ? error
          : error instanceof Error
            ? error.message
            : "Couldn't load this passage.";
      throw new PassageError(message);
    })
    .finally(() => pending.delete(reference));

  pending.set(reference, request);
  return request;
}

function normalize(text: string): string {
  return text.replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
}

/** A human label for a verse span, e.g. "Matthew 5:3". */
export function verseLabel(book: string, chapter: number, verse: number): string {
  return `${book} ${chapter}:${verse}`;
}

/** Split a reference into its part before and after the colon so counts are easy. */
export function parseReference(reference: string): { book: string; chapters: string } {
  const index = reference.lastIndexOf(" ");
  if (index < 0) return { book: reference, chapters: "" };
  return { book: reference.slice(0, index), chapters: reference.slice(index + 1) };
}

export function verseCountLabel(count: number): string {
  return count === 1 ? "1 verse" : `${count} verses`;
}
