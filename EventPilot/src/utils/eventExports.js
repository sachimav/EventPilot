import { formatLkr } from './budgetManager';
import { dateString, timeString, validDate } from './eventForm';
import { validCalendarMonth } from './calendar';
export function csv(rows) {
    return '\uFEFF' + rows.map((row) => row.map((value) => {
        let text = String(value ?? '');
        if (/^[\s]*[=+@-]/.test(text))
            text = `'${text}`;
        return `"${text.replace(/"/g, '""')}"`;
    }).join(',')).join('\r\n');
}
const escapeIcs = (value) => value.replace(/\\/g, '\\\\').replace(/\r?\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');
const stamp = (value) => value.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
function fold(line) {
    let result = '';
    let segment = '';
    for (const char of line) {
        if (new TextEncoder().encode(segment + char).length > 73) {
            result += segment + '\r\n ';
            segment = '';
        }
        segment += char;
    }
    return result + segment;
}
export function calendarExport(events, activities = [], tasks = []) {
    const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//EventPilot//Planning//EN', 'CALSCALE:GREGORIAN'];
    const now = stamp(new Date());
    const eventIds = new Set(events.map((event) => event.id));
    const add = (id, title, start, end, description, location = '') => {
        if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || end <= start)
            return;
        lines.push('BEGIN:VEVENT', `UID:${id}@eventpilot`, `DTSTAMP:${now}`, `DTSTART:${stamp(start)}`, `DTEND:${stamp(end)}`, `SUMMARY:${escapeIcs(title)}`, `DESCRIPTION:${escapeIcs(description)}`, `LOCATION:${escapeIcs(location)}`, 'BEGIN:VALARM', 'TRIGGER:-PT24H', 'ACTION:DISPLAY', `DESCRIPTION:${escapeIcs(title)}`, 'END:VALARM', 'END:VEVENT');
    };
    for (const event of events) {
        if (!event.date || !event.time || event.status === 'cancelled')
            continue;
        const start = new Date(`${event.date}T${event.time}:00`);
        const end = event.end_date && event.end_time ? new Date(`${event.end_date}T${event.end_time}:00`) : new Date(start.getTime() + 3600000);
        add(`event-${event.id}`, event.name, start, end, event.notes, event.location);
    }
    for (const activity of activities)
        if (eventIds.has(activity.event_id) && activity.starts_at && activity.ends_at)
            add(`activity-${activity.id}`, activity.title, new Date(activity.starts_at), new Date(activity.ends_at), activity.notes, activity.location);
    for (const task of tasks)
        if (eventIds.has(task.event_id) && task.due_at && !task.completed) {
            const due = new Date(task.due_at);
            if (!Number.isFinite(due.getTime()))
                continue;
            lines.push('BEGIN:VTODO', `UID:task-${task.id}@eventpilot`, `DTSTAMP:${now}`, `DUE:${stamp(due)}`, `SUMMARY:${escapeIcs(task.title)}`, 'STATUS:NEEDS-ACTION', 'END:VTODO');
        }
    return lines.map(fold).concat('END:VCALENDAR', '').join('\r\n');
}
export function eventReport(event, tasks, expenses, activities, guests, vendors) {
    const escape = (text) => String(text ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
    const section = (heading, rows) => `<h2>${heading}</h2>${rows.length ? `<ul>${rows.map((row) => `<li>${row}</li>`).join('')}</ul>` : '<p>None recorded.</p>'}`;
    return `<!doctype html><html><head><meta charset="utf-8"><title>${escape(event.name)}</title><style>body{font:16px system-ui;max-width:900px;margin:40px auto;padding:20px;color:#211a35}h1,h2{color:#6c3ce1}li{margin:10px 0}@media print{body{margin:0}}</style></head><body><h1>${escape(event.name)}</h1><p>${escape(event.date)} ${escape(event.time)} · ${escape(event.location)} · ${escape(event.status)}</p><p>${escape(event.notes)}</p><p>Event budget: ${escape(formatLkr(event.budget_cents))}</p>`
        + section('Run sheet', activities.map((row) => `${escape(row.starts_at ? new Date(row.starts_at).toLocaleString() : 'Unscheduled')} — ${escape(row.title)}: ${escape(row.notes)}`))
        + section('Checklist', tasks.map((row) => `${row.completed ? '✓' : '○'} ${escape(row.title)} — ${escape(row.priority)}`))
        + section('Guests', guests.map((row) => `${escape(row.name)} — ${escape(row.rsvp)}; ${row.plus_ones} plus-ones; ${escape(row.dietary)}`))
        + section('Budget', expenses.map((row) => `${escape(row.category)} — ${escape(row.title)}: estimated ${formatLkr(row.estimated_cents)}, actual ${formatLkr(row.amount_cents)}`))
        + section('Vendors', vendors.map((row) => `${escape(row.name)} — ${escape(row.service)} — ${escape(row.booking_status)} — ${escape(row.phone)}`)) + '</body></html>';
}
export function calendarAgenda(events, tasks, activities, month = dateString(new Date()).slice(0, 7)) {
    if (!validCalendarMonth(month)) return [];
    const validIds = new Set(events.map((event) => event.id));
    const rows = [];
    for (const event of events) {
        if (!validDate(event.date ?? '') || event.status === 'cancelled') continue;
        let finish = validDate(event.end_date ?? '') && event.end_date >= event.date ? event.end_date : event.date;
        // An interval ending exactly at midnight does not occupy the following day.
        if (finish > event.date && event.end_time === '00:00') {
            const last = new Date(`${finish}T12:00:00`);
            last.setDate(last.getDate() - 1);
            finish = dateString(last);
        }
        // Expand only the requested month, even for very long event durations.
        const start = event.date > `${month}-01` ? event.date : `${month}-01`;
        const limit = finish < `${month}-31` ? finish : `${month}-31`;
        const day = new Date(`${start}T12:00:00`);
        for (let date = start; date <= limit && date.startsWith(month); day.setDate(day.getDate() + 1), date = dateString(day)) {
            rows.push({ key: `e${event.id}-${date}`, eventId: event.id, title: event.name, type: 'Event', date, time: date === event.date ? event.time ?? '' : '00:00' });
        }
    }
    for (const [type, data] of [['Task', tasks], ['Activity', activities]])
        for (const row of data) {
            const value = 'due_at' in row ? row.due_at : row.starts_at;
            if (!validIds.has(row.event_id) || !value || ('completed' in row && row.completed))
                continue;
            const date = new Date(value);
            if (!Number.isFinite(date.getTime()))
                continue;
            if (dateString(date).startsWith(month))
                rows.push({ key: `${type}${row.id}`, eventId: row.event_id, title: row.title, type, date: dateString(date), time: timeString(date) });
        }
    return rows.sort((a, b) => `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`));
}
