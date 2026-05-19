/**
 * AuthProvider — source de vérité pour la session Supabase côté React.
 *
 * Pattern recommandé : on installe `onAuthStateChange` AVANT `getSession`
 * pour ne pas rater un évènement d'initialisation.
 *
 * Important : on évite les re-renders inutiles en ne posant la nouvelle
 * session que si l'access_token a réellement changé. Sans ça, chaque
 * évènement Supabase (INITIAL_SESSION, focus tab, TOKEN_REFRESHED…) crée
 * un nouvel objet en state et fait boucler les consommateurs.
 */
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function sameSession(a: Session | null, b: Session | null) {
  if (a === b) return true;
  if (!a || !b) return false;
  return a.access_token === b.access_token && a.user?.id === b.user?.id;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSessionState] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const setSessionIfChanged = (next: Session | null) => {
      setSessionState((prev) => (sameSession(prev, next) ? prev : next));
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSessionIfChanged(s);
      setLoading(false);
    });

    supabase.auth.getSession().then(({ data }) => {
      setSessionIfChanged(data.session);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    user: session?.user ?? null,
    session,
    loading,
    signOut: async () => {
      await supabase.auth.signOut();
    },
  }), [session, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
