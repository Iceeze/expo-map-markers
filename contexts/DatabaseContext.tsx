import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { drizzle, type ExpoSQLiteDatabase } from 'drizzle-orm/expo-sqlite';
import { openDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite';
import * as operations from '../database/operations';
import { initializeDatabase } from '../database/schema';
import type { MapMarker } from '../types';

let queue = Promise.resolve();

function enqueue<T>(operation: () => Promise<T>) {
  const result = queue.then(operation);
  queue = result.then(() => undefined, () => undefined);
  return result;
}

function databaseError(message: string, cause: unknown) {
  const reason = cause instanceof Error ? cause.cause ?? cause : cause;
  const details = reason instanceof Error ? reason.message : String(reason);

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

function useDatabaseValue() {
  const database = useRef<ExpoSQLiteDatabase | null>(null);
  
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
        if (!active) return;

        const db = drizzle(connection);
        const savedMarkers = operations.getMarkers(db);
        operations.cleanPhotoStorage(db);

        database.current = db;
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

  const actions = useMemo(() => {
    async function run<T>(action: string, operation: (db: ExpoSQLiteDatabase) => T) {
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
    }

    return {
      addMarker: (latitude: number, longitude: number) => run('добавить маркер', (db) => {
        const id = operations.addMarker(db, latitude, longitude);
        if (database.current === db) {
          setMarkers((current) => [...current, { id, coordinate: { latitude, longitude } }]);
        }
        return id;
      }),
      deleteMarker: (id: number) => run('удалить маркер', (db) => {
        operations.deleteMarker(db, id);
        if (database.current === db) setMarkers((current) => current.filter((marker) => marker.id !== id));
      }),
      getMarkers: () => run('загрузить маркеры', operations.getMarkers),
      addImage: (markerId: number, uri: string) =>
        run('сохранить фотографию', (db) => operations.addImage(db, markerId, uri)),
      deleteImage: (id: number) => run('удалить фотографию', (db) => operations.deleteImage(db, id)),
      getMarkerImages: (markerId: number) =>
        run('загрузить фотографии', (db) => operations.getMarkerImages(db, markerId)),
    };
  }, []);

  function retryInitialization() {
    if (isReady || !error) return;
    setError(null);
    setAttempt((current) => current + 1);
  }

  return {
    ...actions,
    markers,
    isReady,
    isLoading: isReady ? pending > 0 : error === null,
    error,
    retryInitialization,
  };
}

const DatabaseContext = createContext<ReturnType<typeof useDatabaseValue> | null>(null);

export function DatabaseProvider({ children }: { children: ReactNode }) {
  const value = useDatabaseValue();
  return <DatabaseContext.Provider value={value}>{children}</DatabaseContext.Provider>;
}

export function useDatabase() {
  const context = useContext(DatabaseContext);
  if (!context) throw new Error('useDatabase нужно использовать внутри DatabaseProvider.');
  return context;
}
