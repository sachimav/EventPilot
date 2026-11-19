import { initializeDatabase } from './database';
import { findEventConflicts } from '../utils/eventConflicts';

// Serialize event form writes so simultaneous saves cannot both pass the check.
let pendingWrite = Promise.resolve();
export function withScheduledEventWrite(action) {
    const result = pendingWrite.then(async () => {
        const db = await initializeDatabase();
        let value;
        await db.withTransactionAsync(async () => { value = await action(db); });
        return value;
    });
    pendingWrite = result.catch(() => {});
    return result;
}

export async function assertEventScheduleAvailable(db, candidate, excludeId) {
    const rows = await db.getAllAsync('SELECT * FROM Events WHERE deleted_at IS NULL AND archived_at IS NULL AND status != ?', ['cancelled']);
    const conflicts = findEventConflicts(candidate, rows, excludeId);
    if (conflicts.length) {
        const error = new Error('This event overlaps another saved event. Choose a different date or time.');
        error.name = 'EventScheduleConflictError';
        error.conflicts = conflicts;
        throw error;
    }
}
