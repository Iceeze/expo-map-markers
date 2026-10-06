import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { MarkersProvider } from '../context/MarkersContext';

export default function RootLayout() {
  return (
    <MarkersProvider>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerBackTitle: 'Карта' }}>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="marker/[id]" options={{ title: 'Детали маркера' }} />
        <Stack.Screen name="+not-found" options={{ title: 'Экран не найден' }} />
      </Stack>
    </MarkersProvider>
  );
}
