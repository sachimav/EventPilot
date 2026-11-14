import type { Event, Expense, Task } from '../database';
import { summarizeBudget } from './budgetManager';
import { calculateReadiness, readinessByEvent } from './eventReadiness';
import { countTaskStatuses, getTaskStatus, sortTasksByDeadline } from './taskDeadlines';

export interface DashboardRecords { events: Event[]; tasks: Task[]; expenses: Expense[] }

/** Static analytics are calculated once per SQLite refresh, not on clock ticks. */
export function dashboardRecordAnalytics(records: DashboardRecords) {
  const eventMap = new Map(records.events.map((event) => [event.id, event]));
  const tasks = records.tasks.filter((task) => eventMap.has(task.event_id));
  const expensesByEvent = new Map<number, Expense[]>();
  for (const expense of records.expenses) {
    const list = expensesByEvent.get(expense.event_id) ?? [];
    list.push(expense);
    expensesByEvent.set(expense.event_id, list);
  }
  const warnings = records.events.flatMap((event) => {
    const summary = summarizeBudget(event, expensesByEvent.get(event.id) ?? []);
    const nearLimit = summary.budget > BigInt(0) && summary.actual * BigInt(100) >= summary.budget * BigInt(90);
    if (!summary.overspent && !summary.estimatedOverBudget && !nearLimit) return [];
    return [{ event, summary, kind: summary.overspent ? 'overspent' as const
      : summary.estimatedOverBudget ? 'estimated' as const : 'near-limit' as const }];
  }).sort((a, b) => {
    const rank = { overspent: 0, estimated: 1, 'near-limit': 2 };
    return rank[a.kind] - rank[b.kind] || a.event.id - b.event.id;
  });
  const completed = tasks.filter((task) => task.completed === 1).length;
  return { eventMap, tasks, readiness: readinessByEvent(tasks), warnings,
    completion: calculateReadiness(completed, tasks.length) };
}

/** Time-sensitive analytics share Task Manager's exact deadline semantics. */
export function dashboardTaskAnalytics(tasks: readonly Task[], now: number) {
  const counts = countTaskStatuses(tasks, now);
  return { counts, pending: tasks.length - counts.completed,
    attention: sortTasksByDeadline(tasks, now).filter((task) => {
      const status = getTaskStatus(task, now);
      return status === 'overdue' || status === 'urgent';
    }).slice(0, 3) };
}
