const listeners = new Set();
let sequence = 0;

/** UI feedback only; called after an action finishes, never by database helpers. */
export function showFeedback(title, message = '', type = 'success') {
  const feedback = { id: ++sequence, title, message, type };
  for (const listener of listeners) listener(feedback);
}
export const showSuccess = (title, message = '') => showFeedback(title, message, 'success');
export const showError = (title, message = '') => showFeedback(title, message, 'error');
export function subscribeFeedback(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
