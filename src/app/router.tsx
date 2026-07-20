import { createBrowserRouter } from "react-router-dom";
import { AppShell } from "../components/AppShell";
import { HomePage } from "../pages/HomePage";
import { OnochooPage } from "../pages/OnochooPage";
import { MutigoeulPage } from "../pages/MutigoeulPage";
import { SettingsPage } from "../pages/SettingsPage";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <AppShell />,
    children: [
      { index: true, element: <HomePage /> },
      { path: "onochoo", element: <OnochooPage /> },
      { path: "mutigoeul", element: <MutigoeulPage /> },
      { path: "settings", element: <SettingsPage /> },
    ],
  },
]);
