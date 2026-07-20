import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let clientPromise: Promise<SupabaseClient> | null = null;

async function createConfiguredClient() {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch("/api/config", { cache: "no-store", signal: controller.signal });
    if (!response.ok) throw new Error(`/api/config 응답 오류 (${response.status})`);
    const responseText = await response.text();
    let config: { supabaseUrl?: string; supabaseAnonKey?: string };
    try {
      config = JSON.parse(responseText) as typeof config;
    } catch {
      throw new Error("Supabase 설정 API가 올바른 JSON을 반환하지 않았어요. 개발 서버를 다시 시작해 주세요.");
    }
    if (!config.supabaseUrl || !config.supabaseAnonKey) {
      throw new Error("Supabase 환경 변수가 설정되지 않았어요.");
    }
    return createClient(config.supabaseUrl, config.supabaseAnonKey);
  } finally {
    window.clearTimeout(timeout);
  }
}

export function getSupabase() {
  clientPromise ??= createConfiguredClient();
  return clientPromise;
}
