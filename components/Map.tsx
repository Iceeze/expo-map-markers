import { useEffect, useState } from 'react';
import { ActivityIndicator, Button, Platform, StyleSheet, Text, View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MapErrorBoundary from './MapErrorBoundary';
import type { Coordinates, MapMarker } from '../types';

interface MapProps {
  markers: MapMarker[];
  onAddMarker: (coordinate: Coordinates) => void;
  onOpenMarker: (id: string) => void;
}

function MapContent({ markers, onAddMarker, onOpenMarker }: MapProps) {
  const insets = useSafeAreaInsets();
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (status !== 'loading') return;
    const timer = setTimeout(() => setStatus('error'), 20000);
    return () => clearTimeout(timer);
  }, [status, attempt]);

  function retry() {
    setStatus('loading');
    setAttempt((current) => current + 1);
  }

  return (
    <View style={styles.container}>
      <MapView
        key={attempt}
        style={StyleSheet.absoluteFill}
        initialRegion={{
          latitude: 56.8389,
          longitude: 60.6057,
          latitudeDelta: 0.08,
          longitudeDelta: 0.08,
        }}
        onLongPress={(event) => onAddMarker(event.nativeEvent.coordinate)}
        onMapReady={() => {
          if (Platform.OS === 'ios') setStatus('ready');
        }}
        onMapLoaded={() => setStatus('ready')}
        toolbarEnabled={false}
      >
        {markers.map((marker) => (
          <Marker
            key={marker.id}
            coordinate={marker.coordinate}
            title={`Маркер ${marker.id}`}
            onPress={() => onOpenMarker(marker.id)}
          />
        ))}
      </MapView>
      {status === 'ready' && (
        <View style={[styles.refresh, { bottom: insets.bottom + 24 }]}>
          <Button title="Обновить карту" onPress={retry} />
        </View>
      )}
      {status === 'loading' && (
        <View pointerEvents="none" style={styles.overlay}>
          <ActivityIndicator size="large" color="#2563eb" />
          <Text style={styles.text}>Загрузка карты…</Text>
        </View>
      )}
      {status === 'error' && (
        <View style={styles.overlay}>
          <Text style={styles.title}>Карта долго не загружается</Text>
          <Text style={styles.text}>Проверьте подключение к интернету и повторите попытку.</Text>
          <Button title="Повторить" onPress={retry} />
        </View>
      )}
    </View>
  );
}

export default function Map(props: MapProps) {
  return (
    <MapErrorBoundary>
      <MapContent {...props} />
    </MapErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  refresh: {
    position: 'absolute',
    right: 16,
    padding: 8,
    borderRadius: 12,
    backgroundColor: '#fff',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    gap: 16,
    backgroundColor: '#fffffff2',
  },
  title: { fontSize: 20, fontWeight: 'bold', textAlign: 'center' },
  text: { fontSize: 16, textAlign: 'center', color: '#4b5563' },
});
