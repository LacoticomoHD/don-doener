import 'expo-sqlite/localStorage/install';

/** Kleine, synchrone Einstellungen (Sprache, Design). Nativ über expo-sqlite,
 *  im Web über den Browser-localStorage. Fehler (z. B. privates Fenster) werden
 *  ignoriert – dann gelten die Standardwerte. */
export function readSetting(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function writeSetting(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Einstellung geht verloren, App funktioniert trotzdem
  }
}
