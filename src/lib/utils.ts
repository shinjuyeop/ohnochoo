export function cn(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

export function formatKoreanDate(value: string, includeTime = false) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    ...(includeTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  }).format(date);
}

export function formatCompactDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("ko-KR", { month: "short", day: "numeric" }).format(date);
}

export function getInitials(name: string) {
  return [...name.trim()].slice(0, 1).join("").toUpperCase() || "?";
}

export function getSongKey(title: string, artist: string) {
  return `${title.trim().toLowerCase()}|${artist.trim().toLowerCase()}`;
}

export function normalizeCoverUrl(url?: string | null, size = 600) {
  const value = typeof url === "string" ? url.trim() : "";
  if (!value) return null;
  const normalized = value
    .replace("{w}", String(size))
    .replace("{h}", String(size))
    .replace("{f}", "jpg")
    .replace("{c}", "bb");
  // Only Apple's artwork CDN supports this resizing convention.
  return /^https:\/\/(?:[a-z0-9-]+\.)*mzstatic\.com\//i.test(normalized)
    ? normalized.replace(/\/\d+x\d+(bb|cc)?(?:-\d+)?\.(jpg|jpeg|png|webp)(?=[?#]|$)/i, `/${size}x${size}bb.jpg`)
    : normalized;
}

export function coverSrcSet(url?: string | null) {
  const small = normalizeCoverUrl(url, 64);
  if (!small || small === normalizeCoverUrl(url, 960)) return undefined;
  if (!/^https:\/\/(?:[a-z0-9-]+\.)*mzstatic\.com\//i.test(small)) return undefined;
  return [64, 128, 192, 320, 480, 640, 960].map((size) => `${normalizeCoverUrl(url, size)} ${size}w`).join(", ");
}

export function errorMessage(error: unknown) {
  if (error && typeof error === "object" && "message" in error && typeof error.message === "string") return error.message;
  return "알 수 없는 오류가 발생했어요.";
}
