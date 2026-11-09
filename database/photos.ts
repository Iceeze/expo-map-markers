import { randomUUID } from 'expo-crypto';
import { Directory, File, Paths } from 'expo-file-system';

const folderName = 'marker-photos';
const managedFileName = /^[\da-f-]{36}(?:\.[a-z\d]+)?$/i;

function isManagedPhoto(uri: string) {
  return uri.startsWith(`${folderName}/`) && managedFileName.test(uri.slice(folderName.length + 1));
}

export function photoUriForDisplay(uri: string) {
  return isManagedPhoto(uri) ? new File(Paths.document, uri).uri : uri;
}

export async function copyPhoto(sourceUri: string) {
  const source = new File(sourceUri);
  const folder = new Directory(Paths.document, folderName);
  folder.create({ idempotent: true, intermediates: true });

  const extension = /^\.[a-z\d]+$/i.test(source.extension) ? source.extension : '';
  const uri = `${folderName}/${randomUUID()}${extension}`;
  try {
    await source.copy(new File(Paths.document, uri));
    return uri;
  } catch (error) {
    removePhoto(uri);
    throw error;
  }
}

export function removePhoto(uri: string) {
  if (!isManagedPhoto(uri)) return;

  try {
    const file = new File(Paths.document, uri);
    if (file.exists) file.delete();
  } catch (error) {
    if (__DEV__) console.warn('[Фото] Не удалось удалить локальную копию', error);
  }
}

export function removeUnusedPhotos(usedUris: Set<string>) {
  const folder = new Directory(Paths.document, folderName);
  if (!folder.exists) return;

  for (const entry of folder.list()) {
    const uri = `${folderName}/${entry.name}`;
    if (entry instanceof File && !usedUris.has(uri) && !usedUris.has(entry.uri)) removePhoto(uri);
  }
}
