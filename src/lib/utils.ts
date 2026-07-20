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

export function avatarTone(name: string) {
  const tones = ["violet", "blue", "pink", "green", "amber"];
  const sum = [...name].reduce((total, char) => total + char.charCodeAt(0), 0);
  return tones[sum % tones.length];
}

export function getSongKey(title: string, artist: string) {
  return `${title.trim().toLowerCase()}|${artist.trim().toLowerCase()}`;
}

export function normalizeCoverUrl(url?: string | null, size = 600) {
  const value = typeof url === "string" ? url.trim() : "";
  if (!value) return null;
  return value
    .replace("{w}", String(size))
    .replace("{h}", String(size))
    .replace("{f}", "jpg")
    .replace(/\/\d+x\d+(bb|cc)?\.(jpg|jpeg|png|webp)$/i, `/${size}x${size}bb.jpg`);
}

export function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "알 수 없는 오류가 발생했어요.";
}
