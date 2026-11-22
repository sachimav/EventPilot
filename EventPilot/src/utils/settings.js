export const defaultSettings = {
  theme: 'light',
  taskAlerts: true, eventAlerts: true, reminderAlerts: true, overdueAlerts: true,
  taskLeadHours: 48, eventLeadHours: 24, weekStart: 0, timeFormat: 'system',
};

export function normalizeSettings(value) {
  const result = { ...defaultSettings };
  if (['light', 'dark'].includes(value?.theme)) result.theme = value.theme;
  for (const key of ['taskAlerts', 'eventAlerts', 'reminderAlerts', 'overdueAlerts']) {
    if (typeof value?.[key] === 'boolean') result[key] = value[key];
  }
  for (const [key, choices] of Object.entries({ taskLeadHours: [0, 1, 24, 48], eventLeadHours: [0, 0.25, 1, 24], weekStart: [0, 1], timeFormat: ['system', '12', '24'] })) {
    if (choices.includes(value?.[key])) result[key] = value[key];
  }
  return result;
}

export function formatSettingsDateTime(value, settings) {
  return new Date(value).toLocaleString(undefined, settings.timeFormat === 'system' ? undefined : { hour12: settings.timeFormat === '12' });
}
