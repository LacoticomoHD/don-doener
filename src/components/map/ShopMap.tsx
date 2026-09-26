import {
  Camera,
  GeoJSONSource,
  Layer,
  Map,
  UserLocation,
  type CameraRef,
  type GeoJSONSourceRef,
} from '@maplibre/maplibre-react-native';
import { forwardRef, useImperativeHandle, useMemo, useRef } from 'react';
import { StyleSheet } from 'react-native';

import { shopLayers, shopsToGeoJSON, type ShopMapHandle, type ShopMapProps, mapStyleUrl } from './mapConfig';

/** Native Karte (MapLibre, Android/iOS). */
export const ShopMap = forwardRef<ShopMapHandle, ShopMapProps>(function ShopMap(
  { shops, initialCamera, palette, dark, showUserLocation, onBoundsChange, onShopPress },
  ref
) {
  const cameraRef = useRef<CameraRef>(null);
  const sourceRef = useRef<GeoJSONSourceRef>(null);
  const data = useMemo(() => shopsToGeoJSON(shops), [shops]);
  const layers = useMemo(() => shopLayers(palette), [palette]);

  useImperativeHandle(ref, () => ({
    flyTo: ({ latitude, longitude, zoom }) =>
      cameraRef.current?.flyTo({ center: [longitude, latitude], zoom, duration: 900 }),
  }));

  return (
    <Map
      style={styles.flex}
      mapStyle={mapStyleUrl(dark)}
      logo={false}
      attribution
      attributionPosition={{ bottom: 8, left: 8 }}
      compass={false}
      onRegionDidChange={(e) => {
        const [west, south, east, north] = e.nativeEvent.bounds;
        onBoundsChange({ minLat: south, maxLat: north, minLon: west, maxLon: east });
      }}
    >
      <Camera
        ref={cameraRef}
        initialViewState={{
          center: [initialCamera.longitude, initialCamera.latitude],
          zoom: initialCamera.zoom,
        }}
      />
      {showUserLocation ? <UserLocation /> : null}
      <GeoJSONSource
        ref={sourceRef}
        id="shops"
        data={data}
        cluster
        clusterRadius={45}
        clusterMaxZoom={13}
        hitbox={{ top: 12, right: 12, bottom: 12, left: 12 }}
        onPress={async (e) => {
          const feature = e.nativeEvent.features[0];
          if (!feature) return;
          const props = feature.properties ?? {};
          if (props.cluster && feature.geometry.type === 'Point') {
            // Cluster antippen → hineinzoomen
            const zoom = await sourceRef.current?.getClusterExpansionZoom(props.cluster_id as number);
            const [lon, lat] = feature.geometry.coordinates;
            cameraRef.current?.easeTo({ center: [lon, lat], zoom: (zoom ?? 12) + 0.5, duration: 500 });
            return;
          }
          if (typeof props.id === 'string') onShopPress(props.id);
        }}
      >
        <Layer {...layers.clusters} />
        <Layer {...layers.clusterCount} />
        <Layer {...layers.points} />
      </GeoJSONSource>
    </Map>
  );
});

const styles = StyleSheet.create({ flex: { flex: 1 } });
