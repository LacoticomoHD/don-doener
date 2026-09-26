# Don Döner 2.0

**Die App, die nur eines kann – Dönerläden bewerten. Aber das richtig.**

Komplette Neufassung (September 2026) auf Expo SDK 57 / React Native 0.86 mit Expo Router.
Nutzt die bestehende Supabase-Datenbank (`coydygpnumqxxealikqb`) mit allen Läden,
Bewertungen und Konten weiter.

## Funktionen

- **Karte** (MapLibre, OpenFreeMap-Kacheln – OSM-Daten, frei nutzbar ohne API-Key) mit Clustern,
  Öffnungsstatus am Markerrand, Ortssuche und eigenem Standort
- **Liste** mit Volltextsuche (Name, Straße, Stadt), Sortierung nach Bewertung, Entfernung oder Preis
- **Filter** für Karte und Liste: Besonderheiten, „Jetzt geöffnet", „Nur bewertete"
- **Top 10** je Stadt oder deutschlandweit, nach Bewertung oder Preis-Leistung, Dönerpreis-Index, Teilen
- **Bewerten** in 7 Kategorien (Fleischqualität optional), Vor-Ort-Bestätigung (Standort wird nur
  lokal geprüft), Abstimmung über 14 Besonderheiten, Preis-Check, Kartenzahlung
- **Läden eintragen/bearbeiten** (Wiki-Prinzip, Änderungen werden protokolliert) mit Adresssuche,
  4 Preisen, Öffnungszeiten (auch über Mitternacht) und Duplikat-Warnung
- **Melden**; nach 3 Meldungen „dauerhaft geschlossen" wird ein Laden automatisch ausgeblendet
- **Profil**: Döner-Pass mit Abzeichen, Meine Bewertungen, Stammläden, Sprache (DE/EN/TR),
  Hell/Dunkel, Konto löschen, Admin-Postfach für Meldungen
- **Stöbern ohne Konto** – anmelden muss man sich erst zum Bewerten, Merken oder Eintragen
- Läuft auf **Android, iOS und im Web**

## Entwicklung

```bash
cp .env.example .env      # Werte aus Supabase → Project Settings → API
npm install
npx expo start --web      # schneller Test im Browser
npx expo run:android      # Development-Build (MapLibre braucht nativen Code, kein Expo Go)
```

Prüfen vor jedem Commit:

```bash
npx tsc --noEmit
npx expo lint
npx expo-doctor
```

APK für Tester:innen: `npx eas-cli@latest build --platform android --profile preview`

## Projektstruktur

```
src/app/            Screens (Expo Router, dateibasiert)
  (tabs)/           Karte, Liste, Top 10, Profil
  laden/[id]/       Detail, Bewerten, Bearbeiten, Melden
src/components/     UI-Bausteine, Karte (map/ShopMap.tsx nativ, .web.tsx Browser)
src/lib/            Supabase-Zugriff (api.ts), Auth, Filter, Hilfsfunktionen
src/i18n/           Übersetzungen de/en/tr (typisiert – fehlende Texte fallen beim tsc auf)
supabase/migrations Datenbank-Änderungen
```

## Datenbank

Die Migration `supabase/migrations/20260926000000_don_doener_v2.sql` wurde am 26.09.2026 auf die
Live-Datenbank angewendet. Sicherung des Stands davor: Schema `backup_20260926`
(kann gelöscht werden, sobald v2 sicher läuft: `drop schema backup_20260926 cascade;`).

Wichtigste Änderungen:
- Einzelbewertungen und Abstimmungen sind nur noch für die eigene Person lesbar;
  öffentlich sind nur anonyme Schnitte (`shop_stats`, `shop_feature_stats`, `shop_hours_stats`,
  per Trigger gepflegt).
- `created_by`, `created_at` und `ausgeblendet` kann die App nicht mehr überschreiben.
- Geänderte Öffnungszeiten setzen das „Stimmen die Zeiten?"-Feedback serverseitig zurück.
- Die alten Views (`shops_overview`, `shop_rating_summary` …) bleiben kompatibel,
  damit die installierte v1.4.1 bis zum Update weiterläuft.

## Vor dem Store-Release

- Impressum-Angaben in `.env` bzw. als EAS-Umgebungsvariablen setzen (`EXPO_PUBLIC_IMPRINT_*`), Datenschutz in `src/app/rechtliches.tsx` prüfen
- In Supabase „Leaked Password Protection" aktivieren (Authentication → Settings)
- Bei vielen Nutzer:innen einen eigenen Kartenstil/Tile-Anbieter über
  `EXPO_PUBLIC_MAP_STYLE_URL` setzen
