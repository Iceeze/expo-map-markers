import { useState } from 'react';
import { Button, FlatList, Image, StyleSheet, Text, View } from 'react-native';
import type { MarkerImage } from '../types';

interface ImageListProps {
  images: MarkerImage[];
  onRemove: (id: string) => void;
}

function ImageItem({ image, onRemove }: { image: MarkerImage; onRemove: () => void }) {
  const [failed, setFailed] = useState(false);

  return (
    <View style={styles.card}>
      {failed ? (
        <View style={[styles.image, styles.placeholder]}>
          <Text style={styles.text}>Изображение недоступно. Добавьте его заново.</Text>
        </View>
      ) : (
        <Image
          source={{ uri: image.uri }}
          style={styles.image}
          resizeMode="cover"
          accessibilityLabel="Фотография маркера"
          onError={() => setFailed(true)}
        />
      )}
      <Button title="Удалить изображение" color="#dc2626" onPress={onRemove} />
    </View>
  );
}

export default function ImageList({ images, onRemove }: ImageListProps) {
  return (
    <FlatList
      data={images}
      keyExtractor={(image) => image.id}
      contentContainerStyle={styles.list}
      ListEmptyComponent={
        <Text style={styles.empty}>Изображений пока нет. Выберите фотографию из галереи.</Text>
      }
      renderItem={({ item }) => <ImageItem image={item} onRemove={() => onRemove(item.id)} />}
    />
  );
}

const styles = StyleSheet.create({
  list: { paddingVertical: 16, gap: 16 },
  card: { backgroundColor: '#f3f4f6', borderRadius: 12, padding: 10, gap: 8 },
  image: { width: '100%', height: 220, borderRadius: 8 },
  placeholder: { alignItems: 'center', justifyContent: 'center', padding: 16 },
  text: { fontSize: 16, color: '#4b5563', textAlign: 'center' },
  empty: { paddingVertical: 24, fontSize: 16, lineHeight: 24, color: '#6b7280', textAlign: 'center' },
});
