import { Component, type ReactNode } from 'react';
import { Button, StyleSheet, Text, View } from 'react-native';

// try/catch не ловит ошибки отрисовки React, поэтому карту оборачиваем в Error Boundary.
export default class MapErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <Text style={styles.title}>Не удалось открыть карту</Text>
          <Text style={styles.text}>Проверьте интернет и запускайте приложение в Expo Go.</Text>
          <Button title="Повторить" onPress={() => this.setState({ hasError: false })} />
        </View>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, gap: 16 },
  title: { fontSize: 20, fontWeight: 'bold', textAlign: 'center' },
  text: { fontSize: 16, textAlign: 'center', color: '#4b5563' },
});
