import type { CircleLayerSpecification, SymbolLayerSpecification } from '@maplibre/maplibre-react-native';

import { isOpenNow } from '@/lib/openingHours';
import { MARKER_COLORS, type Palette } from '@/theme/tokens';
import type { GeoBounds, ShopSummary } from '@/types';

/** Kartenstil: eigener Stil per .env, sonst OpenFreeMap (OSM-Daten, frei nutzbar, ohne Key). */
export function mapStyleUrl(dark: boolean): string {
  const custom = process.env.EXPO_PUBLIC_MAP_STYLE_URL;
  if (custom) return custom;
  return dark ? 'https://tiles.openfreemap.org/styles/dark' : 'https://tiles.openfreemap.org/styles/liberty';
}

export const MAP_ATTRIBUTION = '© OpenFreeMap © OpenMapTiles © OpenStreetMap';

/** Ab dieser Ausschnitt-Höhe (Breitengrade) werden keine Läden geladen. */
export const MAX_LAT_SPAN = 1.6;

export interface MapCamera {
  latitude: number;
  longitude: number;
  zoom: number;
}

export interface ShopMapHandle {
  flyTo: (camera: MapCamera) => void;
}

export interface ShopMapProps {
  shops: ShopSummary[];
  initialCamera: MapCamera;
  palette: Palette;
  dark: boolean;
  showUserLocation: boolean;
  /** Hervorgehobener Laden (Vorschau-Karte offen) */
  selectedId: string | null;
  onBoundsChange: (bounds: GeoBounds) => void;
  onShopPress: (shopId: string) => void;
  /** Tippen auf eine freie Stelle der Karte */
  onMapPress: () => void;
}

/** Läden als GeoJSON – Farbe des Rands zeigt geöffnet/geschlossen/unbekannt. */
export function shopsToGeoJSON(shops: ShopSummary[]): GeoJSON.FeatureCollection<GeoJSON.Point> {
  return {
    type: 'FeatureCollection',
    features: shops.map((shop) => {
      const known = Object.keys(shop.opening_hours).length > 0;
      return {
        type: 'Feature',
        id: shop.id,
        geometry: { type: 'Point', coordinates: [shop.longitude, shop.latitude] },
        properties: {
          id: shop.id,
          status: known ? (isOpenNow(shop.opening_hours) ? 'open' : 'closed') : 'unknown',
          rated: shop.stats.rating_count > 0 ? 1 : 0,
          score: shop.stats.avg_gesamt ?? 0,
        },
      };
    }),
  };
}

type Circle = Omit<CircleLayerSpecification, 'source'>;
type Symbol_ = Omit<SymbolLayerSpecification, 'source'>;

/** Gemeinsame Layer-Definitionen (MapLibre-Style-Spezifikation) für App und Web. */
export function shopLayers(
  p: Palette,
  selectedId: string | null
): { clusters: Circle; clusterCount: Symbol_; points: Circle; selected: Circle } {
  return {
    clusters: {
      id: 'shop-clusters',
      type: 'circle',
      filter: ['has', 'point_count'],
      paint: {
        'circle-color': p.primary,
        'circle-opacity': 0.9,
        'circle-radius': ['step', ['get', 'point_count'], 16, 20, 21, 100, 27],
        'circle-stroke-width': 3,
        'circle-stroke-color': '#1C1410',
      },
    },
    clusterCount: {
      id: 'shop-cluster-count',
      type: 'symbol',
      filter: ['has', 'point_count'],
      layout: {
        'text-field': ['get', 'point_count_abbreviated'],
        'text-font': ['Noto Sans Bold'],
        'text-size': 13,
        'text-allow-overlap': true,
      },
      paint: { 'text-color': '#FFFFFF' },
    },
    points: {
      id: 'shop-points',
      type: 'circle',
      filter: ['!', ['has', 'point_count']],
      paint: {
        // Bewertete Läden größer und in Markenfarbe, unbewertete dezent
        'circle-color': ['case', ['==', ['get', 'rated'], 1], MARKER_COLORS.rated, MARKER_COLORS.unrated],
        'circle-radius': ['case', ['==', ['get', 'rated'], 1], 9, 6.5],
        'circle-stroke-width': 3,
        'circle-stroke-color': [
          'match',
          ['get', 'status'],
          'open',
          MARKER_COLORS.open,
          'closed',
          MARKER_COLORS.closed,
          '#FFFFFF',
        ],
      },
    },
    selected: {
      id: 'shop-selected',
      type: 'circle',
      filter: ['==', ['get', 'id'], selectedId ?? ''],
      paint: {
        'circle-color': MARKER_COLORS.selected,
        'circle-radius': 14,
        'circle-stroke-width': 3.5,
        'circle-stroke-color': '#1C1410',
      },
    },
  };
}
