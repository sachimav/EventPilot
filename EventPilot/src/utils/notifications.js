import { eventStart } from './eventSchedule';
import { getTaskStatus, taskDeadlineMillis } from './taskDeadlines';
import { defaultSettings } from './settings';

export function buildNotifications(data, now = Date.now(), settings = defaultSettings) {
  if (!data) return [];
  const active = new Map(data.events.filter((event) => !['completed', 'cancelled'].includes(event.status)).map((event) => [event.id, event]));
  const items = [];
  for (const task of data.tasks) {
    const status = getTaskStatus(task, now);
    const due = taskDeadlineMillis(task);
    const visible = status === 'overdue' ? settings.overdueAlerts : settings.taskAlerts && due !== null && due - now <= settings.taskLeadHours * 3600000;
    if (active.has(task.event_id) && status !== 'completed' && visible) items.push({ key: `task-${task.id}`, title: task.title, label: status === 'overdue' ? 'Task overdue' : 'Task due soon', at: due, eventId: task.event_id, task: true });
  }
  for (const event of active.values()) {
    const start = eventStart(event);
    const at = start ? new Date(start).getTime() : NaN;
    if (settings.eventAlerts && at > now - 60000 && at - now <= settings.eventLeadHours * 3600000) items.push({ key: `event-${event.id}`, title: event.name, label: at <= now ? 'Event starting now' : 'Event starts soon', at, eventId: event.id });
  }
  for (const reminder of data.reminders) {
    const at = new Date(reminder.remind_at).getTime();
    if (settings.reminderAlerts && !reminder.dismissed && active.has(reminder.event_id) && at <= now) items.push({ key: `reminder-${reminder.id}`, title: reminder.title, label: 'Event reminder', at, eventId: reminder.event_id });
  }
  return items.sort((a, b) => a.at - b.at).map((item) => ({ ...item, eventName: active.get(item.eventId).name }));
}
