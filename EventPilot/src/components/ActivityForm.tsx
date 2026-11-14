import { useRef, useState } from 'react';
import { Text, View } from 'react-native';
import { activities, type Activity, type CreateActivity } from '../database';
import { activityTimeRange, emptyActivity, toActivityInput, validateActivity, type ActivityErrors, type ActivityValues } from '../utils/activityTimeline';
import { findActivityConflicts, sameActivityConflicts } from '../utils/activityConflicts';
import { cardStyle, colors, spacing, typography } from '../constants/theme';
import AppInput from './AppInput';
import AppButton from './AppButton';
import EventDateTimeField from './EventDateTimeField';

export default function ActivityForm({ eventId, initialValues = emptyActivity, editing = false, editingId, onSave, onCancel }: {
  eventId: number; initialValues?: ActivityValues; editing?: boolean; editingId?: number;
  onSave: (input: CreateActivity) => Promise<void>; onCancel: () => void;
}) {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState<ActivityErrors>({});
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [conflicts, setConflicts] = useState<Activity[] | null>(null);
  const pending = useRef(false);
  function change(key: keyof ActivityValues, value: string) {
    setValues((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined, ...(key === 'startTime' || key === 'date' ? { endTime: undefined } : {}) }));
    setError('');
    setConflicts(null);
  }
  async function save(override = false) {
    if (pending.current) return;
    const problems = validateActivity(values);
    setErrors(problems);
    if (Object.keys(problems).length) { setError('Please correct the highlighted fields.'); return; }
    pending.current = true;
    setSaving(true);
    setError('');
    try {
      const input = toActivityInput(values, eventId);
      // Read SQLite again for every save/confirmation, never trust the screen cache.
      const rows = await activities.listByEvent(eventId);
      const found = findActivityConflicts(input, rows, editingId);
      if (found.length > 0 && (!override || conflicts === null || !sameActivityConflicts(found, conflicts))) {
        setConflicts(found);
        return;
      }
      await onSave(input);
    }
    catch (cause) {
      console.error('Unable to save activity', cause);
      setError('Unable to save this activity. It or its event may have been deleted. Your entries are still here; please try again.');
    } finally { pending.current = false; setSaving(false); }
  }
  return <View style={{ ...cardStyle, gap: spacing.lg }}>
    <Text accessibilityRole="header" style={{ ...typography.heading, color: colors.heading }}>{editing ? 'Edit activity' : 'Add activity'}</Text>
    <Text style={{ color: colors.text }}>Fields marked * are required. Start and end times use the same date and local time.</Text>
    <AppInput label="Title *" value={values.title} onChangeText={(value) => change('title', value)} error={errors.title} editable={!saving} />
    <EventDateTimeField mode="date" value={values.date} onChange={(value) => change('date', value)} error={errors.date} disabled={saving} />
    <EventDateTimeField mode="time" label="Start time" value={values.startTime} onChange={(value) => change('startTime', value)} error={errors.startTime} disabled={saving} />
    <EventDateTimeField mode="time" label="End time" value={values.endTime} onChange={(value) => change('endTime', value)} error={errors.endTime} disabled={saving} />
    <AppInput label="Description (optional)" multiline value={values.description} onChangeText={(value) => change('description', value)} editable={!saving} />
    {conflicts !== null && <View style={{ padding: spacing.lg, gap: spacing.md, borderWidth: 1, borderColor: colors.danger, borderRadius: 12, backgroundColor: '#FFF5F6' }}>
      <Text accessibilityRole="alert" style={{ ...typography.heading, color: colors.danger }}>Schedule conflict</Text>
      <Text style={{ color: colors.heading }}>This activity overlaps with the following activities. It has not been saved.</Text>
      {conflicts.map((activity) => <View key={activity.id} style={{ gap: spacing.xs }}>
        <Text style={{ ...typography.label, color: colors.heading }}>{activity.title}</Text>
        <Text style={{ ...typography.caption, color: colors.text }}>{new Date(activity.starts_at!).toLocaleDateString()} · {activityTimeRange(activity)}</Text>
      </View>)}
      <Text style={{ color: colors.text }}>Adjust the date or times, or explicitly allow this overlap.</Text>
      <AppButton title="Save anyway — allow overlap" onPress={() => save(true)} disabled={saving} />
      <AppButton title="Keep editing" variant="secondary" onPress={() => setConflicts(null)} disabled={saving} />
    </View>}
    {!!error && <Text accessibilityRole="alert" style={{ color: colors.danger }}>{error}</Text>}
    <AppButton title={saving ? 'Checking and saving…' : 'Save activity'} onPress={() => save()} disabled={saving} />
    <AppButton title="Cancel" variant="secondary" onPress={onCancel} disabled={saving} />
  </View>;
}
