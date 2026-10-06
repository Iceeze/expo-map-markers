import { Link } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

export default function NotFoundScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Экран не найден</Text>
      <Text style={styles.text}>В приложении нет такого адреса.</Text>
      <Link href="/" replace style={styles.link}>Вернуться к карте</Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, gap: 16 },
  title: { fontSize: 22, fontWeight: 'bold' },
  text: { fontSize: 16, color: '#4b5563' },
  link: { fontSize: 18, color: '#2563eb', padding: 12 },
});
