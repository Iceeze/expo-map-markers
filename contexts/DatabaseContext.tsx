import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { openDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite';
import * as operations from '../database/operations';
import { initializeDatabase } from '../database/schema';
import type { MapMarker, MarkerImage } from '../types';

interface DatabaseContextValue {
  markers: MapMarker[];
  addMarker: (latitude: number, longitude: number) => Promise<number>;
  deleteMarker: (id: number) => Promise<void>;
  getMarkers: () => Promise<MapMarker[]>;
  addImage: (markerId: number, uri: string) => Promise<MarkerImage>;
  deleteImage: (id: number) => Promise<void>;
  getMarkerImages: (markerId: number) => Promise<MarkerImage[]>;
  isReady: boolean;
  isLoading: boolean;
  error: Error | null;
  retryInitialization: () => void;
}

const DatabaseContext = createContext<DatabaseContextValue | null>(null);
let queue = Promise.resolve();

function enqueue<T>(operation: () => Promise<T>): Promise<T> {
  const result = queue.then(operation);
  queue = result.then(() => undefined, () => undefined);
  return result;
}

function databaseError(message: string, cause: unknown) {
  const details = cause instanceof Error ? cause.message : String(cause);
  if (__DEV__) console.error(`[SQLite] ${message}`, cause);

  if (/FOREIGN KEY constraint failed|SQLITE_CONSTRAINT_FOREIGNKEY/i.test(details)) {
    return new Error('Связанный маркер не найден. Вернитесь к карте и выберите маркер заново.');
  }
  if (/constraint failed|SQLITE_CONSTRAINT/i.test(details)) {
    return new Error('Данные нарушают ограничения базы. Проверьте их и попробуйте ещё раз.');
  }
  if (/database (?:table )?is locked|SQLITE_BUSY|SQLITE_LOCKED/i.test(details)) {
    return new Error('База данных занята. Попробуйте ещё раз.');
  }
  return new Error(message);
}

async function closeDatabase(db: SQLiteDatabase) {
  try {
    await db.closeAsync();
  } catch (error) {
    if (__DEV__) console.warn('[SQLite] Не удалось закрыть соединение', error);
  }
}

export function DatabaseProvider({ children }: { children: ReactNode }) {
  const database = useRef<SQLiteDatabase | null>(null);
  const [markers, setMarkers] = useState<MapMarker[]>([]);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [pending, setPending] = useState(0);

  useEffect(() => {
    let active = true;
    let connection: SQLiteDatabase | null = null;
    setIsReady(false);
    setPending(0);
    setError(null);

    void enqueue(async () => {
      if (!active) return;
      try {
        connection = await openDatabaseAsync('markers.db', { useNewConnection: true });
        await initializeDatabase(connection);
        const savedMarkers = await operations.getMarkers(connection);
        await operations.cleanPhotoStorage(connection);
        if (!active) return;

        database.current = connection;
        setMarkers(savedMarkers);
        setIsReady(true);
        if (__DEV__) console.info('[SQLite] База открыта, маркеры загружены');
      } catch (cause) {
        const message = connection
          ? 'Не удалось подготовить локальную базу данных.'
          : 'Не удалось открыть локальную базу данных.';
        const failure = databaseError(message, cause);
        if (connection) {
          await closeDatabase(connection);
          connection = null;
        }
        if (active) setError(failure);
      }
    });

    return () => {
      active = false;
      database.current = null;
      void enqueue(async () => {
        if (connection) await closeDatabase(connection);
      });
    };
  }, [attempt]);

  const run = useCallback(async <T,>(action: string, operation: (db: SQLiteDatabase) => Promise<T>) => {
    const db = database.current;
    if (!db) throw new Error('Соединение с базой данных ещё не открыто.');

    setPending((count) => count + 1);
    return enqueue(async () => {
      if (database.current === db) setError(null);
      try {
        const result = await operation(db);
        if (__DEV__) console.info(`[SQLite] ${action} — готово`);
        return result;
      } catch (cause) {
        const failure = databaseError(`Не удалось ${action}. Попробуйте ещё раз.`, cause);
        if (database.current === db) setError(failure);
        throw failure;
      } finally {
        if (database.current === db) setPending((count) => count - 1);
      }
    });
  }, []);

  const actions = useMemo(() => ({
    addMarker: (latitude: number, longitude: number) => run('добавить маркер', async (db) => {
      const id = await operations.addMarker(db, latitude, longitude);
      if (database.current === db) {
        setMarkers((current) => [...current, { id, coordinate: { latitude, longitude } }]);
      }
      return id;
    }),
    deleteMarker: (id: number) => run('удалить маркер', async (db) => {
      await operations.deleteMarker(db, id);
      if (database.current === db) setMarkers((current) => current.filter((marker) => marker.id !== id));
    }),
    getMarkers: () => run('загрузить маркеры', operations.getMarkers),
    addImage: (markerId: number, uri: string) => run('сохранить фотографию', (db) => operations.addImage(db, markerId, uri)),
    deleteImage: (id: number) => run('удалить фотографию', (db) => operations.deleteImage(db, id)),
    getMarkerImages: (markerId: number) => run('загрузить фотографии', (db) => operations.getMarkerImages(db, markerId)),
  }), [run]);

  function retryInitialization() {
    if (isReady || !error) return;
    setError(null);
    setAttempt((current) => current + 1);
  }

  return (
    <DatabaseContext.Provider value={{
      ...actions,
      markers,
      isReady,
      isLoading: isReady ? pending > 0 : error === null,
      error,
      retryInitialization,
    }}>
      {children}
    </DatabaseContext.Provider>
  );
}

export function useDatabase() {
  const context = useContext(DatabaseContext);
  if (!context) throw new Error('useDatabase нужно использовать внутри DatabaseProvider.');
  return context;
}
