import { useCallback, useState } from 'react';
import { useFocusEffect, useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { ActivityIndicator, Alert, Button, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DatabaseStatus from '../../components/DatabaseStatus';
import ImageList from '../../components/ImageList';
import { useDatabase } from '../../contexts/DatabaseContext';
import type { MapMarker, MarkerImage } from '../../types';

export default function MarkerScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const navigation = useNavigation();
  const { markers, isReady } = useDatabase();

  const marker = markers.find((item) => String(item.id) === id);

  function goBack() {
    if (!navigation.isFocused()) return;
    try {
      if (router.canGoBack()) router.back();
      else router.replace('/');
    } catch {
      Alert.alert('Ошибка навигации', 'Не удалось вернуться к карте. Откройте приложение заново.');
    }
  }

  if (!isReady) return <DatabaseStatus />;

  if (!marker) {
    return (
      <SafeAreaView edges={['bottom']} style={styles.missing}>
        <Text style={styles.title}>Маркер не найден</Text>
        <Text style={styles.text}>Маркер был удалён или ссылка неверна.</Text>
        <Button title="Вернуться к карте" onPress={goBack} />
      </SafeAreaView>
    );
  }

  return <MarkerDetails key={marker.id} marker={marker} onBack={goBack} />;
}

function MarkerDetails({ marker, onBack }: { marker: MapMarker; onBack: () => void }) {
  const { addImage, deleteImage, deleteMarker, getMarkerImages, isLoading } = useDatabase();
  const [images, setImages] = useState<MarkerImage[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [isPicking, setIsPicking] = useState(false);
  const busy = isPicking || isLoading;

  useFocusEffect(useCallback(() => {
    let active = true;
    setLoadError(null);
    void getMarkerImages(marker.id).then(
      (savedImages) => {
        if (active) setImages(savedImages);
      },
      (error: Error) => {
        if (active) setLoadError(error.message);
      },
    );
    return () => {
      active = false;
    };
  }, [getMarkerImages, loadAttempt, marker.id]));

  async function pickImage() {
    if (busy) return;
    setIsPicking(true);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 1,
      }).catch(() => {
        Alert.alert('Ошибка выбора изображения', 'Не удалось открыть галерею. Проверьте разрешения приложения.');
        return null;
      });
      if (!result || result.canceled) return;

      const uri = result.assets[0]?.uri;
      if (!uri) {
        Alert.alert('Ошибка изображения', 'Не удалось получить фотографию. Выберите другую.');
        return;
      }
      const savedImage = await addImage(marker.id, uri);
      setImages((current) => current && [...current, savedImage]);
    } catch (error) {
      Alert.alert('Ошибка сохранения', error instanceof Error ? error.message : 'Попробуйте ещё раз.');
    } finally {
      setIsPicking(false);
    }
  }

  async function removeImage(id: number) {
    if (busy) return;
    try {
      await deleteImage(id);
      setImages((current) => current?.filter((image) => image.id !== id) ?? null);
    } catch (error) {
      Alert.alert('Ошибка удаления', error instanceof Error ? error.message : 'Попробуйте ещё раз.');
    }
  }

  async function removeMarker() {
    try {
      await deleteMarker(marker.id);
      onBack();
    } catch (error) {
      Alert.alert('Ошибка удаления', error instanceof Error ? error.message : 'Попробуйте ещё раз.');
    }
  }

  function confirmMarkerDeletion() {
    Alert.alert('Удалить маркер?', 'Все привязанные к нему фотографии будут удалены из приложения.', [
      { text: 'Отмена', style: 'cancel' },
      { text: 'Удалить', style: 'destructive', onPress: removeMarker },
    ]);
  }

  return (
    <SafeAreaView edges={['bottom']} style={styles.screen}>
      <View style={styles.info}>
        <Text style={styles.title}>Маркер {marker.id}</Text>
        <Text style={styles.text}>Широта: {marker.coordinate.latitude.toFixed(6)}</Text>
        <Text style={styles.text}>Долгота: {marker.coordinate.longitude.toFixed(6)}</Text>
        {images && !loadError && <Text style={styles.count}>Изображений: {images.length}</Text>}
      </View>
      <Button
        title={isPicking ? 'Добавляем изображение…' : 'Добавить изображение'}
        onPress={pickImage}
        disabled={busy || !!loadError || images === null}
      />
      {busy && <ActivityIndicator style={styles.loader} color="#2563eb" />}
      {loadError ? (
        <View style={styles.listError}>
          <Text style={styles.text}>{loadError}</Text>
          <Button title="Повторить загрузку" onPress={() => setLoadAttempt((attempt) => attempt + 1)} />
        </View>
      ) : images && (
        <ImageList images={images} onRemove={removeImage} disabled={busy} />
      )}
      <Button title="Удалить маркер" color="#dc2626" onPress={confirmMarkerDeletion} disabled={busy} />
      <Button title="Вернуться к карте" onPress={onBack} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, paddingHorizontal: 16, backgroundColor: '#fff' },
  info: { paddingVertical: 20, gap: 8 },
  title: { fontSize: 22, fontWeight: 'bold', color: '#172033' },
  text: { fontSize: 16, lineHeight: 24, color: '#4b5563' },
  count: { marginTop: 4, fontSize: 16, fontWeight: 'bold', color: '#2563eb' },
  loader: { marginTop: 12 },
  listError: { paddingVertical: 16, gap: 8 },
  missing: { flex: 1, padding: 24, justifyContent: 'center', gap: 16, backgroundColor: '#fff' },
});
