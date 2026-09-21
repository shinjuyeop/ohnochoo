import type { z } from "zod";

const MAX_AGE = 7 * 24 * 60 * 60 * 1000;

export function draftKey(memberId: string, form: string) {
  return `ohnochoo:draft:${memberId}:${form}`;
}

export function readDraft<T>(key: string, schema: z.ZodType<T>): T | null {
  try {
    const stored = JSON.parse(localStorage.getItem(key) || "null");
    if (!stored || typeof stored.savedAt !== "number" || Date.now() - stored.savedAt > MAX_AGE) return null;
    const result = schema.safeParse(stored.value);
    return result.success ? result.data : null;
  } catch { return null; }
}

export function writeDraft(key: string, value: unknown) {
  try { localStorage.setItem(key, JSON.stringify({ savedAt: Date.now(), value })); }
  catch { /* Storage can be unavailable; the open form still keeps its values. */ }
}

export function clearDraft(key: string) {
  try { localStorage.removeItem(key); } catch { /* Best effort in private browsing. */ }
}
