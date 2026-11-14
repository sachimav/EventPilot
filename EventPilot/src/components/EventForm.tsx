import { useRef, useState } from 'react';
import { Text, View } from 'react-native';
import AppInput from './AppInput';
import AppButton from './AppButton';
import EventDateTimeField from './EventDateTimeField';
import { cardStyle, colors, spacing } from '../constants/theme';
import { emptyEvent, toEventInput, validateEvent, type EventErrors, type EventValues } from '../utils/eventForm';
import type { CreateEvent } from '../database';

interface Props {
  initialValues?: EventValues; currency?: string;
  onSave: (input: CreateEvent) => Promise<void>;
}
export default function EventForm({ initialValues = emptyEvent, currency = 'LKR', onSave }: Props) {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState<EventErrors>({});
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const pending = useRef(false);
  function change(key: keyof EventValues, value: string) {
    setValues((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
    setError('');
  }
  async function save() {
    if (pending.current) return;
    const problems = validateEvent(values);
    setErrors(problems);
    if (Object.keys(problems).length) { setError('Please correct the highlighted fields.'); return; }
    pending.current = true;
    setSaving(true);
    setError('');
    try { await onSave(toEventInput(values)); }
    catch (cause) {
      console.error('Unable to save event', cause);
      setError('Unable to save this event. Your entries are still here. Please try again.');
    } finally { pending.current = false; setSaving(false); }
  }
  return <View style={{ ...cardStyle, gap: spacing.xl }}>
    <Text style={{ color: colors.text }}>Fields marked * are required. Times use local wall time.</Text>
    <AppInput label="Title *" value={values.title} onChangeText={(value) => change('title', value)} error={errors.title} editable={!saving} />
    <AppInput label="Description" multiline value={values.description} onChangeText={(value) => change('description', value)} editable={!saving} />
    <AppInput label="Category *" placeholder="e.g. Wedding, Birthday, Conference" value={values.category} onChangeText={(value) => change('category', value)} error={errors.category} editable={!saving} />
    <EventDateTimeField mode="date" value={values.date} onChange={(value) => change('date', value)} error={errors.date} disabled={saving} />
    <EventDateTimeField mode="time" value={values.time} onChange={(value) => change('time', value)} error={errors.time} disabled={saving} />
    <AppInput label="Location *" value={values.location} onChangeText={(value) => change('location', value)} error={errors.location} editable={!saving} />
    <AppInput label={`Total budget (${currency}) *`} keyboardType="decimal-pad" placeholder="0.00" value={values.budget} onChangeText={(value) => change('budget', value)} error={errors.budget} editable={!saving} />
    {!!error && <Text accessibilityRole="alert" style={{ color: colors.danger }}>{error}</Text>}
    <AppButton title={saving ? 'Saving…' : 'Save event'} onPress={save} disabled={saving} />
  </View>;
}
