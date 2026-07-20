import type { PlaylistSong } from "../types";
import { errorMessage } from "./utils";

async function jsonRequest<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  const data = (await response.json().catch(() => ({}))) as T & { error?: string };
  if (!response.ok) throw new Error(data.error || `요청 실패 (${response.status})`);
  return data;
}

export async function fetchPlaylist(url: string) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 10000);
  try {
    const result = await jsonRequest<{ songs?: PlaylistSong[] }>(
      `/api/fetch-playlist?url=${encodeURIComponent(url)}&t=${Date.now()}`,
      { cache: "no-store", signal: controller.signal },
    );
    return Array.isArray(result.songs) ? result.songs : [];
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error("Apple Music 응답 시간이 너무 오래 걸려요.");
    }
    throw new Error(errorMessage(error));
  } finally {
    window.clearTimeout(timeout);
  }
}

export const postJson = <T>(url: string, body: unknown) =>
  jsonRequest<T>(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
