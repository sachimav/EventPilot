import type { SQLiteBindValue } from 'expo-sqlite';
import { initializeDatabase } from './database';
import { notifyTaskChanges } from './taskChanges';
import { notifyDataChanges } from './dataChanges';

interface RecordBase { id: number; created_at: string; updated_at: string }
export interface Event extends RecordBase {
  name: string; date: string | null; location: string; notes: string;
  budget_cents: number; currency: string;
  category: string; time: string | null;
  status?: 'draft' | 'planning' | 'ready' | 'ongoing' | 'completed' | 'cancelled';
  end_date?: string | null; end_time?: string | null; archived_at?: string | null; deleted_at?: string | null;
}
export type TaskPriority = 'low' | 'medium' | 'high';
export interface Task extends RecordBase {
  event_id: number; title: string; notes: string; due_at: string | null; completed: 0 | 1;
  priority: TaskPriority;
}
export interface Expense extends RecordBase {
  event_id: number; title: string; amount_cents: number; category: string;
  incurred_at: string | null; notes: string; estimated_cents: number;
  vendor_id?: number | null;
  payment_due_at?: string | null;
}
export interface Activity extends RecordBase {
  event_id: number; title: string; starts_at: string | null; ends_at: string | null;
  location: string; notes: string;
}
export interface Guest extends RecordBase {
  event_id: number; name: string; email: string; phone: string; rsvp: string; plus_ones: number; dietary: string; checked_in: 0 | 1;
}
export interface Vendor extends RecordBase {
  event_id: number; name: string; service: string; contact: string; email: string; phone: string; quoted_cents: number; booking_status: string; notes: string;
}
export interface Payment extends RecordBase { expense_id: number; amount_cents: number; paid_at: string; method: string; notes: string }
export interface Receipt extends RecordBase { expense_id: number; name: string; mime_type: string; data_url: string }
export interface Reminder extends RecordBase { event_id: number; title: string; remind_at: string; dismissed: 0 | 1 }
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
      if (table === 'Tasks') notifyTaskChanges();
      if (table !== 'Activities') notifyDataChanges();
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
      if (table === 'Tasks' && result.changes > 0) notifyTaskChanges();
      if (result.changes > 0 && table !== 'Activities') notifyDataChanges();
      return result.changes > 0;
    },
    async delete(id: number): Promise<boolean> {
      assertId(id);
      const db = await initializeDatabase();
      const result = await db.runAsync(`DELETE FROM ${table} WHERE id = ?`, [id]);
      if ((table === 'Tasks' || table === 'Events') && result.changes > 0) notifyTaskChanges();
      if (result.changes > 0 && table !== 'Activities') notifyDataChanges();
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
  ...repository<Event, CreateEvent>('Events', ['name', 'date', 'time', 'category', 'location', 'notes', 'budget_cents', 'currency', 'status', 'end_date', 'end_time', 'archived_at', 'deleted_at']),
  async list(): Promise<Event[]> {
    const db = await initializeDatabase();
    return db.getAllAsync<Event>('SELECT * FROM Events WHERE deleted_at IS NULL AND archived_at IS NULL ORDER BY id DESC');
  },
  async inactive(): Promise<Event[]> {
    const db = await initializeDatabase();
    return db.getAllAsync<Event>('SELECT * FROM Events WHERE deleted_at IS NOT NULL OR archived_at IS NOT NULL ORDER BY updated_at DESC');
  },
};
export const tasks = {
  ...childRepository<Task, CreateTask>('Tasks', ['event_id', 'title', 'notes', 'due_at', 'completed', 'priority']),
  async list(): Promise<Task[]> {
    const db = await initializeDatabase();
    return db.getAllAsync<Task>('SELECT Tasks.* FROM Tasks JOIN Events ON Events.id = Tasks.event_id WHERE Events.deleted_at IS NULL AND Events.archived_at IS NULL ORDER BY Tasks.id ASC');
  },
};
export const expenses = {
  ...childRepository<Expense, CreateExpense>('Expenses', ['event_id', 'title', 'amount_cents', 'estimated_cents', 'category', 'incurred_at', 'notes', 'vendor_id', 'payment_due_at']),
  async list(): Promise<Expense[]> {
    const db = await initializeDatabase();
    return db.getAllAsync<Expense>('SELECT Expenses.* FROM Expenses JOIN Events ON Events.id = Expenses.event_id WHERE Events.deleted_at IS NULL AND Events.archived_at IS NULL ORDER BY Expenses.id DESC');
  },
};
export const activities = childRepository<Activity, CreateActivity>('Activities', ['event_id', 'title', 'starts_at', 'ends_at', 'location', 'notes']);
export const guests = childRepository<Guest, Create<Guest, 'event_id' | 'name'>>('Guests', ['event_id','name','email','phone','rsvp','plus_ones','dietary','checked_in']);
export const vendors = childRepository<Vendor, Create<Vendor, 'event_id' | 'name'>>('Vendors', ['event_id','name','service','contact','email','phone','quoted_cents','booking_status','notes']);
export const payments = {
  ...repository<Payment, Create<Payment, 'expense_id' | 'amount_cents' | 'paid_at'>>('Payments', ['expense_id','amount_cents','paid_at','method','notes']),
  async listByExpense(id: number): Promise<Payment[]> {
    assertId(id); const db = await initializeDatabase();
    return db.getAllAsync<Payment>('SELECT * FROM Payments WHERE expense_id = ? ORDER BY paid_at DESC, id DESC', [id]);
  },
};
export const receipts = {
  ...repository<Receipt, Create<Receipt, 'expense_id' | 'name' | 'mime_type' | 'data_url'>>('Receipts', ['expense_id','name','mime_type','data_url']),
  async listByExpense(id: number): Promise<Receipt[]> {
    assertId(id); const db = await initializeDatabase();
    return db.getAllAsync<Receipt>('SELECT * FROM Receipts WHERE expense_id = ? ORDER BY id DESC', [id]);
  },
};
export const reminders = {
  ...childRepository<Reminder, Create<Reminder, 'event_id' | 'title' | 'remind_at'>>('Reminders', ['event_id','title','remind_at','dismissed']),
  async list(): Promise<Reminder[]> {
    const db = await initializeDatabase();
    return db.getAllAsync<Reminder>('SELECT Reminders.* FROM Reminders JOIN Events ON Events.id = Reminders.event_id WHERE Events.deleted_at IS NULL AND Events.archived_at IS NULL ORDER BY remind_at');
  },
};
