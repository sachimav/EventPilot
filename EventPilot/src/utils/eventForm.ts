import type { CreateEvent, Event } from '../database/repositories';

export interface EventValues {
  title: string; description: string; category: string; date: string;
  time: string; location: string; budget: string;
}
export type EventErrors = Partial<Record<keyof EventValues, string>>;

export const emptyEvent: EventValues = {
  title: '', description: '', category: '', date: '', time: '', location: '', budget: '',
};

export function dateString(value: Date): string {
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
}
export function timeString(value: Date): string {
  return `${String(value.getHours()).padStart(2, '0')}:${String(value.getMinutes()).padStart(2, '0')}`;
}
export function validDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || value.startsWith('0000')) return false;
  const date = new Date(`${value}T12:00:00`);
  return !Number.isNaN(date.getTime()) && dateString(date) === value;
}
export function budgetCents(value: string): number | null {
  const text = value.trim();
  if (!/^\d+(\.\d{1,2})?$/.test(text)) return null;
  const [whole, fraction = ''] = text.split('.');
  const cents = BigInt(whole) * BigInt(100) + BigInt(fraction.padEnd(2, '0'));
  return cents <= BigInt(Number.MAX_SAFE_INTEGER) ? Number(cents) : null;
}
export function validateEvent(values: EventValues): EventErrors {
  const errors: EventErrors = {};
  if (!values.title.trim()) errors.title = 'Enter an event title.';
  if (!values.category.trim()) errors.category = 'Enter a category.';
  if (!validDate(values.date)) errors.date = 'Choose a valid date.';
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(values.time)) errors.time = 'Choose a valid time.';
  if (!values.location.trim()) errors.location = 'Enter a location.';
  if (budgetCents(values.budget) === null) errors.budget = 'Enter a nonnegative budget with up to two decimal places.';
  return errors;
}
export function toEventInput(values: EventValues): CreateEvent {
  if (Object.keys(validateEvent(values)).length) throw new Error('Please correct the highlighted fields.');
  return {
    name: values.title.trim(), notes: values.description.trim(), category: values.category.trim(),
    date: values.date, time: values.time, location: values.location.trim(), budget_cents: budgetCents(values.budget)!,
  };
}
export function fromEvent(event: Event): EventValues {
  return {
    title: event.name, description: event.notes, category: event.category,
    date: event.date ?? '', time: event.time ?? '', location: event.location,
    budget: `${Math.floor(event.budget_cents / 100)}.${String(event.budget_cents % 100).padStart(2, '0')}`,
  };
}
export function eventDate(event: Event): string {
  return [event.date || 'Date to be decided', event.time].filter(Boolean).join(' · ');
}
export function parseEventId(value: string | string[] | undefined): number | null {
  if (typeof value !== 'string' || !/^[1-9]\d*$/.test(value)) return null;
  const id = Number(value);
  return Number.isSafeInteger(id) ? id : null;
}
