import { initializeDatabase } from './database';
import { notifyTaskChanges } from './taskChanges';
import { notifyDataChanges } from './dataChanges';
import { assertEventScheduleAvailable, withScheduledEventWrite } from './eventScheduling';
function assertId(id) {
    if (!Number.isSafeInteger(id) || id <= 0)
        throw new TypeError('IDs must be positive safe integers.');
}
// Table names and identifiers originate only from the fixed definitions below.
// Reject unexpected properties even when called from untyped JavaScript.
function repository(table, columns, updateCondition = '') {
    function bindings(input) {
        const entries = Object.entries(input);
        for (const [key, value] of entries) {
            if (!columns.includes(key))
                throw new TypeError(`Unknown ${table} field: ${key}`);
            if (value === undefined || (value !== null && typeof value !== 'string' && typeof value !== 'number')) {
                throw new TypeError(`Invalid value for ${key}; omit optional fields rather than passing undefined.`);
            }
            if (typeof value === 'number' && (!Number.isFinite(value) || !Number.isSafeInteger(value))) {
                throw new TypeError(`${key} must be a safe integer.`);
            }
            if (key === 'event_id')
                assertId(value);
        }
        return { keys: entries.map(([key]) => key), values: entries.map(([, value]) => value) };
    }
    return {
        async create(input) {
            const { keys, values } = bindings(input);
            if (!keys.length)
                throw new TypeError('Create requires fields.');
            const db = await initializeDatabase();
            const result = await db.runAsync(`INSERT INTO ${table} (${keys.join(', ')}) VALUES (${keys.map(() => '?').join(', ')})`, values);
            if (table === 'Tasks')
                notifyTaskChanges();
            if (table !== 'Activities')
                notifyDataChanges();
            return result.lastInsertRowId;
        },
        async getById(id) {
            assertId(id);
            const db = await initializeDatabase();
            return db.getFirstAsync(`SELECT * FROM ${table} WHERE id = ?`, [id]);
        },
        async update(id, input) {
            assertId(id);
            const { keys, values } = bindings(input);
            if (!keys.length)
                throw new TypeError('Update requires at least one field.');
            // Activating an archived/trashed/cancelled event must reserve its slot too.
            const checksSchedule = table === 'Events' && (updateCondition ||
                keys.some((key) => ['date', 'time', 'end_date', 'end_time', 'status', 'archived_at', 'deleted_at'].includes(key)));
            const write = async (db) => {
                if (checksSchedule) {
                    const current = await db.getFirstAsync(`SELECT * FROM Events WHERE id = ?${updateCondition}`, [id]);
                    if (!current) return false;
                    await assertEventScheduleAvailable(db, { ...current, ...input }, id);
                }
                const result = await db.runAsync(`UPDATE ${table} SET ${keys.map((key) => `${key} = ?`).join(', ')}, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = ?${updateCondition}`, [...values, id]);
                return result.changes > 0;
            };
            const changed = checksSchedule
                ? await withScheduledEventWrite(write) : await write(await initializeDatabase());
            if (table === 'Tasks' && changed)
                notifyTaskChanges();
            if (changed && table !== 'Activities')
                notifyDataChanges();
            return changed;
        },
        async delete(id) {
            assertId(id);
            const db = await initializeDatabase();
            const result = await db.runAsync(`DELETE FROM ${table} WHERE id = ?`, [id]);
            if ((table === 'Tasks' || table === 'Events') && result.changes > 0)
                notifyTaskChanges();
            if (result.changes > 0 && table !== 'Activities')
                notifyDataChanges();
            return result.changes > 0;
        },
    };
}
function childRepository(table, columns) {
    return {
        ...repository(table, columns),
        async listByEvent(eventId) {
            assertId(eventId);
            const db = await initializeDatabase();
            return db.getAllAsync(`SELECT * FROM ${table} WHERE event_id = ? ORDER BY id ASC`, [eventId]);
        },
    };
}
const eventDetailsColumns = ['name', 'date', 'time', 'category', 'location', 'notes', 'budget_cents', 'currency', 'status', 'end_date', 'end_time'];
export const events = {
    ...repository('Events', [...eventDetailsColumns, 'archived_at', 'deleted_at']),
    // Check Trash state in the UPDATE itself, including saves from stale editors.
    updateDetails: repository('Events', eventDetailsColumns, ' AND deleted_at IS NULL').update,
    async list() {
        const db = await initializeDatabase();
        return db.getAllAsync('SELECT * FROM Events WHERE deleted_at IS NULL AND archived_at IS NULL ORDER BY id DESC');
    },
    async inactive() {
        const db = await initializeDatabase();
        return db.getAllAsync('SELECT * FROM Events WHERE deleted_at IS NOT NULL OR archived_at IS NOT NULL ORDER BY updated_at DESC');
    },
};
export const tasks = {
    ...childRepository('Tasks', ['event_id', 'title', 'notes', 'due_at', 'completed', 'priority']),
    async list() {
        const db = await initializeDatabase();
        return db.getAllAsync('SELECT Tasks.* FROM Tasks JOIN Events ON Events.id = Tasks.event_id WHERE Events.deleted_at IS NULL AND Events.archived_at IS NULL ORDER BY Tasks.id ASC');
    },
};
export const expenses = {
    ...childRepository('Expenses', ['event_id', 'title', 'amount_cents', 'estimated_cents', 'category', 'incurred_at', 'notes', 'vendor_id', 'payment_due_at']),
    async list() {
        const db = await initializeDatabase();
        return db.getAllAsync('SELECT Expenses.* FROM Expenses JOIN Events ON Events.id = Expenses.event_id WHERE Events.deleted_at IS NULL AND Events.archived_at IS NULL ORDER BY Expenses.id DESC');
    },
};
export const activities = childRepository('Activities', ['event_id', 'title', 'starts_at', 'ends_at', 'location', 'notes']);
export const guests = childRepository('Guests', ['event_id', 'name', 'email', 'phone', 'rsvp', 'plus_ones', 'dietary', 'checked_in']);
export const vendors = childRepository('Vendors', ['event_id', 'name', 'service', 'contact', 'email', 'phone', 'quoted_cents', 'booking_status', 'notes']);
export const payments = {
    ...repository('Payments', ['expense_id', 'amount_cents', 'paid_at', 'method', 'notes']),
    async listByExpense(id) {
        assertId(id);
        const db = await initializeDatabase();
        return db.getAllAsync('SELECT * FROM Payments WHERE expense_id = ? ORDER BY paid_at DESC, id DESC', [id]);
    },
};
export const receipts = {
    ...repository('Receipts', ['expense_id', 'name', 'mime_type', 'data_url']),
    async listByExpense(id) {
        assertId(id);
        const db = await initializeDatabase();
        return db.getAllAsync('SELECT * FROM Receipts WHERE expense_id = ? ORDER BY id DESC', [id]);
    },
};
export const reminders = {
    ...childRepository('Reminders', ['event_id', 'title', 'remind_at', 'dismissed']),
    async list() {
        const db = await initializeDatabase();
        return db.getAllAsync('SELECT Reminders.* FROM Reminders JOIN Events ON Events.id = Reminders.event_id WHERE Events.deleted_at IS NULL AND Events.archived_at IS NULL ORDER BY remind_at');
    },
};
