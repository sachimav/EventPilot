import { dateString, timeString, validDate } from './eventForm';
/** Comparable local wall start; date-only legacy events last through their day. */
export function eventStart(event) {
    if (!event.date || !validDate(event.date))
        return null;
    const time = event.time && /^([01]\d|2[0-3]):[0-5]\d$/.test(event.time) ? event.time : '23:59';
    return `${event.date}T${time}`;
}
export function currentMinute(now) {
    return `${dateString(now)}T${timeString(now)}`;
}
export function eventPeriod(event, now) {
    if (event.status === 'cancelled')
        return 'cancelled';
    if (event.status === 'completed')
        return 'past';
    const start = eventStart(event);
    if (!start)
        return 'unscheduled';
    const finish = event.end_date && validDate(event.end_date) && /^([01]\d|2[0-3]):[0-5]\d$/.test(event.end_time ?? '')
        ? `${event.end_date}T${event.end_time}` : start;
    return (finish > start ? finish : start) < currentMinute(now) ? 'past' : 'upcoming';
}
