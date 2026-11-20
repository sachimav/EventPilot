import { eventStart } from './eventSchedule';
import { getTaskStatus, taskDeadlineMillis } from './taskDeadlines';

export function buildNotifications(data, now = Date.now()) {
  if (!data) return [];
  const active = new Map(data.events.filter((event) => !['completed', 'cancelled'].includes(event.status)).map((event) => [event.id, event]));
  const items = [];
  for (const task of data.tasks) {
    const status = getTaskStatus(task, now);
    if (active.has(task.event_id) && ['urgent', 'overdue'].includes(status)) items.push({ key: `task-${task.id}`, title: task.title, label: status === 'overdue' ? 'Task overdue' : 'Task due soon', at: taskDeadlineMillis(task), eventId: task.event_id, task: true });
  }
  for (const event of active.values()) {
    const start = eventStart(event);
    const at = start ? new Date(start).getTime() : NaN;
    if (at >= now && at - now <= 86400000) items.push({ key: `event-${event.id}`, title: event.name, label: 'Event starts soon', at, eventId: event.id });
  }
  for (const reminder of data.reminders) {
    const at = new Date(reminder.remind_at).getTime();
    if (!reminder.dismissed && active.has(reminder.event_id) && at <= now) items.push({ key: `reminder-${reminder.id}`, title: reminder.title, label: 'Event reminder', at, eventId: reminder.event_id });
  }
  return items.sort((a, b) => a.at - b.at).map((item) => ({ ...item, eventName: active.get(item.eventId).name }));
}
