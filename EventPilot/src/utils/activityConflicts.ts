import type { Activity, CreateActivity } from '../database';

function interval(start: string | null | undefined, end: string | null | undefined) {
  if (!start || !end) return null;
  const startMs = new Date(start).getTime();
  const endMs = new Date(end).getTime();
  return Number.isFinite(startMs) && Number.isFinite(endMs) && endMs > startMs ? { start: startMs, end: endMs } : null;
}

/** Strict boundaries allow adjacent activities. Instants include both date and time. */
export function findActivityConflicts(candidate: CreateActivity, rows: readonly Activity[], excludeId?: number): Activity[] {
  const proposed = interval(candidate.starts_at, candidate.ends_at);
  if (!proposed) throw new Error('A valid start and end time are required to check conflicts.');
  return rows.filter((activity) => {
    if (activity.event_id !== candidate.event_id || activity.id === excludeId) return false;
    const existing = interval(activity.starts_at, activity.ends_at);
    return existing !== null && proposed.start < existing.end && proposed.end > existing.start;
  }).sort((a, b) => new Date(a.starts_at!).getTime() - new Date(b.starts_at!).getTime() || a.id - b.id);
}

/** An override is valid only for the exact conflicts the user was shown. */
export function sameActivityConflicts(current: readonly Activity[], shown: readonly Activity[]): boolean {
  const signature = (rows: readonly Activity[]) => JSON.stringify(rows.map((row) => [row.id, row.event_id, row.title, row.starts_at, row.ends_at])
    .sort((a, b) => Number(a[0]) - Number(b[0])));
  return signature(current) === signature(shown);
}
