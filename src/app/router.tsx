import { createBrowserRouter } from "react-router-dom";
import { AppShell } from "../components/AppShell";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <AppShell />,
    children: [
      { index: true, lazy: async () => ({ Component: (await import("../pages/HomePage")).HomePage }) },
      { path: "onochoo", lazy: async () => ({ Component: (await import("../pages/OnochooPage")).OnochooPage }) },
      { path: "mutigoeul", lazy: async () => ({ Component: (await import("../pages/MutigoeulPage")).MutigoeulPage }) },
      { path: "settings", lazy: async () => ({ Component: (await import("../pages/SettingsPage")).SettingsPage }) },
    ],
  },
]);
