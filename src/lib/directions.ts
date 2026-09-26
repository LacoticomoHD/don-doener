import { Linking, Platform } from 'react-native';

import type { Coords } from '@/types';

export type TravelMode = 'driving' | 'walking' | 'bicycling' | 'transit';

export const TRAVEL_MODES: { key: TravelMode; icon: string }[] = [
  { key: 'walking', icon: '🚶' },
  { key: 'bicycling', icon: '🚲' },
  { key: 'transit', icon: '🚌' },
  { key: 'driving', icon: '🚗' },
];

/** Startet die Navigation in der Karten-App des Systems (Web: Google Maps im Browser). */
export async function openDirections(target: Coords, mode: TravelMode): Promise<void> {
  const dest = `${target.latitude},${target.longitude}`;
  const webUrl = `https://www.google.com/maps/dir/?api=1&destination=${dest}&travelmode=${mode}`;

  let nativeUrl: string | null = null;
  if (Platform.OS === 'ios') {
    const flag: Record<TravelMode, string> = { driving: 'd', walking: 'w', bicycling: 'c', transit: 'r' };
    nativeUrl = `maps://?daddr=${dest}&dirflg=${flag[mode]}`;
  } else if (Platform.OS === 'android' && mode !== 'transit') {
    // google.navigation kennt kein ÖPNV – dafür greift der Web-Link
    const flag = { driving: 'd', walking: 'w', bicycling: 'b' }[mode];
    nativeUrl = `google.navigation:q=${dest}&mode=${flag}`;
  }

  try {
    if (nativeUrl && (await Linking.canOpenURL(nativeUrl))) {
      await Linking.openURL(nativeUrl);
      return;
    }
  } catch {
    // Karten-App nicht verfügbar → Web-Link
  }
  await Linking.openURL(webUrl);
}
