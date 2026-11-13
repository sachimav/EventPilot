import type { Event } from '../database/repositories';
import { dateString, timeString, validDate } from './eventForm';

/** Comparable local wall start; date-only legacy events last through their day. */
export function eventStart(event: Event): string | null {
  if (!event.date || !validDate(event.date)) return null;
  const time = event.time && /^([01]\d|2[0-3]):[0-5]\d$/.test(event.time) ? event.time : '23:59';
  return `${event.date}T${time}`;
}

export function currentMinute(now: Date): string {
  return `${dateString(now)}T${timeString(now)}`;
}
