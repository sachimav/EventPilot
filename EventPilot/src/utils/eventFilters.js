import { eventPeriod, eventStart } from './eventSchedule';
export const defaultEventFilters = { search: '', category: null, period: 'all' };
function normalize(value) { return value.trim().toLowerCase(); }
/** Derive category choices from all SQLite rows, independent of active filters. */
export function eventCategories(rows) {
    const labels = new Map();
    for (const row of rows) {
        const label = row.category.trim();
        const key = normalize(label);
        if (key && !labels.has(key))
            labels.set(key, label);
    }
    return Array.from(labels, ([value, label]) => ({ value, label })).sort((a, b) => a.label.localeCompare(b.label));
}
/** Literal, case-insensitive search over local rows; no SQL interpolation. */
export function filterEvents(rows, filters, now) {
    const search = normalize(filters.search);
    const category = filters.category === null ? null : normalize(filters.category);
    return rows.map((event) => ({ event, start: eventStart(event) })).filter(({ event }) => {
        if (search && !normalize(event.name).includes(search) && !normalize(event.location).includes(search))
            return false;
        if (category !== null && normalize(event.category) !== category)
            return false;
        if (filters.period !== 'all' && eventPeriod(event, now) !== filters.period)
            return false;
        return true;
    }).sort((a, b) => {
        // Unscheduled events appear last in All; ID keeps equal starts deterministic.
        if (a.start === null && b.start !== null)
            return 1;
        if (b.start === null && a.start !== null)
            return -1;
        return (a.start ?? '').localeCompare(b.start ?? '') || a.event.id - b.event.id;
    }).map(({ event }) => event);
}
