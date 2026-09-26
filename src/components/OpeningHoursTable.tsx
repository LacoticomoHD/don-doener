import { StyleSheet, View } from 'react-native';

import { useI18n } from '@/i18n/I18nProvider';
import { weekdayKey } from '@/lib/openingHours';
import { WEEKDAYS, type OpeningHours } from '@/types';

import { Txt } from './ui';

export function OpeningHoursTable({ hours }: { hours: OpeningHours }) {
  const { t } = useI18n();
  const today = weekdayKey(new Date());
  return (
    <View>
      {WEEKDAYS.map((day) => {
        const entry = hours[day];
        const isToday = day === today;
        const weight = isToday ? ('800' as const) : ('400' as const);
        return (
          <View key={day} style={styles.row}>
            <Txt style={[styles.day, { fontWeight: weight }]}>{t(`weekday.${day}`)}</Txt>
            <Txt tone={entry ? 'default' : 'muted'} style={{ fontWeight: weight, fontVariant: ['tabular-nums'] }}>
              {entry ? `${entry.open} – ${entry.close}` : t('common.closed')}
            </Txt>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  day: { width: 120 },
  row: { flexDirection: 'row', paddingVertical: 3 },
});
