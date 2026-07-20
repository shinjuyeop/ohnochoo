import { createBrowserRouter } from "react-router-dom";
import { AppShell } from "../components/AppShell";
import { RouteErrorPage } from "../components/AppErrorBoundary";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <AppShell />,
    errorElement: <RouteErrorPage />,
    children: [
      { index: true, lazy: async () => ({ Component: (await import("../pages/HomePage")).HomePage }) },
      { path: "onochoo", lazy: async () => ({ Component: (await import("../pages/OnochooPage")).OnochooPage }) },
      { path: "mutigoeul", lazy: async () => ({ Component: (await import("../pages/MutigoeulPage")).MutigoeulPage }) },
      { path: "settings", lazy: async () => ({ Component: (await import("../pages/SettingsPage")).SettingsPage }) },
    ],
  },
]);
