import { AppProviders } from "./providers";
import { AppErrorBoundary } from "../components/AppErrorBoundary";
import { ThemeProvider } from "./ThemeContext";

export default function App() {
  return <ThemeProvider><AppErrorBoundary><AppProviders /></AppErrorBoundary></ThemeProvider>;
}
