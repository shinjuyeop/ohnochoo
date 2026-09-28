const DAY = 86_400_000;
const KOREA_OFFSET = 9 * 60 * 60 * 1000;

/** Monday's date in Korea, independent of the device's time zone. */
export function koreanWeekStart(now = new Date()): string {
  const local = new Date(now.getTime() + KOREA_OFFSET);
  const daysSinceMonday = (local.getUTCDay() + 6) % 7;
  return new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate()) - daysSinceMonday * DAY).toISOString().slice(0, 10);
}

export function themeDateRange(weekStart: string): string {
  const start = new Date(`${weekStart}T00:00:00Z`);
  const end = new Date(start.getTime() + 6 * DAY);
  const format = (date: Date) => `${date.getUTCMonth() + 1}.${date.getUTCDate()}`;
  return `${format(start)} — ${format(end)}`;
}
