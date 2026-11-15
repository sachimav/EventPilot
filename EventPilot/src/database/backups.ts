import type { SQLiteBindValue } from 'expo-sqlite';
import { initializeDatabase } from './database';
import { SCHEMA_VERSION } from './schema';
import { notifyDataChanges } from './dataChanges';
import { notifyTaskChanges } from './taskChanges';

export const backupTables = ['Events','Tasks','Activities','Vendors','Expenses','Guests','Payments','Receipts','Reminders'] as const;
type Table = typeof backupTables[number];
type BackupRow = Record<string, string | number | null>;
export interface Backup { format: 'eventpilot-backup'; schemaVersion: number; exportedAt: string; tables: Record<Table, BackupRow[]> }

export async function exportBackup(): Promise<string> {
  const db = await initializeDatabase();
  const tables = {} as Backup['tables'];
  await db.withTransactionAsync(async () => {
    for (const table of backupTables) tables[table] = await db.getAllAsync<BackupRow>(`SELECT * FROM ${table} ORDER BY id`);
  });
  const output = JSON.stringify({ format: 'eventpilot-backup', schemaVersion: SCHEMA_VERSION, exportedAt: new Date().toISOString(), tables }, null, 2);
  if (new TextEncoder().encode(output).length > 10 * 1024 * 1024) throw new Error('Backup exceeds the 10 MB limit. Reduce large receipt attachments before exporting.');
  return output;
}

export function parseBackup(text: string): Backup {
  if (text.length > 10 * 1024 * 1024) throw new Error('Backup exceeds the 10 MB import limit.');
  const backup = JSON.parse(text) as Backup;
  if (!backup || backup.format !== 'eventpilot-backup' || backup.schemaVersion !== SCHEMA_VERSION || !backup.tables) throw new Error('This is not a compatible EventPilot backup.');
  for (const table of backupTables) {
    const rows = backup.tables[table];
    if (!Array.isArray(rows) || rows.length > 50000) throw new Error(`Invalid ${table} data.`);
    const ids = new Set<number>();
    for (const row of rows) {
      if (!row || typeof row !== 'object' || !Number.isSafeInteger(row.id) || Number(row.id) <= 0 || ids.has(Number(row.id))) throw new Error(`Invalid or duplicate ${table} ID.`);
      ids.add(Number(row.id));
      for (const value of Object.values(row)) if (value !== null && typeof value !== 'string' && (typeof value !== 'number' || !Number.isSafeInteger(value))) throw new Error('Unsupported backup value.');
    }
  }
  return backup;
}

/** Non-destructive import: append with fresh IDs, remap all foreign keys, roll back on error. */
export async function restoreBackup(text: string): Promise<number> {
  const backup = parseBackup(text); const db = await initializeDatabase();
  const maps = new Map<Table, Map<number,number>>(); let imported = 0;
  await db.withTransactionAsync(async () => {
    for (const table of backupTables) {
      const schema = await db.getAllAsync<{ name: string }>(`PRAGMA table_info(${table})`);
      const allowed = new Set(schema.map((column) => column.name));
      const ids = new Map<number,number>(); maps.set(table, ids);
      for (const original of backup.tables[table]) {
        const row = { ...original }; const oldId = Number(row.id); delete row.id;
        for (const key of Object.keys(row)) if (!allowed.has(key)) throw new Error(`Unknown ${table} field: ${key}`);
        for (const [field,parent] of [['event_id','Events'],['vendor_id','Vendors'],['expense_id','Expenses']] as [string,Table][]) {
          if (field in row && row[field] !== null) {
            const mapped = maps.get(parent)?.get(Number(row[field]));
            if (!mapped) throw new Error(`Missing ${parent} reference in backup.`);
            row[field] = mapped;
          }
        }
        const keys = Object.keys(row);
        const result = await db.runAsync(`INSERT INTO ${table} (${keys.join(',')}) VALUES (${keys.map(() => '?').join(',')})`, Object.values(row) as SQLiteBindValue[]);
        ids.set(oldId, result.lastInsertRowId); imported += 1;
      }
    }
    if ((await db.getAllAsync('PRAGMA foreign_key_check')).length) throw new Error('Backup contains invalid relationships.');
  });
  notifyDataChanges(); notifyTaskChanges(); return imported;
}
