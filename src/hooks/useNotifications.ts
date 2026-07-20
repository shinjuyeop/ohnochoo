import { useCallback, useEffect, useState } from "react";
import { postJson } from "../lib/api";
import type { Member } from "../types";

type Profile = Pick<Member, "id" | "name"> | null;
type NotificationState = { status: string; hint: string; enabled: boolean; blocked: boolean };

const defaultState: NotificationState = {
  status: "알림 상태 확인 중",
  hint: "이 기기에서 푸시 알림 상태를 확인하고 있어요.",
  enabled: false,
  blocked: false,
};

function supportsPush() {
  return "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

function urlBase64ToUint8Array(value: string) {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const raw = window.atob((value + padding).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from([...raw].map((character) => character.charCodeAt(0)));
}

async function saveSubscription(memberId: string, subscription: PushSubscription) {
  await postJson("/api/save-subscription", { memberId, subscription, userAgent: navigator.userAgent });
}

export function useNotifications(profile: Profile) {
  const [state, setState] = useState(defaultState);

  const refresh = useCallback(async () => {
    if (!profile) {
      setState({ status: "프로필이 필요해요", hint: "프로필을 선택하면 알림을 켤 수 있어요.", enabled: false, blocked: false });
      return;
    }
    if (!supportsPush()) {
      setState({ status: "알림 미지원", hint: "iPhone은 홈 화면에 추가한 앱에서 알림을 받을 수 있어요.", enabled: false, blocked: true });
      return;
    }
    if (Notification.permission === "denied") {
      setState({ status: "알림 차단됨", hint: "브라우저 또는 기기 설정에서 알림을 허용해 주세요.", enabled: false, blocked: true });
      return;
    }
    const registration = await navigator.serviceWorker.getRegistration("/");
    const subscription = registration ? await registration.pushManager.getSubscription() : null;
    setState(subscription
      ? { status: "알림 켜짐", hint: "새 곡, 평가, 리마인드 알림을 이 기기에서 받아요.", enabled: true, blocked: false }
      : { status: "알림 꺼짐", hint: "새 곡과 친구들의 평가 소식을 놓치지 마세요.", enabled: false, blocked: false });
  }, [profile]);

  useEffect(() => { void refresh(); }, [refresh]);

  useEffect(() => {
    if (!profile || !supportsPush() || Notification.permission !== "granted") return;
    void navigator.serviceWorker.getRegistration("/").then(async (registration) => {
      const subscription = registration ? await registration.pushManager.getSubscription() : null;
      if (subscription) await saveSubscription(profile.id, subscription);
      await refresh();
    }).catch(() => undefined);
  }, [profile, refresh]);

  const enable = async () => {
    if (!profile) throw new Error("먼저 프로필을 선택해 주세요.");
    if (!supportsPush()) throw new Error("이 브라우저에서는 푸시 알림을 지원하지 않아요.");
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      await refresh();
      throw new Error("알림 권한이 허용되지 않았어요.");
    }
    const { publicKey, error } = await fetch("/api/vapid-public-key", { cache: "no-store" }).then((response) => response.json());
    if (!publicKey) throw new Error(error || "서버 알림 키가 설정되지 않았어요.");
    const registration = (await navigator.serviceWorker.getRegistration("/"))
      || (await navigator.serviceWorker.register("/service-worker.js", { scope: "/" }));
    const existing = await registration.pushManager.getSubscription();
    const subscription = existing || await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    });
    await saveSubscription(profile.id, subscription);
    await refresh();
  };

  const disable = async () => {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    if (subscription) {
      await postJson("/api/remove-subscription", { endpoint: subscription.endpoint });
      await subscription.unsubscribe();
    }
    await refresh();
  };

  const sendTest = async () => {
    if (!profile) throw new Error("프로필을 찾지 못했어요.");
    return postJson<{ count?: number }>("/api/send-test-notification", { memberId: profile.id });
  };

  return { ...state, refresh, enable, disable, sendTest };
}
