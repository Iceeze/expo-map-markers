import { useRouter } from 'expo-router';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Map from '../components/Map';
import { useMarkers } from '../context/MarkersContext';
import type { MarkerRouteParams } from '../types';

export default function MapScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { markers, addMarker } = useMarkers();

  function openMarker(id: string) {
    try {
      if (!markers.some((marker) => marker.id === id)) {
        Alert.alert('Маркер не найден', 'Вернитесь к карте и выберите другой маркер.');
        return;
      }
      const params: MarkerRouteParams = { id };
      router.push({ pathname: '/marker/[id]', params: { ...params } });
    } catch {
      Alert.alert('Ошибка навигации', 'Не удалось открыть маркер. Попробуйте ещё раз.');
    }
  }

  return (
    <View style={styles.screen}>
      <Map markers={markers} onAddMarker={addMarker} onOpenMarker={openMarker} />
      <View pointerEvents="none" style={[styles.hint, { top: insets.top + 12 }]}>
        <Text style={styles.title}>Карта и изображения</Text>
        <Text style={styles.text}>Удерживайте палец на карте, чтобы добавить маркер.</Text>
        <Text style={styles.text}>Нажмите на маркер, чтобы добавить фотографии.</Text>
        <Text style={styles.count}>Маркеров: {markers.length}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  hint: {
    position: 'absolute',
    left: 16,
    right: 16,
    padding: 14,
    borderRadius: 12,
    backgroundColor: '#ffffffee',
  },
  title: { fontSize: 20, fontWeight: 'bold', marginBottom: 8, color: '#172033' },
  text: { fontSize: 14, color: '#374151', lineHeight: 20 },
  count: { marginTop: 8, fontSize: 14, fontWeight: 'bold', color: '#2563eb' },
});
