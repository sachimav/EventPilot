import type { Task } from '../database';

export interface EventReadiness { completedTasks: number; totalTasks: number; percentage: number | null }

export function calculateReadiness(completedTasks: number, totalTasks: number): EventReadiness {
  if (!Number.isSafeInteger(totalTasks) || !Number.isSafeInteger(completedTasks)
    || completedTasks < 0 || totalTasks < 0 || completedTasks > totalTasks) {
    throw new Error('Readiness requires valid completed and total task counts.');
  }
  return { completedTasks, totalTasks, percentage: totalTasks === 0 ? null : completedTasks / totalTasks * 100 };
}

export function readinessForEvent(eventId: number, tasks: readonly Pick<Task, 'event_id' | 'completed'>[]): EventReadiness {
  let completed = 0;
  let total = 0;
  for (const task of tasks) {
    if (task.event_id !== eventId) continue;
    total += 1;
    if (task.completed === 1) completed += 1;
  }
  return calculateReadiness(completed, total);
}

/** One pass for Dashboard; events absent from the map have no tasks. */
export function readinessByEvent(tasks: readonly Pick<Task, 'event_id' | 'completed'>[]): Map<number, EventReadiness> {
  const counts = new Map<number, { completed: number; total: number }>();
  for (const task of tasks) {
    const count = counts.get(task.event_id) ?? { completed: 0, total: 0 };
    count.total += 1;
    if (task.completed === 1) count.completed += 1;
    counts.set(task.event_id, count);
  }
  return new Map([...counts].map(([id, count]) => [id, calculateReadiness(count.completed, count.total)]));
}
