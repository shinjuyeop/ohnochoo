import { AppProviders } from "./providers";
import { AppErrorBoundary } from "../components/AppErrorBoundary";

export default function App() {
  return <AppErrorBoundary><AppProviders /></AppErrorBoundary>;
}
