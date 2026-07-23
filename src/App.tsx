import { StoreProvider, useLinkInterceptor, useRoute } from "./lib/store";
import { AuthProvider } from "./lib/auth";
import { AppShell } from "./components/Layout";
import Home from "./pages/Home";
import Articles from "./pages/Articles";
import Archive from "./pages/Archive";
import Committee from "./pages/Committee";
import Contact from "./pages/Contact";
import Donate from "./pages/Donate";
import About from "./pages/About";
import Admin from "./pages/Admin";
import Teachers from "./pages/Teachers";
import Students from "./pages/Students";

function NotFound() {
  return (
    <AppShell active="/">
      <div className="card-panel text-center">
        <p className="text-6xl">🧭</p>
        <h1 className="mt-3 text-3xl font-extrabold text-slate-900">Page not found</h1>
        <p className="mt-2 text-slate-500">
          The page you're looking for doesn't exist.
        </p>
        <a
          href="/"
          className="mt-5 inline-flex rounded-lg bg-brand px-5 py-2.5 text-sm font-black text-white transition hover:bg-brand-700"
        >
          ← Back to Home
        </a>
      </div>
    </AppShell>
  );
}

function Router() {
  useLinkInterceptor();
  const route = useRoute();
  const [first, second] = route.segments;

  switch (first) {
    case undefined:
      return <Home />;
    case "articles":
      return <Articles id={second} />;
    case "archive":
      return <Archive />;
    case "committee":
      return <Committee />;
    case "contact":
      return <Contact />;
    case "donate":
      return <Donate />;
    case "about":
      return <About />;
    case "admin":
      return <Admin />;
    case "teachers":
      return <Teachers />;
    case "students":
      return <Students />;
    default:
      return <NotFound />;
  }
}

export default function App() {
  return (
    <StoreProvider>
      <AuthProvider>
        <Router />
      </AuthProvider>
    </StoreProvider>
  );
}
