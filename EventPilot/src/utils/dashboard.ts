import type { Event } from '../database/repositories';
import { eventPeriod, eventStart } from './eventSchedule';

export interface DashboardData {
  total: number; upcoming: number; past: number; unscheduled: number; nextEvents: Event[]; cancelled: number;
}

/** Compare local wall dates/times, preserving the event form's timezone semantics. */
export function summarizeEvents(rows: readonly Event[], now: Date, limit = 5): DashboardData {
  const upcoming: { event: Event; start: string }[] = [];
  let past = 0;
  let unscheduled = 0;
  let cancelled = 0;
  for (const event of rows) {
    const start = eventStart(event);
    const period = eventPeriod(event, now);
    if (period === 'cancelled') { cancelled += 1; continue; }
    if (period === 'past') { past += 1; continue; }
    if (start === null) {
      unscheduled += 1;
      continue;
    }
    upcoming.push({ event, start });
  }
  upcoming.sort((a, b) => a.start.localeCompare(b.start) || a.event.id - b.event.id);
  return {
    total: rows.length, upcoming: upcoming.length, past, unscheduled, cancelled,
    nextEvents: upcoming.slice(0, limit).map(({ event }) => event),
  };
}
