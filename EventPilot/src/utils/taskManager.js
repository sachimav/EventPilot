import { dateString, timeString, validDate } from './eventForm';
import { getTaskStatus, sortTasksByDeadline } from './taskDeadlines';
export const priorityChoices = [
    { value: 'low', label: 'Low' }, { value: 'medium', label: 'Medium' }, { value: 'high', label: 'High' },
];
export const emptyTask = { eventId: '', title: '', description: '', date: '', time: '', priority: 'medium', completed: false };
function deadline(values) {
    if (!validDate(values.date) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(values.time))
        return null;
    const date = new Date(`${values.date}T${values.time}:00`);
    // Reject nonexistent local times rather than silently shifting a deadline.
    return !Number.isNaN(date.getTime()) && dateString(date) === values.date && timeString(date) === values.time ? date : null;
}
export function validateTask(values, events) {
    const errors = {};
    if (!events.some((event) => String(event.id) === values.eventId))
        errors.eventId = 'Choose an existing event.';
    if (!values.title.trim())
        errors.title = 'Enter a task title.';
    if (!validDate(values.date))
        errors.date = 'Choose a valid deadline date.';
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(values.time))
        errors.time = 'Choose a valid deadline time.';
    else if (!errors.date && !deadline(values))
        errors.time = 'This local time is unavailable. Choose another time.';
    if (!priorityChoices.some((choice) => choice.value === values.priority))
        errors.priority = 'Choose a priority.';
    if (typeof values.completed !== 'boolean')
        errors.completed = 'Choose a completion status.';
    return errors;
}
export function toTaskInput(values, events) {
    if (Object.keys(validateTask(values, events)).length)
        throw new Error('Please correct the task fields.');
    return { event_id: Number(values.eventId), title: values.title.trim(), notes: values.description.trim(),
        due_at: deadline(values).toISOString(), priority: values.priority, completed: values.completed ? 1 : 0 };
}
export function fromTask(task) {
    const due = task.due_at ? new Date(task.due_at) : null;
    const valid = due && !Number.isNaN(due.getTime());
    return { eventId: String(task.event_id), title: task.title, description: task.notes,
        date: valid ? dateString(due) : '', time: valid ? timeString(due) : '', priority: task.priority, completed: task.completed === 1 };
}
export const defaultTaskFilters = { event: 'all', priority: 'all', status: 'all' };
export function filterTasks(rows, filters, now = Date.now()) {
    const matches = rows.filter((task) => (filters.event === 'all' || String(task.event_id) === filters.event)
        && (filters.priority === 'all' || task.priority === filters.priority)
        && (filters.status === 'all' || (filters.status === 'pending' ? task.completed === 0 : getTaskStatus(task, now) === filters.status)));
    return sortTasksByDeadline(matches, now);
}
export function taskDeadline(task) {
    if (!task.due_at)
        return 'No deadline set';
    const due = new Date(task.due_at);
    return Number.isNaN(due.getTime()) ? 'No deadline set' : due.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}
