import { useTheme } from '../hooks/useTheme';
import { useRef, useState } from 'react';
import { Keyboard, Text, View } from 'react-native';
import AppInput from './AppInput';
import AppButton from './AppButton';
import EventDateTimeField from './EventDateTimeField';
import { spacing } from '../constants/theme';
import { emptyEvent, toEventInput, validateEvent } from '../utils/eventForm';
import { router } from 'expo-router';
import ChoiceChips from './ChoiceChips';
import EventConflictModal from './EventConflictModal';
import { showError } from '../utils/feedback';
export default function EventForm({ initialValues = emptyEvent, currency = 'LKR', onSave }) {
  const theme = useTheme();
  const { colors, cardStyle } = theme;
    const [values, setValues] = useState(initialValues);
    const [errors, setErrors] = useState({});
    const [error, setError] = useState('');
    const [saving, setSaving] = useState(false);
    const [conflicts, setConflicts] = useState([]);
    const pending = useRef(false);
    function change(key, value) {
        setValues((current) => ({ ...current, [key]: value }));
        setErrors((current) => ({ ...current, [key]: undefined }));
        setError('');
        setConflicts([]);
    }
    async function save() {
        if (pending.current)
            return;
        const problems = validateEvent(values);
        setErrors(problems);
        if (Object.keys(problems).length) {
            setError('Please correct the highlighted fields.');
            return;
        }
        pending.current = true;
        setSaving(true);
        setError('');
        setConflicts([]);
        try {
            await onSave(toEventInput(values));
        }
        catch (cause) {
            if (cause?.name === 'EventScheduleConflictError') {
                Keyboard.dismiss();
                setConflicts(cause.conflicts);
            } else {
                console.error('Unable to save event', cause);
                setError('Unable to save this event. Your entries are still here. Please try again.');
                showError('Unable to save event', 'Your entries are safe. Please try again.');
            }
        }
        finally {
            pending.current = false;
            setSaving(false);
        }
    }
    return <View style={{ ...cardStyle, gap: spacing.xl }}>
    <Text style={{ color: colors.text }}>Fields marked * are required. Times use local wall time. Without an end time, an event reserves one hour. Overlapping events cannot be saved.</Text>
    <AppInput label="Title *" value={values.title} onChangeText={(value) => change('title', value)} error={errors.title} editable={!saving}/>
    <AppInput label="Description" multiline value={values.description} onChangeText={(value) => change('description', value)} editable={!saving}/>
    <AppInput label="Category *" placeholder="e.g. Wedding, Birthday, Conference" value={values.category} onChangeText={(value) => change('category', value)} error={errors.category} editable={!saving}/>
    <EventDateTimeField mode="date" value={values.date} onChange={(value) => change('date', value)} error={errors.date} disabled={saving}/>
    <EventDateTimeField mode="time" value={values.time} onChange={(value) => change('time', value)} error={errors.time} disabled={saving}/>
    <EventDateTimeField mode="date" label="End date" required={false} value={values.endDate ?? ''} onChange={(value) => change('endDate', value)} error={errors.endDate} disabled={saving}/>
    <EventDateTimeField mode="time" label="End time" required={false} value={values.endTime ?? ''} onChange={(value) => change('endTime', value)} error={errors.endTime} disabled={saving}/>
    {!!(values.endDate || values.endTime) && <AppButton title="Clear event end" variant="secondary" disabled={saving} onPress={() => { setValues((old) => ({ ...old, endDate: '', endTime: '' })); setConflicts([]); }}/>}
    <ChoiceChips label="Event status" value={values.status ?? 'planning'} choices={['draft', 'planning', 'ready', 'ongoing', 'completed', 'cancelled'].map((value) => ({ value, label: value }))} onChange={(value) => change('status', value)} disabled={saving}/>
    <AppInput label="Location *" value={values.location} onChangeText={(value) => change('location', value)} error={errors.location} editable={!saving}/>
    <AppInput label={`Total budget (${currency}) *`} keyboardType="decimal-pad" placeholder="0.00" value={values.budget} onChangeText={(value) => change('budget', value)} error={errors.budget} editable={!saving}/>
    <EventConflictModal conflicts={conflicts} onClose={() => setConflicts([])} />
    {!!error && <Text accessibilityRole="alert" style={{ color: colors.danger }}>{error}</Text>}
    <AppButton title={saving ? 'Saving…' : 'Save event'} icon="checkmark-circle-outline" onPress={save} disabled={saving}/>
    <AppButton title="Cancel" icon="close-outline" variant="secondary" onPress={() => { if (router.canGoBack())
        router.back();
    else
        router.replace('/events'); }} disabled={saving}/>
  </View>;
}
