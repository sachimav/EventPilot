const listeners = new Set();
/** Refresh analytics only after a successful Events, Tasks, or Expenses write. */
export function subscribeDataChanges(listener) {
    listeners.add(listener);
    return () => { listeners.delete(listener); };
}
export function notifyDataChanges() {
    for (const listener of listeners) {
        try {
            listener();
        }
        catch (error) {
            console.error('Data refresh listener failed', error);
        }
    }
}
