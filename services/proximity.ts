import type { Coordinates, MapMarker } from '../types';

export const PROXIMITY_RADIUS_METERS = 100;

export function distanceInMeters(from: Coordinates, to: Coordinates) {
  const radians = Math.PI / 180;
  const latitude = (to.latitude - from.latitude) * radians;
  const longitude = (to.longitude - from.longitude) * radians;
  const haversine = Math.sin(latitude / 2) ** 2
    + Math.cos(from.latitude * radians) * Math.cos(to.latitude * radians)
    * Math.sin(longitude / 2) ** 2;
  return 2 * 6_371_000 * Math.asin(Math.sqrt(Math.min(1, haversine)));
}

interface ProximityNotifications {
  show(markerId: number): Promise<string>;
  remove(notificationId: string): Promise<void>;
}

export class ProximityMonitor {
  private active = new Map<number, string>();
  private queue = Promise.resolve();

  private readonly notifications: ProximityNotifications;

  constructor(notifications: ProximityNotifications) {
    this.notifications = notifications;
  }

  update(location: Coordinates | null, markers: MapMarker[], canNotify: () => boolean) {
    const operation = this.queue.then(async () => {
      const nearby = new Set<number>();
      const existing = new Set<number>();
      for (const marker of markers) {
        existing.add(marker.id);
        if (location && distanceInMeters(location, marker.coordinate) <= PROXIMITY_RADIUS_METERS) {
          nearby.add(marker.id);
        }
      }

      let failed = false;
      for (const [markerId, notificationId] of this.active) {
        if (existing.has(markerId) && (!location || nearby.has(markerId))) continue;
        try {
          await this.notifications.remove(notificationId);
          this.active.delete(markerId);
        } catch {
          failed = true;
        }
      }

      for (const markerId of nearby) {
        if (!canNotify()) break;
        if (this.active.has(markerId)) continue;
        try {
          const notificationId = await this.notifications.show(markerId);
          this.active.set(markerId, notificationId);
        } catch {
          failed = true;
        }
      }

      if (failed) throw new Error('Не удалось показать или убрать уведомление. Повторите попытку.');
    });
    this.queue = operation.catch(() => {});
    return operation;
  }
}
