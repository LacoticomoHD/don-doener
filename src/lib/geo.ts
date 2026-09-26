import type { Coords, GeoBounds } from '@/types';

/** Entfernung in Kilometern (Haversine). */
export function distanceKm(a: Coords, b: Coords): number {
  const R = 6371;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.latitude)) * Math.cos(toRad(b.latitude)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Rechteck rund um einen Punkt; `km` ist der halbe Kantenabstand. */
export function boundsAround(center: Coords, km: number): GeoBounds {
  const dLat = km / 111;
  const dLon = km / (111 * Math.cos((center.latitude * Math.PI) / 180));
  return {
    minLat: center.latitude - dLat,
    maxLat: center.latitude + dLat,
    minLon: center.longitude - dLon,
    maxLon: center.longitude + dLon,
  };
}

/** Karlsruhe – hier begann die Community; Startpunkt ohne Standortfreigabe. */
export const DEFAULT_CENTER: Coords = { latitude: 49.0093, longitude: 8.4044 };
