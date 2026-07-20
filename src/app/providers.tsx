import { QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "react-router-dom";
import { ProfileProvider } from "../features/profile/ProfileContext";
import { ToastProvider } from "../components/ui/Toast";
import { ProfileGate } from "../components/ProfileGate";
import { RealtimeSync } from "../hooks/useClubData";
import { queryClient } from "../lib/queryClient";
import { router } from "./router";
import { usePwaLifecycle } from "../hooks/usePwaLifecycle";

function PwaLifecycle() {
  usePwaLifecycle();
  return null;
}

export function AppProviders() {
  return (
    <QueryClientProvider client={queryClient}>
      <PwaLifecycle />
      <ToastProvider>
        <ProfileProvider>
          <RealtimeSync />
          <ProfileGate><RouterProvider router={router} /></ProfileGate>
        </ProfileProvider>
      </ToastProvider>
    </QueryClientProvider>
  );
}
