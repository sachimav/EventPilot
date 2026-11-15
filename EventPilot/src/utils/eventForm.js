export const emptyEvent = {
    title: '', description: '', category: '', date: '', time: '', location: '', budget: '',
};
export function dateString(value) {
    return `${String(value.getFullYear()).padStart(4, '0')}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
}
export function timeString(value) {
    return `${String(value.getHours()).padStart(2, '0')}:${String(value.getMinutes()).padStart(2, '0')}`;
}
export function validDate(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || value.startsWith('0000'))
        return false;
    const date = new Date(`${value}T12:00:00`);
    return !Number.isNaN(date.getTime()) && dateString(date) === value;
}
export function budgetCents(value) {
    const text = value.trim();
    if (!/^\d+(\.\d{1,2})?$/.test(text))
        return null;
    const [whole, fraction = ''] = text.split('.');
    const cents = BigInt(whole) * BigInt(100) + BigInt(fraction.padEnd(2, '0'));
    return cents <= BigInt(Number.MAX_SAFE_INTEGER) ? Number(cents) : null;
}
export function validateEvent(values) {
    const errors = {};
    if (!values.title.trim())
        errors.title = 'Enter an event title.';
    if (!values.category.trim())
        errors.category = 'Enter a category.';
    if (!validDate(values.date))
        errors.date = 'Choose a valid date.';
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(values.time))
        errors.time = 'Choose a valid time.';
    if (!values.location.trim())
        errors.location = 'Enter a location.';
    if (budgetCents(values.budget) === null)
        errors.budget = 'Enter a nonnegative budget with up to two decimal places.';
    if (values.status && !['draft', 'planning', 'ready', 'ongoing', 'completed', 'cancelled'].includes(values.status))
        errors.status = 'Choose a valid event status.';
    if (values.endDate || values.endTime) {
        if (!validDate(values.endDate ?? ''))
            errors.endDate = 'Choose a valid end date.';
        if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(values.endTime ?? ''))
            errors.endTime = 'Choose a valid end time.';
        if (!errors.endDate && !errors.endTime && `${values.endDate}T${values.endTime}` <= `${values.date}T${values.time}`)
            errors.endTime = 'Event end must be after its start.';
    }
    return errors;
}
export function toEventInput(values) {
    if (Object.keys(validateEvent(values)).length)
        throw new Error('Please correct the highlighted fields.');
    return {
        name: values.title.trim(), notes: values.description.trim(), category: values.category.trim(),
        date: values.date, time: values.time, location: values.location.trim(), budget_cents: budgetCents(values.budget),
        end_date: values.endDate || null, end_time: values.endTime || null, status: values.status ?? 'planning',
    };
}
export function fromEvent(event) {
    return {
        title: event.name, description: event.notes, category: event.category,
        date: event.date ?? '', time: event.time ?? '', location: event.location,
        endDate: event.end_date ?? '', endTime: event.end_time ?? '', status: event.status ?? 'planning',
        budget: `${Math.floor(event.budget_cents / 100)}.${String(event.budget_cents % 100).padStart(2, '0')}`,
    };
}
export function eventDate(event) {
    return [event.date || 'Date to be decided', event.time].filter(Boolean).join(' · ');
}
export function parseEventId(value) {
    if (typeof value !== 'string' || !/^[1-9]\d*$/.test(value))
        return null;
    const id = Number(value);
    return Number.isSafeInteger(id) ? id : null;
}
