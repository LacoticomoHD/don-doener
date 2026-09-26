import { StyleSheet, View } from 'react-native';

import { Card, Screen, Txt } from '@/components/ui';
import { useI18n } from '@/i18n/I18nProvider';
import { space } from '@/theme/tokens';

// Impressum (§ 5 DDG) und Datenschutzerklärung (DSGVO) sind rechtlich bindend
// und bleiben deshalb auf Deutsch.

// Name und Anschrift kommen aus der (nicht eingecheckten) .env bzw. den
// EAS-Umgebungsvariablen, damit sie nicht öffentlich im Repository stehen.
const imprint = {
  name: process.env.EXPO_PUBLIC_IMPRINT_NAME ?? '[Name]',
  street: process.env.EXPO_PUBLIC_IMPRINT_STREET ?? '[Straße Hausnummer]',
  city: process.env.EXPO_PUBLIC_IMPRINT_CITY ?? '[PLZ Ort]',
  email: process.env.EXPO_PUBLIC_IMPRINT_EMAIL ?? '[E-Mail]',
};

const IMPRESSUM = `${imprint.name}
${imprint.street}
${imprint.city}
Deutschland

E-Mail: ${imprint.email}

Verantwortlich für den Inhalt: ${imprint.name}`;

const DATENSCHUTZ: { title: string; text: string }[] = [
  {
    title: '1. Verantwortlicher',
    text: 'Verantwortlich für die Datenverarbeitung in dieser App ist die im Impressum genannte Person. Bei Fragen zum Datenschutz erreichst du uns unter der dort angegebenen E-Mail-Adresse.',
  },
  {
    title: '2. Welche Daten wir verarbeiten',
    text: 'Konto: Beim Registrieren speichern wir deine E-Mail-Adresse und ein verschlüsseltes Passwort. Bewertungen, Abstimmungen und Favoriten werden mit deinem Konto verknüpft gespeichert und sind nur für dich einsehbar; anderen Nutzenden zeigen wir ausschließlich anonyme Durchschnittswerte. Meldungen: Meldest du einen fehlerhaften Eintrag, speichern wir Grund und optionale Details. Änderungen an Ladendaten werden mit deinem Konto protokolliert, um Missbrauch nachvollziehen zu können.',
  },
  {
    title: '3. Standort',
    text: 'Deinen Standort nutzen wir nur mit deiner ausdrücklichen Freigabe – um die Karte auf deine Umgebung zu zentrieren, Entfernungen anzuzeigen und beim Bewerten zu prüfen, ob du vor Ort bist. Die Prüfung erfolgt auf deinem Gerät; gespeichert wird nur „vor Ort bestätigt: ja/nein", nie der Standort selbst.',
  },
  {
    title: '4. Hosting und Drittanbieter',
    text: 'Datenbank und Login liegen bei Supabase (Rechenzentrum in Frankfurt am Main). Kartenkacheln lädt die App von OpenFreeMap, die Adresssuche nutzt Nominatim (OpenStreetMap Foundation); dabei wird technisch bedingt deine IP-Adresse an diese Dienste übertragen. Für die Navigation öffnet die App auf deinen Wunsch die Karten-App deines Geräts. Kartendaten © OpenStreetMap-Mitwirkende.',
  },
  {
    title: '5. Deine Rechte',
    text: 'Du hast das Recht auf Auskunft, Berichtigung, Löschung und Datenübertragbarkeit (Art. 15–20 DSGVO) sowie auf Beschwerde bei einer Aufsichtsbehörde. Dein Konto kannst du jederzeit in der App unter Profil → Konto löschen entfernen; dabei werden dein Konto und alle deine Bewertungen unwiderruflich gelöscht. Von dir eingetragene Läden bleiben ohne Personenbezug als Community-Daten erhalten.',
  },
  {
    title: '6. Speicherdauer',
    text: 'Wir speichern deine Daten, solange dein Konto besteht. Nach der Kontolöschung werden personenbezogene Daten unverzüglich entfernt.',
  },
];

export default function LegalScreen() {
  const { t } = useI18n();
  return (
    <Screen>
      <Card>
        <Txt variant="heading">{t('legal.imprint')}</Txt>
        <Txt>{IMPRESSUM}</Txt>
      </Card>
      <Card>
        <Txt variant="heading">{t('legal.privacy')}</Txt>
        {t('legal.germanOnly') ? (
          <Txt variant="caption" tone="muted" style={styles.italic}>
            {t('legal.germanOnly')}
          </Txt>
        ) : null}
        {DATENSCHUTZ.map((s) => (
          <View key={s.title} style={styles.paragraph}>
            <Txt variant="label">{s.title}</Txt>
            <Txt tone="muted">{s.text}</Txt>
          </View>
        ))}
      </Card>
      <Txt variant="caption" tone="muted" style={styles.center}>
        {t('legal.osm')}
      </Txt>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { textAlign: 'center' },
  italic: { fontStyle: 'italic' },
  paragraph: { gap: 4, marginTop: space.sm },
});
