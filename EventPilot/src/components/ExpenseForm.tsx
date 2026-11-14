import { useRef, useState } from 'react';
import { Text, View } from 'react-native';
import type { CreateExpense } from '../database';
import { emptyExpense, toExpenseInput, validateExpense, type ExpenseValues, type ExpenseErrors } from '../utils/budgetManager';
import { cardStyle, colors, spacing, typography } from '../constants/theme';
import AppInput from './AppInput';
import AppButton from './AppButton';

export default function ExpenseForm({ eventId, eventName, initialValues = emptyExpense, editing = false, onSave, onCancel }: {
  eventId: number; eventName: string; initialValues?: ExpenseValues; editing?: boolean;
  onSave: (input: CreateExpense) => Promise<void>; onCancel: () => void;
}) {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState<ExpenseErrors>({});
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const pending = useRef(false);
  function change(key: keyof ExpenseValues, value: string) {
    setValues((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
    setError('');
  }
  async function save() {
    if (pending.current) return;
    const problems = validateExpense(values);
    setErrors(problems);
    if (Object.keys(problems).length) { setError('Please correct the highlighted fields.'); return; }
    pending.current = true;
    setSaving(true);
    setError('');
    try { await onSave(toExpenseInput(values, eventId)); }
    catch (cause) {
      console.error('Unable to save expense', cause);
      setError('Unable to save this expense. It or its event may have been deleted. Your entries are still here; please try again.');
    } finally { pending.current = false; setSaving(false); }
  }
  return <View style={{ ...cardStyle, gap: spacing.lg }}>
    <Text accessibilityRole="header" style={{ ...typography.heading, color: colors.heading }}>{editing ? 'Edit expense' : 'Add expense'}</Text>
    <Text style={{ ...typography.body, color: colors.text }}>{eventName}</Text>
    <Text style={{ color: colors.text }}>All fields are required. Amounts are in Sri Lankan rupees (LKR). Enter 0 if nothing has been spent yet.</Text>
    <AppInput label="Category *" placeholder="e.g. Venue, Catering, Transport" value={values.category} error={errors.category} editable={!saving} onChangeText={(value) => change('category', value)} />
    <AppInput label="Description *" multiline value={values.description} error={errors.description} editable={!saving} onChangeText={(value) => change('description', value)} />
    <AppInput label="Estimated amount (Rs.) *" keyboardType="decimal-pad" placeholder="0.00" value={values.estimated} error={errors.estimated} editable={!saving} onChangeText={(value) => change('estimated', value)} />
    <AppInput label="Actual amount (Rs.) *" keyboardType="decimal-pad" placeholder="0.00" value={values.actual} error={errors.actual} editable={!saving} onChangeText={(value) => change('actual', value)} />
    {!!error && <Text accessibilityRole="alert" style={{ color: colors.danger }}>{error}</Text>}
    <AppButton title={saving ? 'Saving…' : 'Save expense'} onPress={save} disabled={saving} />
    <AppButton title="Cancel" variant="secondary" onPress={onCancel} disabled={saving} />
  </View>;
}
