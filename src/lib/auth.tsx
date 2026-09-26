import type { Session, User } from '@supabase/supabase-js';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { fetchIsAdmin } from './api';
import { supabase } from './supabase';

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  isAdmin: boolean;
  /** true, bis die gespeicherte Sitzung geladen ist */
  loading: boolean;
  signIn: (email: string, password: string) => Promise<string | null>;
  signUp: (email: string, password: string) => Promise<string | null>;
  resetPassword: (email: string) => Promise<string | null>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  // Admin-Status gehört immer zu genau einem Konto
  const [adminCheck, setAdminCheck] = useState<{ userId: string; isAdmin: boolean } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth
      .getSession()
      .then(({ data }) => setSession(data.session))
      .finally(() => setLoading(false));
    const { data } = supabase.auth.onAuthStateChange((_event, next) => setSession(next));
    return () => data.subscription.unsubscribe();
  }, []);

  const userId = session?.user.id;
  useEffect(() => {
    if (!userId) return;
    fetchIsAdmin().then((isAdmin) => setAdminCheck({ userId, isAdmin }));
  }, [userId]);
  const isAdmin = !!userId && adminCheck?.userId === userId && adminCheck.isAdmin;

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      isAdmin,
      loading,
      signIn: async (email, password) => {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        return error?.message ?? null;
      },
      signUp: async (email, password) => {
        const { error } = await supabase.auth.signUp({ email, password });
        return error?.message ?? null;
      },
      resetPassword: async (email) => {
        const { error } = await supabase.auth.resetPasswordForEmail(email);
        return error?.message ?? null;
      },
      signOut: async () => {
        await supabase.auth.signOut();
      },
    }),
    [session, isAdmin, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth außerhalb von AuthProvider');
  return ctx;
}
