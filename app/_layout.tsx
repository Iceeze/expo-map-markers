import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { DatabaseProvider } from '../contexts/DatabaseContext';
import { LocationProvider } from '../contexts/LocationContext';

export default function RootLayout() {
  return (
    <DatabaseProvider>
      <StatusBar style="dark" />
      <LocationProvider>
        <Stack screenOptions={{ headerBackTitle: 'Карта' }}>
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="marker/[id]" options={{ title: 'Детали маркера', headerTransparent: false }} />
          <Stack.Screen name="+not-found" options={{ title: 'Экран не найден' }} />
        </Stack>
      </LocationProvider>
    </DatabaseProvider>
  );
}
