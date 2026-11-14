const listeners = new Set<() => void>();

/** Subscribers re-read SQLite; notifications never contain speculative task data. */
export function subscribeTaskChanges(listener: () => void): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

export function notifyTaskChanges(): void {
  for (const listener of listeners) {
    // A view's refresh failure must never turn a committed write into a failed save.
    try { listener(); } catch (error) { console.error('Task refresh listener failed', error); }
  }
}
