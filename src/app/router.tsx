import { createBrowserRouter } from "react-router-dom";
import { AppShell } from "../components/AppShell";
import { RouteErrorPage } from "../components/AppErrorBoundary";
import { HomePage } from "../pages/HomePage";
import { OnochooPage } from "../pages/OnochooPage";
import { MutigoeulPage } from "../pages/MutigoeulPage";
import { AlbumsPage } from "../pages/AlbumsPage";
import { SettingsPage } from "../pages/SettingsPage";
import { RecordsPage } from "../pages/RecordsPage";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <AppShell />,
    errorElement: <RouteErrorPage />,
    children: [
      { index: true, Component: HomePage },
      { path: "onochoo", Component: OnochooPage },
      { path: "mutigoeul", Component: MutigoeulPage },
      { path: "albums", Component: AlbumsPage },
      { path: "settings", Component: SettingsPage },
      { path: "records", Component: RecordsPage },
    ],
  },
]);
