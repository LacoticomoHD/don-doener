import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState, type DependencyList } from 'react';

interface AsyncState<T> {
  data: T | undefined;
  error: string | null;
  loading: boolean;
  reload: () => void;
}

/** Lädt Daten und lädt sie neu, sobald der Screen wieder in den Fokus kommt
 *  (z. B. nach dem Bewerten zurück auf die Detailseite). Veraltete Antworten
 *  werden verworfen, wenn sich die Abhängigkeiten inzwischen geändert haben. */
export function useFocusedAsync<T>(load: () => Promise<T>, deps: DependencyList): AsyncState<T> {
  const [data, setData] = useState<T>();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const requestId = useRef(0);

  // Immer die neueste load-Funktion verwenden; neu geladen wird nur, wenn sich deps ändern
  const loadRef = useRef(load);
  useEffect(() => {
    loadRef.current = load;
  });
  const depsKey = JSON.stringify(deps);

  const reload = useCallback(() => {
    const id = ++requestId.current;
    setLoading(true);
    loadRef
      .current()
      .then((result) => {
        if (id !== requestId.current) return;
        setData(result);
        setError(null);
      })
      .catch((e: unknown) => {
        if (id !== requestId.current) return;
        setError(e instanceof Error ? e.message : String(e));
      })
      .finally(() => {
        if (id === requestId.current) setLoading(false);
      });
    // depsKey steht stellvertretend für deps
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [depsKey]);

  useFocusEffect(reload);

  return { data, error, loading, reload };
}

/** Verzögert einen Wert (z. B. Sucheingabe), damit nicht jeder Tastendruck lädt. */
export function useDebounced<T>(value: T, ms: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(timer);
  }, [value, ms]);
  return debounced;
}
