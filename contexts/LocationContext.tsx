import * as Location from 'expo-location';
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';
import { prepareNotifications, proximityMonitor } from '../services/notifications';
import { useDatabase } from './DatabaseContext';

interface LocationState {
  location: Location.LocationObject | null;
  locationError: string | null;
  notificationError: string | null;
  retry: () => void;
}

const LocationContext = createContext<LocationState | null>(null);

export function LocationProvider({ children }: { children: ReactNode }) {
  const { markers, isReady } = useDatabase();
  const [appState, setAppState] = useState(AppState.currentState);
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [notificationError, setNotificationError] = useState<string | null>(null);
  const [notificationsAllowed, setNotificationsAllowed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const locationPromptAttempt = useRef(-1);
  const notificationPromptAttempt = useRef(-1);

  const inForeground = appState === 'active' || appState === 'inactive';

  useEffect(() => {
    const subscription = AppState.addEventListener('change', setAppState);
    setAppState(AppState.currentState);
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    setLocation(null);
    setNotificationsAllowed(false);
    if (!inForeground || !isReady) return;

    let cancelled = false;
    let subscription: Location.LocationSubscription | undefined;
    setLocationError(null);
    setNotificationError(null);

    async function setup() {
      try {
        const servicesEnabled = await Location.hasServicesEnabledAsync();
        if (cancelled) return;
        if (!servicesEnabled) {
          throw new Error('Службы геолокации выключены. Включите их в настройках устройства.');
        }

        let permission = await Location.getForegroundPermissionsAsync();
        if (cancelled) return;
        if (!permission.granted && permission.canAskAgain && locationPromptAttempt.current !== attempt) {
          locationPromptAttempt.current = attempt;
          permission = await Location.requestForegroundPermissionsAsync();
        }
        if (cancelled) return;
        if (!permission.granted) {
          throw new Error('Доступ к местоположению запрещён. Разрешите его в настройках устройства.');
        }

        subscription = await Location.watchPositionAsync({
          accuracy: Location.Accuracy.Balanced,
          distanceInterval: 5,
          timeInterval: 5000,
        }, (position) => {
          if (cancelled) return;
          setLocation(position);
          setLocationError(null);
        }, (message) => {
          if (cancelled) return;
          setLocation(null);
          setLocationError(`Ошибка геолокации. ${message}`);
        });
        if (cancelled) subscription.remove();
      } catch (error) {
        if (!cancelled) {
          setLocationError(error instanceof Error ? error.message : 'Не удалось определить местоположение.');
        }
      }

      if (cancelled) return;
      try {
        await prepareNotifications(() => {
          if (cancelled || notificationPromptAttempt.current === attempt) return false;
          notificationPromptAttempt.current = attempt;
          return true;
        });
        if (!cancelled) setNotificationsAllowed(true);
      } catch (error) {
        if (!cancelled) {
          setNotificationError(error instanceof Error ? error.message : 'Не удалось настроить уведомления.');
        }
      }
    }

    void setup();
    return () => {
      cancelled = true;
      subscription?.remove();
    };
  }, [attempt, inForeground, isReady]);

  useEffect(() => {
    if (!isReady || appState !== 'active') return;
    let obsolete = false;
    void proximityMonitor.update(
      location?.coords ?? null,
      markers,
      () => !obsolete && notificationsAllowed && AppState.currentState === 'active',
    ).then(() => {
      if (!obsolete && notificationsAllowed) setNotificationError(null);
    }).catch((error: Error) => {
      if (!obsolete) setNotificationError(error.message);
    });
    return () => { obsolete = true; };
  }, [appState, isReady, location, markers, notificationsAllowed]);

  return (
    <LocationContext.Provider value={{
      location: inForeground ? location : null,
      locationError,
      notificationError,
      retry: () => setAttempt((current) => current + 1),
    }}>
      {children}
    </LocationContext.Provider>
  );
}

export function useLocation() {
  const context = useContext(LocationContext);
  if (!context) throw new Error('useLocation нужно использовать внутри LocationProvider.');
  return context;
}
