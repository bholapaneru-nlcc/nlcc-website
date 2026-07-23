import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { onAuthStateChanged, signInWithEmailAndPassword, signOut as fbSignOut } from "firebase/auth";
import { auth, isFirebaseConfigured } from "./firebase";

/* --------------------------------- auth ----------------------------------- */
//
// Real authentication with two modes:
//   • firebase — Firebase Auth (email/password). Used when credentials are set.
//                This is genuinely secure: users are created in the Firebase
//                console and verified against Firebase's servers.
//   • local    — a real credential check against VITE_ADMIN_EMAIL / PASSWORD.
//                Used only as a fallback when Firebase isn't configured.
//                (Not as secure as Firebase — the values live in the client
//                bundle — but a genuine login, not "anything works".)

export interface AuthUser {
  email: string;
}

export type AuthMode = "firebase" | "local";

interface SignInResult {
  ok: boolean;
  error?: string;
}

interface AuthValue {
  user: AuthUser | null;
  loading: boolean;
  mode: AuthMode;
  configured: boolean;
  signIn: (email: string, password: string) => Promise<SignInResult>;
  signOut: () => Promise<void>;
}

const LOCAL_KEY = "nlccAdminUserV7";
const AuthContext = createContext<AuthValue | null>(null);

/** Turn a Firebase error code into a friendly message. */
function friendlyError(code: string): string {
  if (code.includes("invalid-credential") || code.includes("wrong-password") || code.includes("user-not-found")) {
    return "Incorrect email or password.";
  }
  if (code.includes("too-many-requests")) {
    return "Too many attempts. Please try again later.";
  }
  if (code.includes("network")) {
    return "Network error. Check your connection and try again.";
  }
  return "Login failed. Please try again.";
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const configured = isFirebaseConfigured;
  const mode: AuthMode = configured ? "firebase" : "local";

  useEffect(() => {
    if (configured && auth) {
      const unsub = onAuthStateChanged(auth, (u) => {
        setUser(u ? { email: u.email || "" } : null);
        setLoading(false);
      });
      return () => unsub();
    }

    // Local fallback.
    try {
      const raw = localStorage.getItem(LOCAL_KEY);
      if (raw) setUser(JSON.parse(raw) as AuthUser);
    } catch {
      /* ignore corrupt storage */
    }
    setLoading(false);
  }, [configured]);

  const signIn = useCallback(
    async (email: string, password: string): Promise<SignInResult> => {
      if (!email.trim() || !password) {
        return { ok: false, error: "Please enter both your email and password." };
      }

      if (configured && auth) {
        try {
          await signInWithEmailAndPassword(auth, email.trim(), password);
          return { ok: true };
        } catch (e) {
          const code = e instanceof Error ? e.message : "";
          return { ok: false, error: friendlyError(code) };
        }
      }

      // Local fallback — real credential comparison.
      const expectedEmail =
        (import.meta.env.VITE_ADMIN_EMAIL as string) || "bhola.paneru@nlccuk.com";
      const expectedPassword =
        (import.meta.env.VITE_ADMIN_PASSWORD as string) || "nlcc-admin-2026";

      if (
        email.trim().toLowerCase() === expectedEmail.trim().toLowerCase() &&
        password === expectedPassword
      ) {
        const u = { email: email.trim() };
        try {
          localStorage.setItem(LOCAL_KEY, JSON.stringify(u));
        } catch {
          /* ignore */
        }
        setUser(u);
        return { ok: true };
      }
      return { ok: false, error: "Incorrect email or password." };
    },
    [configured],
  );

  const signOut = useCallback(async () => {
    if (configured && auth) {
      await fbSignOut(auth);
    } else {
      try {
        localStorage.removeItem(LOCAL_KEY);
      } catch {
        /* ignore */
      }
    }
    setUser(null);
  }, [configured]);

  return (
    <AuthContext.Provider value={{ user, loading, mode, configured, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
