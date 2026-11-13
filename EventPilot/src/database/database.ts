import { openDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite';
import { migrations, SCHEMA_VERSION } from './schema';

export const DATABASE_NAME = 'eventpilot.db';
let databasePromise: Promise<SQLiteDatabase> | undefined;

/** Shared by startup and every repository call; no caller can use an unmigrated DB. */
export function initializeDatabase(): Promise<SQLiteDatabase> {
  if (!databasePromise) {
    databasePromise = openAndMigrate().catch((error) => {
      databasePromise = undefined;
      throw error;
    });
  }
  return databasePromise;
}

async function openAndMigrate(): Promise<SQLiteDatabase> {
  const db = await openDatabaseAsync(DATABASE_NAME);
  try {
    // foreign_keys must be enabled per connection, outside a transaction.
    await db.execAsync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;');
    // The connection is private until this transaction finishes. Using the standard
    // transaction API here also supports web, unlike exclusive transactions.
    await db.withTransactionAsync(async () => {
      const version = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
      const current = version?.user_version ?? 0;
      if (current > SCHEMA_VERSION) {
        throw new Error('This database was created by a newer version of EventPilot. Please update the app.');
      }
      for (let index = current; index < SCHEMA_VERSION; index += 1) {
        await db.execAsync(migrations[index]);
        // The number comes only from our migration array, never user input.
        await db.execAsync(`PRAGMA user_version = ${index + 1}`);
      }
    });
    return db;
  } catch (error) {
    await db.closeAsync().catch(() => {});
    throw error;
  }
}
