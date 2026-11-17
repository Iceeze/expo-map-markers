import { useRouter } from 'expo-router';
import { Alert, Button, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import DatabaseStatus from '../components/DatabaseStatus';
import Map from '../components/Map';
import { useDatabase } from '../contexts/DatabaseContext';
import { useLocation } from '../contexts/LocationContext';
import type { Coordinates } from '../types';

export default function MapScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { markers, addMarker, isReady, isLoading } = useDatabase();
  const { location, locationError, notificationError, retry } = useLocation();

  async function saveMarker({ latitude, longitude }: Coordinates) {
    try {
      await addMarker(latitude, longitude);
    } catch (error) {
      Alert.alert('Ошибка сохранения', error instanceof Error ? error.message : 'Попробуйте ещё раз.');
    }
  }

  function openMarker(id: number) {
    try {
      if (!markers.some((marker) => marker.id === id)) {
        Alert.alert('Маркер не найден', 'Вернитесь к карте и выберите другой маркер.');
        return;
      }
      router.push({ pathname: '/marker/[id]', params: { id: String(id) } });
    } catch {
      Alert.alert('Ошибка навигации', 'Не удалось открыть маркер. Попробуйте ещё раз.');
    }
  }

  if (!isReady) return <DatabaseStatus />;

  return (
    <View style={styles.screen}>
      <Map markers={markers} userLocation={location?.coords ?? null} onAddMarker={saveMarker} onOpenMarker={openMarker} />
      <View pointerEvents={locationError || notificationError ? 'auto' : 'none'} style={[styles.hint, { top: insets.top + 12 }]}>
        <Text style={styles.title}>Карта и изображения</Text>
        <Text style={styles.text}>Удерживайте палец на карте, чтобы добавить маркер.</Text>
        <Text style={styles.text}>Нажмите на маркер, чтобы добавить фотографии.</Text>
        <Text style={styles.count}>{isLoading ? 'Работа с базой данных…' : `Маркеров: ${markers.length}`}</Text>
        {!location && !locationError && <Text style={styles.text}>Определяем местоположение…</Text>}
        {locationError && <Text style={styles.error}>{locationError}</Text>}
        {notificationError && <Text style={styles.error}>{notificationError}</Text>}
        {(locationError || notificationError) && <Button title="Повторить" onPress={retry} />}
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
  error: { marginTop: 8, fontSize: 14, color: '#991b1b' },
});
