import React, { createContext, useContext, useEffect, useState } from "react";
import {
  onAuthStateChanged,
  User,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../lib/firebase";

interface AuthContextType {
  user: User | null;
  role: "admin" | "doctor" | null;
  loading: boolean;
  signIn: () => Promise<void>;
  logOut: () => Promise<void>;
  error: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<"admin" | "doctor" | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        if (!currentUser.email) {
          setError("Email is required for authentication.");
          await auth.signOut();
          setUser(null);
          setRole(null);
          setLoading(false);
          return;
        }

        try {
          if (currentUser.email === "musen.almajidi.alallaf@gmail.com") {
            setRole("admin");
            setUser(currentUser);
          } else {
            const docRef = doc(db, "doctors", currentUser.email);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
              setRole(docSnap.data().role as "admin" | "doctor");
              setUser(currentUser);
            } else {
              setError(
                "Your email is not authorized to access this application. Please contact an admin.",
              );
              await auth.signOut();
              setUser(null);
              setRole(null);
            }
          }
        } catch (err) {
          console.error(err);
          setError("Error verifying access.");
          await auth.signOut();
        }
      } else {
        setUser(null);
        setRole(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const signIn = async () => {
    setError(null);
    try {
      const provider = new GoogleAuthProvider();
      // Important for custom domains/iframes usually use popup not redirect
      await signInWithPopup(auth, provider);
    } catch (err: any) {
      setError(err.message || "Failed to sign in");
      console.error(err);
    }
  };

  const logOut = async () => {
    try {
      await signOut(auth);
    } catch (err: any) {
      console.error(err);
    }
  };

  return (
    <AuthContext.Provider
      value={{ user, role, loading, signIn, logOut, error }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
