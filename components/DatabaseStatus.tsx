import { ActivityIndicator, Button, StyleSheet, Text, View } from 'react-native';
import { useDatabase } from '../contexts/DatabaseContext';

export default function DatabaseStatus() {
  const { error, retryInitialization } = useDatabase();

  return (
    <View style={styles.container}>
      {error ? (
        <>
          <Text style={styles.text}>{error.message}</Text>
          <Button title="Повторить" onPress={retryInitialization} />
        </>
      ) : (
        <>
          <ActivityIndicator size="large" color="#2563eb" />
          <Text style={styles.text}>Загрузка локальной базы данных…</Text>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12, backgroundColor: '#fff' },
  text: { fontSize: 16, textAlign: 'center', color: '#172033' },
});
