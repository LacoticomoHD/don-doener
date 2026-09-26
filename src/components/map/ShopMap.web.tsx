import 'maplibre-gl/dist/maplibre-gl.css';

import {
  Map as MapLibreMap,
  Marker,
  setWorkerUrl,
  type GeoJSONSource,
  type LayerSpecification,
  type MapLayerMouseEvent,
} from 'maplibre-gl';
import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef } from 'react';
import { StyleSheet, View } from 'react-native';

import { mapStyleUrl, shopLayers, shopsToGeoJSON, type ShopMapHandle, type ShopMapProps } from './mapConfig';

// Worker liegt in public/maplibre (siehe scripts/copy-maplibre-worker.js)
setWorkerUrl(new URL('/maplibre/maplibre-gl-worker.mjs', window.location.origin).href);

/** Web-Karte (maplibre-gl) – gleiche Layer wie in der App. */
export const ShopMap = forwardRef<ShopMapHandle, ShopMapProps>(function ShopMap(
  { shops, initialCamera, palette, dark, showUserLocation, selectedId, onBoundsChange, onShopPress, onMapPress },
  ref
) {
  const containerRef = useRef<View>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const userMarker = useRef<Marker | null>(null);
  const data = useMemo(() => shopsToGeoJSON(shops), [shops]);
  const layers = useMemo(() => shopLayers(palette, selectedId), [palette, selectedId]);

  // Callbacks in Refs, damit die Karte nicht bei jedem Render neu entsteht
  const callbacks = useRef({ onBoundsChange, onShopPress, onMapPress });
  callbacks.current = { onBoundsChange, onShopPress, onMapPress };
  const latest = useRef({ data, layers });
  latest.current = { data, layers };

  useImperativeHandle(ref, () => ({
    flyTo: ({ latitude, longitude, zoom }) => mapRef.current?.flyTo({ center: [longitude, latitude], zoom }),
  }));

  useEffect(() => {
    const container = containerRef.current as unknown as HTMLElement | null;
    if (!container) return;
    const map = new MapLibreMap({
      container,
      style: mapStyleUrl(dark),
      center: [initialCamera.longitude, initialCamera.latitude],
      zoom: initialCamera.zoom,
      attributionControl: { compact: true },
    });
    mapRef.current = map;

    const emitBounds = () => {
      const b = map.getBounds();
      callbacks.current.onBoundsChange({
        minLat: b.getSouth(),
        maxLat: b.getNorth(),
        minLon: b.getWest(),
        maxLon: b.getEast(),
      });
    };

    // Nach jedem Stilwechsel Quelle und Layer neu anlegen
    map.on('style.load', () => {
      const { data: d, layers: l } = latest.current;
      map.addSource('shops', { type: 'geojson', data: d, cluster: true, clusterRadius: 45, clusterMaxZoom: 13 });
      for (const layer of [l.clusters, l.clusterCount, l.points, l.selected]) {
        map.addLayer({ ...layer, source: 'shops' } as LayerSpecification);
      }
      emitBounds();
    });
    map.on('moveend', emitBounds);

    map.on('click', 'shop-clusters', async (e: MapLayerMouseEvent) => {
      const feature = e.features?.[0];
      if (!feature || feature.geometry.type !== 'Point') return;
      const source = map.getSource('shops') as GeoJSONSource;
      const zoom = await source.getClusterExpansionZoom(feature.properties.cluster_id as number);
      map.easeTo({ center: feature.geometry.coordinates as [number, number], zoom: zoom + 0.5 });
    });
    // Klick ins Leere schließt die Vorschau
    map.on('click', (e) => {
      const hits = map.queryRenderedFeatures(e.point, { layers: ['shop-points', 'shop-clusters'] });
      if (hits.length === 0) callbacks.current.onMapPress();
    });
    map.on('click', 'shop-points', (e: MapLayerMouseEvent) => {
      const id = e.features?.[0]?.properties?.id;
      if (typeof id === 'string') callbacks.current.onShopPress(id);
    });
    for (const layer of ['shop-clusters', 'shop-points']) {
      map.on('mouseenter', layer, () => (map.getCanvas().style.cursor = 'pointer'));
      map.on('mouseleave', layer, () => (map.getCanvas().style.cursor = ''));
    }

    return () => {
      map.remove();
      mapRef.current = null;
    };
    // Kamera nur beim ersten Aufbau setzen; spätere Sprünge laufen über flyTo
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Hell/Dunkel wechseln
  useEffect(() => {
    mapRef.current?.setStyle(mapStyleUrl(dark));
  }, [dark]);

  // Hervorhebung des ausgewählten Ladens nachziehen
  useEffect(() => {
    const map = mapRef.current;
    if (map?.getLayer('shop-selected')) map.setFilter('shop-selected', layers.selected.filter ?? null);
  }, [layers]);

  // Neue Läden in die bestehende Quelle schreiben
  useEffect(() => {
    const source = mapRef.current?.getSource('shops') as GeoJSONSource | undefined;
    source?.setData(data);
  }, [data]);

  // Eigenen Standort als Punkt anzeigen
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !showUserLocation || !navigator.geolocation) return;
    const watch = navigator.geolocation.watchPosition((pos) => {
      const lngLat: [number, number] = [pos.coords.longitude, pos.coords.latitude];
      if (!userMarker.current) {
        const el = document.createElement('div');
        el.style.cssText =
          'width:16px;height:16px;border-radius:50%;background:#1E88E5;border:3px solid #fff;box-shadow:0 0 0 2px rgba(30,136,229,.35)';
        userMarker.current = new Marker({ element: el }).setLngLat(lngLat).addTo(map);
      } else {
        userMarker.current.setLngLat(lngLat);
      }
    });
    return () => navigator.geolocation.clearWatch(watch);
  }, [showUserLocation]);

  return <View ref={containerRef} style={styles.flex} />;
});

const styles = StyleSheet.create({ flex: { flex: 1 } });
