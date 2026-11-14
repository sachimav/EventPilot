import type { Event } from '../database/repositories';
import { currentMinute, eventStart } from './eventSchedule';

export type EventPeriod = 'all' | 'upcoming' | 'past';
export interface EventFilters { search: string; category: string | null; period: EventPeriod }
export const defaultEventFilters: EventFilters = { search: '', category: null, period: 'all' };

function normalize(value: string): string { return value.trim().toLowerCase(); }

/** Derive category choices from all SQLite rows, independent of active filters. */
export function eventCategories(rows: readonly Event[]): { value: string; label: string }[] {
  const labels = new Map<string, string>();
  for (const row of rows) {
    const label = row.category.trim();
    const key = normalize(label);
    if (key && !labels.has(key)) labels.set(key, label);
  }
  return Array.from(labels, ([value, label]) => ({ value, label })).sort((a, b) => a.label.localeCompare(b.label));
}

/** Literal, case-insensitive search over local rows; no SQL interpolation. */
export function filterEvents(rows: readonly Event[], filters: EventFilters, now: Date): Event[] {
  const search = normalize(filters.search);
  const category = filters.category === null ? null : normalize(filters.category);
  const minute = currentMinute(now);
  return rows.map((event) => ({ event, start: eventStart(event) })).filter(({ event, start }) => {
    if (search && !normalize(event.name).includes(search) && !normalize(event.location).includes(search)) return false;
    if (category !== null && normalize(event.category) !== category) return false;
    if (filters.period === 'upcoming' && (start === null || start < minute)) return false;
    if (filters.period === 'past' && (start === null || start >= minute)) return false;
    return true;
  }).sort((a, b) => {
    // Unscheduled events appear last in All; ID keeps equal starts deterministic.
    if (a.start === null && b.start !== null) return 1;
    if (b.start === null && a.start !== null) return -1;
    return (a.start ?? '').localeCompare(b.start ?? '') || a.event.id - b.event.id;
  }).map(({ event }) => event);
}
