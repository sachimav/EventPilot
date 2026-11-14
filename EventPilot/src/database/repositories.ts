import type { SQLiteBindValue } from 'expo-sqlite';
import { initializeDatabase } from './database';

interface RecordBase { id: number; created_at: string; updated_at: string }
export interface Event extends RecordBase {
  name: string; date: string | null; location: string; notes: string;
  budget_cents: number; currency: string;
  category: string; time: string | null;
}
export type TaskPriority = 'low' | 'medium' | 'high';
export interface Task extends RecordBase {
  event_id: number; title: string; notes: string; due_at: string | null; completed: 0 | 1;
  priority: TaskPriority;
}
export interface Expense extends RecordBase {
  event_id: number; title: string; amount_cents: number; category: string;
  incurred_at: string | null; notes: string; estimated_cents: number;
}
export interface Activity extends RecordBase {
  event_id: number; title: string; starts_at: string | null; ends_at: string | null;
  location: string; notes: string;
}
type Writable<T> = Omit<T, keyof RecordBase>;
type Create<T, K extends keyof Writable<T>> = Pick<Writable<T>, K> & Partial<Writable<T>>;
export type CreateEvent = Create<Event, 'name'>;
export type CreateTask = Create<Task, 'event_id' | 'title'>;
export type CreateExpense = Create<Expense, 'event_id' | 'title' | 'amount_cents'>;
export type CreateActivity = Create<Activity, 'event_id' | 'title'>;

function assertId(id: number) {
  if (!Number.isSafeInteger(id) || id <= 0) throw new TypeError('IDs must be positive safe integers.');
}

// Table names and identifiers originate only from the fixed definitions below.
// Reject unexpected properties even when called from untyped JavaScript.
function repository<T extends RecordBase, Input>(table: string, columns: readonly string[]) {
  function bindings(input: object) {
    const entries = Object.entries(input);
    for (const [key, value] of entries) {
      if (!columns.includes(key)) throw new TypeError(`Unknown ${table} field: ${key}`);
      if (value === undefined || (value !== null && typeof value !== 'string' && typeof value !== 'number')) {
        throw new TypeError(`Invalid value for ${key}; omit optional fields rather than passing undefined.`);
      }
      if (typeof value === 'number' && (!Number.isFinite(value) || !Number.isSafeInteger(value))) {
        throw new TypeError(`${key} must be a safe integer.`);
      }
      if (key === 'event_id') assertId(value as number);
    }
    return { keys: entries.map(([key]) => key), values: entries.map(([, value]) => value as SQLiteBindValue) };
  }
  return {
    async create(input: Input & object): Promise<number> {
      const { keys, values } = bindings(input);
      if (!keys.length) throw new TypeError('Create requires fields.');
      const db = await initializeDatabase();
      const result = await db.runAsync(
        `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${keys.map(() => '?').join(', ')})`, values,
      );
      return result.lastInsertRowId;
    },
    async getById(id: number): Promise<T | null> {
      assertId(id);
      const db = await initializeDatabase();
      return db.getFirstAsync<T>(`SELECT * FROM ${table} WHERE id = ?`, [id]);
    },
    async update(id: number, input: Partial<Writable<T>>): Promise<boolean> {
      assertId(id);
      const { keys, values } = bindings(input);
      if (!keys.length) throw new TypeError('Update requires at least one field.');
      const db = await initializeDatabase();
      const result = await db.runAsync(
        `UPDATE ${table} SET ${keys.map((key) => `${key} = ?`).join(', ')}, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = ?`,
        [...values, id],
      );
      return result.changes > 0;
    },
    async delete(id: number): Promise<boolean> {
      assertId(id);
      const db = await initializeDatabase();
      const result = await db.runAsync(`DELETE FROM ${table} WHERE id = ?`, [id]);
      return result.changes > 0;
    },
  };
}

function childRepository<T extends RecordBase, Input>(table: string, columns: readonly string[]) {
  return {
    ...repository<T, Input>(table, columns),
    async listByEvent(eventId: number): Promise<T[]> {
      assertId(eventId);
      const db = await initializeDatabase();
      return db.getAllAsync<T>(`SELECT * FROM ${table} WHERE event_id = ? ORDER BY id ASC`, [eventId]);
    },
  };
}

export const events = {
  ...repository<Event, CreateEvent>('Events', ['name', 'date', 'time', 'category', 'location', 'notes', 'budget_cents', 'currency']),
  async list(): Promise<Event[]> {
    const db = await initializeDatabase();
    return db.getAllAsync<Event>('SELECT * FROM Events ORDER BY id DESC');
  },
};
export const tasks = {
  ...childRepository<Task, CreateTask>('Tasks', ['event_id', 'title', 'notes', 'due_at', 'completed', 'priority']),
  async list(): Promise<Task[]> {
    const db = await initializeDatabase();
    return db.getAllAsync<Task>('SELECT * FROM Tasks ORDER BY id ASC');
  },
};
export const expenses = {
  ...childRepository<Expense, CreateExpense>('Expenses', ['event_id', 'title', 'amount_cents', 'estimated_cents', 'category', 'incurred_at', 'notes']),
  async list(): Promise<Expense[]> {
    const db = await initializeDatabase();
    return db.getAllAsync<Expense>('SELECT * FROM Expenses ORDER BY id DESC');
  },
};
export const activities = childRepository<Activity, CreateActivity>('Activities', ['event_id', 'title', 'starts_at', 'ends_at', 'location', 'notes']);
