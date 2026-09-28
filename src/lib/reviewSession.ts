export interface ReviewSession {
  ids: string[];
  completed: string[];
  startedAt: number;
}

export function readReviewSession(key: string): ReviewSession | null {
  try {
    const value = JSON.parse(sessionStorage.getItem(key) || "null");
    if (!value || !Array.isArray(value.ids) || !value.ids.length || !Array.isArray(value.completed)
      || !Number.isFinite(value.startedAt) || value.startedAt > Date.now()
      || Date.now() - value.startedAt > 24 * 60 * 60 * 1000
      || ![...value.ids, ...value.completed].every((id) => typeof id === "string")) return null;
    const ids = [...new Set<string>(value.ids)];
    return { ids, completed: [...new Set<string>(value.completed)].filter((id) => ids.includes(id)), startedAt: value.startedAt };
  } catch { return null; }
}

export function reviewProgress(session: ReviewSession | null, pendingIds: string[]) {
  if (!session) return { remaining: [], completed: 0, total: 0, skipped: 0 };
  const done = new Set(session.completed);
  const pending = new Set(pendingIds);
  const remaining = session.ids.filter((id) => !done.has(id) && pending.has(id));
  return { remaining, completed: done.size, total: session.ids.length, skipped: session.ids.length - done.size - remaining.length };
}
