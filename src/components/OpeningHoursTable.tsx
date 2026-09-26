import { StyleSheet, View } from 'react-native';

import { useI18n } from '@/i18n/I18nProvider';
import { weekdayKey } from '@/lib/openingHours';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, space } from '@/theme/tokens';
import { WEEKDAYS, type OpeningHours } from '@/types';

import { Txt } from './ui';

export function OpeningHoursTable({ hours }: { hours: OpeningHours }) {
  const { theme } = useTheme();
  const { t } = useI18n();
  const today = weekdayKey(new Date());
  return (
    <View>
      {WEEKDAYS.map((day) => {
        const entry = hours[day];
        const isToday = day === today;
        return (
          <View key={day} style={[styles.row, isToday && { backgroundColor: theme.colors.secondary }]}>
            <Txt variant={isToday ? 'label' : 'body'} tone={isToday ? 'onSecondary' : 'default'} style={styles.day}>
              {t(`weekday.${day}`)}
            </Txt>
            <Txt
              variant={isToday ? 'label' : 'body'}
              tone={isToday ? 'onSecondary' : entry ? 'default' : 'muted'}
              style={styles.time}
            >
              {entry ? `${entry.open} – ${entry.close}` : t('common.closed')}
            </Txt>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  day: { flex: 1 },
  row: { borderRadius: radius.sm, flexDirection: 'row', paddingHorizontal: space.sm, paddingVertical: 5 },
  time: { fontVariant: ['tabular-nums'] },
});
