import type { CreateTask, Event, Task, TaskPriority } from '../database';
import { dateString, timeString, validDate } from './eventForm';
import { getTaskStatus, sortTasksByDeadline } from './taskDeadlines';

export const priorityChoices = [
  { value: 'low', label: 'Low' }, { value: 'medium', label: 'Medium' }, { value: 'high', label: 'High' },
];
export interface TaskValues {
  eventId: string; title: string; description: string; date: string; time: string; priority: TaskPriority; completed: boolean;
}
export const emptyTask: TaskValues = { eventId: '', title: '', description: '', date: '', time: '', priority: 'medium', completed: false };
export type TaskErrors = Partial<Record<keyof TaskValues, string>>;

function deadline(values: TaskValues): Date | null {
  if (!validDate(values.date) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(values.time)) return null;
  const date = new Date(`${values.date}T${values.time}:00`);
  // Reject nonexistent local times rather than silently shifting a deadline.
  return !Number.isNaN(date.getTime()) && dateString(date) === values.date && timeString(date) === values.time ? date : null;
}
export function validateTask(values: TaskValues, events: readonly Event[]): TaskErrors {
  const errors: TaskErrors = {};
  if (!events.some((event) => String(event.id) === values.eventId)) errors.eventId = 'Choose an existing event.';
  if (!values.title.trim()) errors.title = 'Enter a task title.';
  if (!validDate(values.date)) errors.date = 'Choose a valid deadline date.';
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(values.time)) errors.time = 'Choose a valid deadline time.';
  else if (!errors.date && !deadline(values)) errors.time = 'This local time is unavailable. Choose another time.';
  if (!priorityChoices.some((choice) => choice.value === values.priority)) errors.priority = 'Choose a priority.';
  if (typeof values.completed !== 'boolean') errors.completed = 'Choose a completion status.';
  return errors;
}
export function toTaskInput(values: TaskValues, events: readonly Event[]): CreateTask {
  if (Object.keys(validateTask(values, events)).length) throw new Error('Please correct the task fields.');
  return { event_id: Number(values.eventId), title: values.title.trim(), notes: values.description.trim(),
    due_at: deadline(values)!.toISOString(), priority: values.priority, completed: values.completed ? 1 : 0 };
}
export function fromTask(task: Task): TaskValues {
  const due = task.due_at ? new Date(task.due_at) : null;
  const valid = due && !Number.isNaN(due.getTime());
  return { eventId: String(task.event_id), title: task.title, description: task.notes,
    date: valid ? dateString(due) : '', time: valid ? timeString(due) : '', priority: task.priority, completed: task.completed === 1 };
}
export interface TaskFilters { event: string; priority: string; status: string }
export const defaultTaskFilters: TaskFilters = { event: 'all', priority: 'all', status: 'all' };
export function filterTasks(rows: readonly Task[], filters: TaskFilters, now: number = Date.now()): Task[] {
  const matches = rows.filter((task) => (filters.event === 'all' || String(task.event_id) === filters.event)
    && (filters.priority === 'all' || task.priority === filters.priority)
    && (filters.status === 'all' || (filters.status === 'pending' ? task.completed === 0 : getTaskStatus(task, now) === filters.status)));
  return sortTasksByDeadline(matches, now);
}
export function taskDeadline(task: Task): string {
  if (!task.due_at) return 'No deadline set';
  const due = new Date(task.due_at);
  return Number.isNaN(due.getTime()) ? 'No deadline set' : due.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}
