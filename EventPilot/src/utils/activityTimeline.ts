import type { Activity, CreateActivity } from '../database';
import { dateString, timeString, validDate } from './eventForm';

export interface ActivityValues { title: string; date: string; startTime: string; endTime: string; description: string }
export type ActivityErrors = Partial<Record<keyof ActivityValues, string>>;
export const emptyActivity: ActivityValues = { title: '', date: '', startTime: '', endTime: '', description: '' };
const validTime = (value: string) => /^([01]\d|2[0-3]):[0-5]\d$/.test(value);

function localTime(date: string, time: string): Date | null {
  if (!validDate(date) || !validTime(time)) return null;
  const result = new Date(`${date}T${time}:00`);
  return !Number.isNaN(result.getTime()) && dateString(result) === date && timeString(result) === time ? result : null;
}
export function validateActivity(values: ActivityValues): ActivityErrors {
  const errors: ActivityErrors = {};
  if (!values.title.trim()) errors.title = 'Enter an activity title.';
  if (!validDate(values.date)) errors.date = 'Choose a valid date.';
  if (!validTime(values.startTime)) errors.startTime = 'Choose a valid start time.';
  if (!validTime(values.endTime)) errors.endTime = 'Choose a valid end time.';
  if (!errors.date) {
    if (!errors.startTime && !localTime(values.date, values.startTime)) errors.startTime = 'This local time is unavailable. Choose another time.';
    if (!errors.endTime && !localTime(values.date, values.endTime)) errors.endTime = 'This local time is unavailable. Choose another time.';
  }
  if (!errors.startTime && !errors.endTime && values.endTime <= values.startTime) {
    errors.endTime = 'End time must be after start time on the same day.';
  }
  return errors;
}
export function toActivityInput(values: ActivityValues, eventId: number): CreateActivity {
  if (!Number.isSafeInteger(eventId) || eventId <= 0) throw new Error('Choose an existing event.');
  if (Object.keys(validateActivity(values)).length) throw new Error('Please correct the activity fields.');
  return { event_id: eventId, title: values.title.trim(), notes: values.description.trim(),
    starts_at: localTime(values.date, values.startTime)!.toISOString(), ends_at: localTime(values.date, values.endTime)!.toISOString() };
}
function storedDate(value: string | null): Date | null {
  if (!value) return null;
  const result = new Date(value);
  return Number.isNaN(result.getTime()) ? null : result;
}
export function fromActivity(activity: Activity): ActivityValues {
  const start = storedDate(activity.starts_at);
  const end = storedDate(activity.ends_at);
  return { title: activity.title, description: activity.notes, date: start ? dateString(start) : '',
    startTime: start ? timeString(start) : '', endTime: end ? timeString(end) : '' };
}
export function sortActivities(rows: readonly Activity[]): Activity[] {
  return [...rows].sort((a, b) => {
    const aStart = storedDate(a.starts_at)?.getTime() ?? null;
    const bStart = storedDate(b.starts_at)?.getTime() ?? null;
    if (aStart === null && bStart !== null) return 1;
    if (bStart === null && aStart !== null) return -1;
    return (aStart ?? 0) - (bStart ?? 0) || a.id - b.id;
  });
}
export function groupActivities(rows: readonly Activity[]) {
  const groups = new Map<string, { date: string; label: string; activities: Activity[] }>();
  for (const activity of sortActivities(rows)) {
    const start = storedDate(activity.starts_at);
    const key = start ? dateString(start) : 'unscheduled';
    const group = groups.get(key) ?? { date: key, label: start
      ? start.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : 'Needs scheduling', activities: [] };
    group.activities.push(activity);
    groups.set(key, group);
  }
  return [...groups.values()];
}
export function activityTimeRange(activity: Activity): string {
  const start = storedDate(activity.starts_at);
  const end = storedDate(activity.ends_at);
  if (!start) return 'Time not set';
  if (!end) return `${timeString(start)} — End time not set`;
  return dateString(start) === dateString(end) ? `${timeString(start)} — ${timeString(end)}`
    : `${timeString(start)} — ${dateString(end)} ${timeString(end)}`;
}
