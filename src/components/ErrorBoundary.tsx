import { Component, type ErrorInfo, type ReactNode } from "react";

/**
 * Catches render-time errors anywhere in the app so the user never sees a blank
 * screen. Offers a "reset" button that clears local storage (which can become
 * corrupt / oversized from base64 image uploads) and reloads.
 */
interface State {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { hasError: false, message: "" };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error?.message || "Something went wrong." };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // eslint-disable-next-line no-console
    console.error("NLCC render error:", error, info);
  }

  reset = () => {
    try {
      // Clear all NLCC local/session data and reload fresh.
      localStorage.removeItem("nlccWebsiteDataV6");
      localStorage.removeItem("nlccWebsiteSeedVersion");
      localStorage.removeItem("nlccAdminUserV7");
      sessionStorage.removeItem("nlccAdminLoggedInV5");
    } catch {
      /* ignore */
    }
    window.history.replaceState({}, "", "/");
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-slate-900 via-brand-700 to-brand p-6 text-center">
        <img
          src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ctext y='.9em' font-size='90'%3E🏔️%3C/text%3E%3C/svg%3E"
          alt=""
          className="mb-5 h-16 w-16"
        />
        <h1 className="text-2xl font-black text-white">NLCC couldn't load</h1>
        <p className="mt-2 max-w-md text-sm text-white/75">
          Something went wrong while loading the site. This is usually caused by
          old or oversized data stored in your browser. Resetting should fix it.
        </p>
        <button
          type="button"
          onClick={this.reset}
          className="mt-6 rounded-lg bg-white px-6 py-3 text-sm font-black text-brand shadow-lg transition hover:bg-white/90"
        >
          Reset &amp; reload
        </button>
        <p className="mt-4 max-w-md text-xs text-white/50">{this.state.message}</p>
      </div>
    );
  }
}
