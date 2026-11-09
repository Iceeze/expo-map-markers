import { sql } from 'drizzle-orm';
import { customType, index, integer, real, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import type { SQLiteDatabase } from 'expo-sqlite';
import { initialSchema } from './migrations/001-initial';
import { imageIndex } from './migrations/002-image-index';

const datetime = customType<{ data: string }>({ dataType: () => 'DATETIME' });

export const markers = sqliteTable('markers', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  latitude: real('latitude').notNull(),
  longitude: real('longitude').notNull(),
  createdAt: datetime('created_at').default(sql`CURRENT_TIMESTAMP`),
});

export const markerImages = sqliteTable(
  'marker_images',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    markerId: integer('marker_id')
      .notNull()
      .references(() => markers.id, { onDelete: 'cascade' }),
    uri: text('uri').notNull(),
    createdAt: datetime('created_at').default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [index('idx_marker_images_marker_id').on(table.markerId)],
);

const migrations = [initialSchema, imageIndex];

export async function initializeDatabase(db: SQLiteDatabase) {
  await db.execAsync(`
    PRAGMA busy_timeout = 3000;
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;
  `);

  let previousVersion = 0;
  await db.withTransactionAsync(async () => {
    const version = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
    if (!version || version.user_version < 0 || version.user_version > migrations.length) {
      throw new Error('Версия схемы базы данных не поддерживается.');
    }

    previousVersion = version.user_version;
    for (let index = previousVersion; index < migrations.length; index += 1) {
      await db.execAsync(migrations[index]);
      await db.execAsync(`PRAGMA user_version = ${index + 1}`);
    }
  });

  if (__DEV__ && previousVersion !== migrations.length) {
    console.info(`[SQLite] Схема обновлена с версии ${previousVersion} до ${migrations.length}`);
  }
}
