/** Calendar supports the same four-digit, positive years as event forms. */
export function validCalendarMonth(month) {
    return typeof month === 'string' && /^(?!0000)\d{4}-(0[1-9]|1[0-2])$/.test(month);
}

/** Null means invalid input or navigation beyond years 0001 through 9999. */
export function shiftCalendarMonth(month, step) {
    if (!validCalendarMonth(month) || !Number.isSafeInteger(step)) return null;
    const [year, number] = month.split('-').map(Number);
    const index = year * 12 + number - 1 + step;
    if (index < 12 || index > 9999 * 12 + 11) return null;
    return `${String(Math.floor(index / 12)).padStart(4, '0')}-${String(index % 12 + 1).padStart(2, '0')}`;
}
