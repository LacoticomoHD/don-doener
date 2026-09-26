import { router } from 'expo-router';
import { useCallback } from 'react';

import { useAuth } from './auth';

/** Liefert die User-ID oder schickt zur Anmeldung (Stöbern geht ohne Konto). */
export function useRequireLogin() {
  const { user } = useAuth();
  return useCallback((): string | null => {
    if (user) return user.id;
    router.push('/login');
    return null;
  }, [user]);
}
