import { useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { ActivityIndicator, Alert, Button, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ImageList from '../../components/ImageList';
import { useMarkers } from '../../context/MarkersContext';

export default function MarkerScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const { markers, addImage, removeImage } = useMarkers();
  const [isPicking, setIsPicking] = useState(false);

  const id = typeof params.id === 'string' ? params.id : undefined;
  const marker = markers.find((item) => item.id === id);

  function goBack() {
    try {
      if (router.canGoBack()) router.back();
      else router.replace('/');
    } catch {
      Alert.alert('Ошибка навигации', 'Не удалось вернуться к карте. Откройте приложение заново.');
    }
  }

  async function pickImage() {
    if (!marker || isPicking) return;
    setIsPicking(true);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 1,
      });
      if (result.canceled) return;
      const image = result.assets[0];
      if (!image?.uri) {
        Alert.alert('Ошибка изображения', 'Не удалось получить фотографию. Выберите другую.');
        return;
      }
      addImage(marker.id, image.uri);
    } catch {
      Alert.alert(
        'Ошибка выбора изображения',
        'Не удалось открыть галерею или получить фотографию. Проверьте разрешения Expo Go в настройках телефона и попробуйте ещё раз.',
      );
    } finally {
      setIsPicking(false);
    }
  }

  if (!marker) {
    return (
      <SafeAreaView edges={['bottom']} style={styles.missing}>
        <Text style={styles.title}>Маркер не найден</Text>
        <Text style={styles.text}>Возможно, ссылка неверна или приложение было перезапущено.</Text>
        <Button title="Вернуться к карте" onPress={goBack} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['bottom']} style={styles.screen}>
      <View style={styles.info}>
        <Text style={styles.title}>Маркер {marker.id}</Text>
        <Text style={styles.text}>Широта: {marker.coordinate.latitude.toFixed(6)}</Text>
        <Text style={styles.text}>Долгота: {marker.coordinate.longitude.toFixed(6)}</Text>
        <Text style={styles.count}>Изображений: {marker.images.length}</Text>
      </View>
      <Button
        title={isPicking ? 'Открываем галерею…' : 'Добавить изображение'}
        onPress={pickImage}
        disabled={isPicking}
      />
      {isPicking && <ActivityIndicator style={styles.loader} color="#2563eb" />}
      <ImageList
        images={marker.images}
        onRemove={(imageId) => removeImage(marker.id, imageId)}
      />
      <Button title="Вернуться к карте" onPress={goBack} />
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
  missing: { flex: 1, padding: 24, justifyContent: 'center', gap: 16, backgroundColor: '#fff' },
});
