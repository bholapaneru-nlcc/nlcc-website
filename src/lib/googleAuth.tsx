import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut as fbSignOut,
  type User,
} from "firebase/auth";
import { auth, isFirebaseConfigured } from "./firebase";

/* --------------------------- unified google auth -------------------------- */
//
// ALL portals (Admin, Teachers, Students) use Google Sign-In.
// Only @nlccuk.com domain emails are allowed.
// Each portal validates the email against its own records:
//   • Admin    → email must be in the admin users list (Firestore content/admins)
//   • Teachers → email must be in teacher accounts (Firestore content/teachers)
//   • Students → email must be in student records (Firestore content/school)

const ALLOWED_DOMAIN = "nlccuk.com";

export interface GoogleUser {
  email: string;
  displayName: string;
  photoURL: string;
  uid: string;
}

interface AuthValue {
  user: GoogleUser | null;
  loading: boolean;
  configured: boolean;
  signInWithGoogle: () => Promise<{ ok: boolean; error?: string; user?: GoogleUser }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthValue | null>(null);

const toGoogleUser = (u: User): GoogleUser => ({
  email: u.email || "",
  displayName: u.displayName || "",
  photoURL: u.photoURL || "",
  uid: u.uid,
});

export function GoogleAuthProviderWrapper({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<GoogleUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isFirebaseConfigured || !auth) {
      setLoading(false);
      return;
    }
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u ? toGoogleUser(u) : null);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const signInWithGoogle = useCallback(async () => {
    if (!isFirebaseConfigured || !auth) {
      return { ok: false, error: "Authentication is not configured." };
    }
    try {
      const provider = new GoogleAuthProvider();
      // Restrict to NLCC domain
      provider.setCustomParameters({
        hd: ALLOWED_DOMAIN,
      });
      const result = await signInWithPopup(auth, provider);
      const googleUser = toGoogleUser(result.user);

      // Validate domain
      if (!googleUser.email.endsWith(`@${ALLOWED_DOMAIN}`)) {
        await fbSignOut(auth);
        return {
          ok: false,
          error: `Only @${ALLOWED_DOMAIN} accounts are allowed.`,
        };
      }

      setUser(googleUser);
      return { ok: true, user: googleUser };
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Sign-in failed.";
      // Popup closed / cancelled
      if (msg.includes("popup-closed") || msg.includes("cancelled")) {
        return { ok: false, error: "" }; // silent — user cancelled
      }
      return { ok: false, error: msg };
    }
  }, []);

  const signOut = useCallback(async () => {
    if (auth) await fbSignOut(auth);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, configured: isFirebaseConfigured, signInWithGoogle, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useGoogleAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useGoogleAuth must be used within GoogleAuthProvider");
  return ctx;
}

/** Check if a given email is authorized for a specific role. */
export async function checkAuthorization(email: string, role: "admin" | "teacher" | "student"): Promise<boolean> {
  const e = email.trim().toLowerCase();
  if (!e.endsWith("@nlccuk.com")) return false;

  if (role === "admin") {
    // Admins are stored in Firestore content/admins
    const { getDoc, doc } = await import("firebase/firestore");
    const { db } = await import("./firebase");
    if (!db) return e === "bhola.paneru@nlccuk.com"; // fallback default
    const snap = await getDoc(doc(db, "content", "admins"));
    if (snap.exists()) {
      const admins = (snap.data() as { emails?: string[] }).emails || [];
      return admins.some((a) => a.toLowerCase() === e);
    }
    // Default: first admin
    return e === "bhola.paneru@nlccuk.com";
  }

  if (role === "teacher") {
    const { getTeacherDoc } = await import("./teacherStore");
    return getTeacherDoc().accounts.some((a) => a.email.toLowerCase() === e && a.status !== "disabled");
  }

  if (role === "student") {
    const { getSchool } = await import("./schoolStore");
    const student = getSchool().students.find((s) => s.email.toLowerCase() === e);
    if (!student) return false;
    if (student.status === "disabled") return false;
    // Check class not disabled
    const cls = getSchool().classes.find((c) => c.id === student.classId);
    if (cls && cls.status === "disabled") return false;
    // Check org not suspended/expired
    if (student.orgId) {
      const { getOrgById } = await import("./orgStore");
      const org = getOrgById(student.orgId);
      if (org && (org.status === "suspended" || (org.subscriptionEnd && new Date(org.subscriptionEnd) < new Date()))) return false;
    }
    return true;
  }

  return false;
}
