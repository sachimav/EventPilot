import { useRef, useState } from 'react';
import { Text, View } from 'react-native';
import type { CreateTask, Event, TaskPriority } from '../database';
import { emptyTask, priorityChoices, toTaskInput, validateTask, type TaskErrors, type TaskValues } from '../utils/taskManager';
import { cardStyle, colors, spacing, typography } from '../constants/theme';
import AppInput from './AppInput';
import AppButton from './AppButton';
import ChoiceChips from './ChoiceChips';
import EventDateTimeField from './EventDateTimeField';

export default function TaskForm({ events, initialValues = emptyTask, editing = false, onSave, onCancel }: {
  events: Event[]; initialValues?: TaskValues; editing?: boolean;
  onSave: (input: CreateTask) => Promise<void>; onCancel: () => void;
}) {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState<TaskErrors>({});
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const pending = useRef(false);
  function change<K extends keyof TaskValues>(key: K, value: TaskValues[K]) {
    setValues((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
    setError('');
  }
  async function save() {
    if (pending.current) return;
    const problems = validateTask(values, events);
    setErrors(problems);
    if (Object.keys(problems).length) { setError('Please correct the highlighted fields.'); return; }
    pending.current = true;
    setSaving(true);
    setError('');
    try { await onSave(toTaskInput(values, events)); }
    catch (cause) {
      console.error('Unable to save task', cause);
      setError('Unable to save this task. It or its event may have been deleted. Your entries are still here; please try again.');
    } finally { pending.current = false; setSaving(false); }
  }
  return <View style={{ ...cardStyle, gap: spacing.lg }}>
    <Text accessibilityRole="header" style={{ ...typography.heading, color: colors.heading }}>{editing ? 'Edit task' : 'Create task'}</Text>
    <Text style={{ color: colors.text }}>Fields marked * are required. Description is optional.</Text>
    <ChoiceChips label="Event *" value={values.eventId} choices={events.map((event) => ({ value: String(event.id), label: event.name }))}
      onChange={(value) => change('eventId', value)} error={errors.eventId} disabled={saving} />
    <AppInput label="Title *" value={values.title} onChangeText={(value) => change('title', value)} error={errors.title} editable={!saving} />
    <AppInput label="Description" multiline value={values.description} onChangeText={(value) => change('description', value)} editable={!saving} />
    <EventDateTimeField label="Deadline date" mode="date" value={values.date} onChange={(value) => change('date', value)} error={errors.date} disabled={saving} />
    <EventDateTimeField label="Deadline time" mode="time" value={values.time} onChange={(value) => change('time', value)} error={errors.time} disabled={saving} />
    <ChoiceChips label="Priority *" choices={priorityChoices} value={values.priority} onChange={(value) => change('priority', value as TaskPriority)} error={errors.priority} disabled={saving} />
    <ChoiceChips label="Status" choices={[{ value: 'pending', label: 'Pending' }, { value: 'completed', label: 'Completed' }]}
      value={values.completed ? 'completed' : 'pending'} onChange={(value) => change('completed', value === 'completed')} disabled={saving} />
    {!!error && <Text accessibilityRole="alert" style={{ color: colors.danger }}>{error}</Text>}
    <AppButton title={saving ? 'Saving…' : 'Save task'} onPress={save} disabled={saving} />
    <AppButton title="Cancel" variant="secondary" onPress={onCancel} disabled={saving} />
  </View>;
}
