const listeners = new Set<() => void>();

/** Refresh analytics only after a successful Events, Tasks, or Expenses write. */
export function subscribeDataChanges(listener: () => void): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}
export function notifyDataChanges(): void {
  for (const listener of listeners) {
    try { listener(); } catch (error) { console.error('Data refresh listener failed', error); }
  }
}
