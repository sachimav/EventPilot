import type { Task } from '../database';

export type TaskStatus = 'completed' | 'overdue' | 'urgent' | 'upcoming';
type DeadlineTask = Pick<Task, 'completed' | 'due_at'>;
export const URGENT_WINDOW_MS = 48 * 60 * 60 * 1000;
export const taskStatusLabels: Record<TaskStatus, string> = {
  completed: 'Completed', overdue: 'Overdue', urgent: 'Urgent', upcoming: 'Upcoming',
};

export function taskDeadlineMillis(task: Pick<Task, 'due_at'>): number | null {
  if (!task.due_at) return null;
  const value = new Date(task.due_at).getTime();
  return Number.isFinite(value) ? value : null;
}

/** Compare instants, not formatted local dates, to handle timezones and DST. */
export function getTaskStatus(task: DeadlineTask, now: number = Date.now()): TaskStatus {
  if (task.completed === 1) return 'completed';
  const due = taskDeadlineMillis(task);
  // Legacy missing/invalid deadlines stay non-urgent; the UI shows No deadline set.
  if (due === null) return 'upcoming';
  if (due < now) return 'overdue';
  return due - now <= URGENT_WINDOW_MS ? 'urgent' : 'upcoming';
}

export function countTaskStatuses(rows: readonly DeadlineTask[], now: number = Date.now()): Record<TaskStatus, number> {
  const counts = { completed: 0, overdue: 0, urgent: 0, upcoming: 0 };
  for (const task of rows) counts[getTaskStatus(task, now)] += 1;
  return counts;
}

const statusOrder: Record<TaskStatus, number> = { overdue: 0, urgent: 1, upcoming: 2, completed: 3 };
export function sortTasksByDeadline(rows: readonly Task[], now: number = Date.now()): Task[] {
  return [...rows].sort((a, b) => {
    const rank = statusOrder[getTaskStatus(a, now)] - statusOrder[getTaskStatus(b, now)];
    if (rank) return rank;
    const aDue = taskDeadlineMillis(a);
    const bDue = taskDeadlineMillis(b);
    if (aDue === null && bDue !== null) return 1;
    if (bDue === null && aDue !== null) return -1;
    return (aDue ?? 0) - (bDue ?? 0) || a.id - b.id;
  });
}
