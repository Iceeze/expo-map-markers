import { eq } from 'drizzle-orm';
import type { ExpoSQLiteDatabase } from 'drizzle-orm/expo-sqlite';
import { copyPhoto, photoUriForDisplay, removePhoto, removeUnusedPhotos } from './photos';
import { markerImages, markers } from './schema';

export function getMarkers(db: ExpoSQLiteDatabase) {
  const rows = db
    .select({ id: markers.id, latitude: markers.latitude, longitude: markers.longitude })
    .from(markers)
    .orderBy(markers.id)
    .all();

  return rows.map(({ id, latitude, longitude }) => ({ id, coordinate: { latitude, longitude } }));
}

export function addMarker(db: ExpoSQLiteDatabase, latitude: number, longitude: number) {
  const { lastInsertRowId } = db.insert(markers).values({ latitude, longitude }).run();
  return lastInsertRowId;
}

export function deleteMarker(db: ExpoSQLiteDatabase, id: number) {
  const images = db.transaction((tx) => {
    const rows = tx
      .select({ uri: markerImages.uri })
      .from(markerImages)
      .where(eq(markerImages.markerId, id))
      .all();

    tx.delete(markers).where(eq(markers.id, id)).run();
    return rows;
  });

  for (const { uri } of images) removePhoto(uri);
}

export function getMarkerImages(db: ExpoSQLiteDatabase, markerId: number) {
  const rows = db
    .select({ id: markerImages.id, uri: markerImages.uri })
    .from(markerImages)
    .where(eq(markerImages.markerId, markerId))
    .orderBy(markerImages.id)
    .all();

  return rows.map(({ id, uri }) => ({ id, uri: photoUriForDisplay(uri) }));
}

export async function addImage(db: ExpoSQLiteDatabase, markerId: number, sourceUri: string) {
  const uri = await copyPhoto(sourceUri);
  try {
    const displayUri = photoUriForDisplay(uri);
    const { lastInsertRowId } = db.insert(markerImages).values({ markerId, uri }).run();
    return { id: lastInsertRowId, uri: displayUri };
  } catch (error) {
    removePhoto(uri);
    throw error;
  }
}

export function deleteImage(db: ExpoSQLiteDatabase, id: number) {
  const [image] = db
    .delete(markerImages)
    .where(eq(markerImages.id, id))
    .returning({ uri: markerImages.uri })
    .all();

  if (image) removePhoto(image.uri);
}

export function cleanPhotoStorage(db: ExpoSQLiteDatabase) {
  try {
    const rows = db.select({ uri: markerImages.uri }).from(markerImages).all();
    removeUnusedPhotos(new Set(rows.map(({ uri }) => uri)));
  } catch (error) {
    if (__DEV__) console.warn('[Фото] Не удалось очистить локальные копии', error);
  }
}
