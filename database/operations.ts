import type { SQLiteDatabase } from 'expo-sqlite';
import type { MapMarker, MarkerImage } from '../types';
import { copyPhoto, photoUriForDisplay, removePhoto, removeUnusedPhotos } from './photos';

interface MarkerRow {
  id: number;
  latitude: number;
  longitude: number;
}

export async function getMarkers(db: SQLiteDatabase): Promise<MapMarker[]> {
  const rows = await db.getAllAsync<MarkerRow>('SELECT id, latitude, longitude FROM markers ORDER BY id');
  return rows.map(({ id, latitude, longitude }) => ({ id, coordinate: { latitude, longitude } }));
}

export async function addMarker(db: SQLiteDatabase, latitude: number, longitude: number) {
  const result = await db.runAsync('INSERT INTO markers (latitude, longitude) VALUES (?, ?)', latitude, longitude);
  return result.lastInsertRowId;
}

export async function deleteMarker(db: SQLiteDatabase, id: number) {
  let images: { uri: string }[] = [];
  await db.withTransactionAsync(async () => {
    images = await db.getAllAsync<{ uri: string }>('SELECT uri FROM marker_images WHERE marker_id = ?', id);
    await db.runAsync('DELETE FROM markers WHERE id = ?', id);
  });
  for (const { uri } of images) removePhoto(uri);
}

export async function getMarkerImages(db: SQLiteDatabase, markerId: number): Promise<MarkerImage[]> {
  const rows = await db.getAllAsync<MarkerImage>(
    'SELECT id, uri FROM marker_images WHERE marker_id = ? ORDER BY id',
    markerId,
  );
  return rows.map(({ id, uri }) => ({ id, uri: photoUriForDisplay(uri) }));
}

export async function addImage(db: SQLiteDatabase, markerId: number, sourceUri: string): Promise<MarkerImage> {
  const uri = await copyPhoto(sourceUri);
  try {
    const displayUri = photoUriForDisplay(uri);
    const result = await db.runAsync('INSERT INTO marker_images (marker_id, uri) VALUES (?, ?)', markerId, uri);
    return { id: result.lastInsertRowId, uri: displayUri };
  } catch (error) {
    removePhoto(uri);
    throw error;
  }
}

export async function deleteImage(db: SQLiteDatabase, id: number) {
  const [image] = await db.getAllAsync<{ uri: string }>('DELETE FROM marker_images WHERE id = ? RETURNING uri', id);
  if (image) removePhoto(image.uri);
}

export async function cleanPhotoStorage(db: SQLiteDatabase) {
  try {
    const rows = await db.getAllAsync<{ uri: string }>('SELECT uri FROM marker_images');
    removeUnusedPhotos(new Set(rows.map(({ uri }) => uri)));
  } catch (error) {
    if (__DEV__) console.warn('[Фото] Не удалось очистить локальные копии', error);
  }
}
