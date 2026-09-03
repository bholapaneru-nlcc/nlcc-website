import { useEffect, useState } from "react";
import { useGoogleAuth, checkAuthorization } from "../lib/googleAuth";

/* --------------------------- google login button -------------------------- */

export function GoogleLoginButton({ onSuccess, onError, label = "Sign in with Google" }: { onSuccess: () => void; onError?: (error: string) => void; label?: string }) {
  const { signInWithGoogle } = useGoogleAuth();
  const [busy, setBusy] = useState(false);

  const handleClick = async () => {
    setBusy(true);
    const result = await signInWithGoogle();
    setBusy(false);
    if (result.ok && result.user) {
      onSuccess();
    } else if (result.error && onError) {
      onError(result.error);
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={busy}
      className="inline-flex w-full items-center justify-center gap-3 rounded-xl border-2 border-slate-200 bg-white px-6 py-3 text-sm font-bold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 disabled:opacity-50"
    >
      {busy ? (
        <span className="text-slate-400">Connecting…</span>
      ) : (
        <>
          <svg className="h-5 w-5" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
          {label}
        </>
      )}
    </button>
  );
}

/* --------------------------- portal login screen -------------------------- */

const ACCESS_DENIED = "We're having trouble signing you in to your account. If this problem persists, please contact your administrator for assistance.";

export function PortalLogin({
  portalName,
  portalIcon,
  role,
  gradient,
  onSuccess,
}: {
  portalName: string;
  portalIcon: string;
  role: "admin" | "teacher" | "student";
  gradient: string;
  onSuccess: (email: string, name: string) => void;
}) {
  const { user, loading, configured } = useGoogleAuth();
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(false);

  const handleLogin = async () => {
    if (!user) return;
    setChecking(true);
    setError("");
    const authorized = await checkAuthorization(user.email, role);
    setChecking(false);
    if (authorized) {
      onSuccess(user.email, user.displayName || user.email);
    } else {
      setError(ACCESS_DENIED);
    }
  };

  // Auto-check if already signed in via Google
  useEffect(() => {
    if (!user || checking || error) return;
    let active = true;
    setChecking(true);
    checkAuthorization(user.email, role).then((authorized) => {
      if (!active) return;
      setChecking(false);
      if (authorized) {
        onSuccess(user.email, user.displayName || user.email);
      } else {
        setError(ACCESS_DENIED);
      }
    });
    return () => { active = false; };
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading || checking) {
    return (
      <div className={`flex min-h-screen items-center justify-center bg-gradient-to-br ${gradient} p-6`}>
        <span className="text-sm font-bold text-white/70">{checking ? "Verifying access…" : "Loading…"}</span>
      </div>
    );
  }

  return (
    <div className={`flex min-h-screen items-center justify-center bg-gradient-to-br ${gradient} p-6`}>
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <span className="text-5xl">{portalIcon}</span>
          <h1 className="mt-4 text-2xl font-black text-white">{portalName}</h1>
        </div>
        <div className="space-y-4 rounded-2xl bg-white p-8 shadow-2xl">
          {error ? <p className="rounded-lg bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">{error}</p> : null}
          {!configured ? (
            <p className="rounded-lg bg-amber-50 px-4 py-3 text-sm font-bold text-amber-700">
              Firebase is not configured. Set up Firebase credentials in .env to enable Google Sign-In.
            </p>
          ) : null}
          <GoogleLoginButton onSuccess={handleLogin} onError={(err) => setError(err)} />
          <p className="text-center text-xs text-slate-400">Sign in with your @nlccuk.com Google account.</p>
        </div>
        <p className="mt-4 text-center">
          <a href="/" className="text-sm font-bold text-white/80 hover:underline">← Back to website</a>
        </p>
      </div>
    </div>
  );
}


