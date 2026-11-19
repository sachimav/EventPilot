import { validDate } from './eventForm';

/** Local event times; missing end times reserve one hour, as calendar exports do. */
export function eventInterval(event) {
    if (!validDate(event.date ?? '') || !/^([01]\d|2[0-3]):[0-5]\d$/.test(event.time ?? '')) return null;
    const start = new Date(`${event.date}T${event.time}:00`).getTime();
    const end = event.end_date && event.end_time
        ? new Date(`${event.end_date}T${event.end_time}:00`).getTime() : start + 3600000;
    return Number.isFinite(start) && Number.isFinite(end) && end > start ? { start, end } : null;
}

export function findEventConflicts(candidate, events, excludeId) {
    if (candidate.deleted_at || candidate.archived_at || candidate.status === 'cancelled') return [];
    const proposed = eventInterval(candidate);
    if (!proposed) return [];
    return events.filter((event) => {
        if (event.id === excludeId || event.deleted_at || event.archived_at || event.status === 'cancelled') return false;
        const existing = eventInterval(event);
        return existing && proposed.start < existing.end && proposed.end > existing.start;
    }).sort((a, b) => eventInterval(a).start - eventInterval(b).start || a.id - b.id);
}

export function eventIntervalLabel(event) {
    const interval = eventInterval(event);
    return interval ? `${new Date(interval.start).toLocaleString()} - ${new Date(interval.end).toLocaleString()}` : '';
}
