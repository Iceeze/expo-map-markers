import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { PROXIMITY_RADIUS_METERS, ProximityMonitor } from './proximity';

const notificationPrefix = 'marker-proximity-';
const channelId = 'marker-proximity';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: Platform.OS === 'android',
    shouldSetBadge: false,
  }),
});

function isAllowed(permission: Notifications.NotificationPermissionsStatus) {
  const status = permission.ios?.status;
  if (status === undefined) return permission.granted;

  return status === Notifications.IosAuthorizationStatus.AUTHORIZED
    || status === Notifications.IosAuthorizationStatus.PROVISIONAL
    || status === Notifications.IosAuthorizationStatus.EPHEMERAL;
}

let startupCleanup: Promise<void> | undefined;

function clearPreviousSessionNotifications() {
  startupCleanup ??= (async () => {
    const presented = await Notifications.getPresentedNotificationsAsync();
    for (const { request } of presented) {
      if (request.identifier.startsWith(notificationPrefix)) {
        await Notifications.dismissNotificationAsync(request.identifier);
      }
    }
  })().catch((error) => {
    startupCleanup = undefined;
    throw error;
  });
  return startupCleanup;
}

export async function prepareNotifications(shouldRequest: () => boolean) {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(channelId, {
      name: 'Метки поблизости',
      importance: Notifications.AndroidImportance.HIGH,
    });
  }

  let permission = await Notifications.getPermissionsAsync();
  if (!isAllowed(permission) && permission.canAskAgain && shouldRequest()) {
    permission = await Notifications.requestPermissionsAsync({
      ios: { allowAlert: true, allowBadge: false, allowSound: false },
    });
  }
  if (!isAllowed(permission)) {
    throw new Error('Уведомления запрещены. Разрешите их в настройках устройства.');
  }

  await clearPreviousSessionNotifications();
}

export const proximityMonitor = new ProximityMonitor({
  show: (markerId) => Notifications.scheduleNotificationAsync({
    identifier: `${notificationPrefix}${markerId}`,
    content: {
      title: 'Вы рядом с меткой!',
      body: `Метка №${markerId} находится в пределах ${PROXIMITY_RADIUS_METERS} м.`,
    },
    trigger: Platform.OS === 'android' ? { channelId } : null,
  }),
  remove: async (notificationId) => {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
    await Notifications.dismissNotificationAsync(notificationId);
  },
});
