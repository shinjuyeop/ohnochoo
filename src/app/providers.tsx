import { QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "react-router-dom";
import { ProfileProvider } from "../features/profile/ProfileContext";
import { ToastProvider } from "../components/ui/Toast";
import { ProfileGate } from "../components/ProfileGate";
import { RealtimeSync } from "../hooks/useClubData";
import { queryClient } from "../lib/queryClient";
import { router } from "./router";
import { usePwaLifecycle } from "../hooks/usePwaLifecycle";
import { AdminAuthProvider } from "../features/admin/AdminAuthContext";

function PwaLifecycle() {
  const { updateAvailable, applyUpdate } = usePwaLifecycle();
  if (!updateAvailable) return null;
  return <aside className="update-banner" aria-label="앱 업데이트"><div><b>새 버전이 준비됐어요</b><span>작성을 마친 뒤 업데이트해 주세요.</span></div><button onClick={applyUpdate}>업데이트</button></aside>;
}

export function AppProviders() {
  return (
    <QueryClientProvider client={queryClient}>
      <PwaLifecycle />
      <ToastProvider>
        <AdminAuthProvider>
          <ProfileProvider>
            <RealtimeSync />
            <ProfileGate><RouterProvider router={router} /></ProfileGate>
          </ProfileProvider>
        </AdminAuthProvider>
      </ToastProvider>
    </QueryClientProvider>
  );
}
