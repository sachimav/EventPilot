import { useRef, useState } from 'react';
import { Text, View } from 'react-native';
import { expenses, type Expense } from '../database';
import { formatLkr } from '../utils/budgetManager';
import { cardStyle, colors, spacing, typography } from '../constants/theme';
import AppButton from './AppButton';

export default function ExpenseCard({ expense, disabled, onEdit, onChange }: {
  expense: Expense; disabled: boolean; onEdit: () => void; onChange: () => void;
}) {
  const [confirm, setConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');
  const pending = useRef(false);
  async function remove() {
    if (pending.current) return;
    pending.current = true;
    setDeleting(true);
    setError('');
    try {
      await expenses.delete(expense.id);
      onChange();
    } catch (cause) {
      console.error('Unable to delete expense', cause);
      setError('Unable to delete this expense. Please try again.');
    } finally { pending.current = false; setDeleting(false); }
  }
  const locked = disabled || deleting;
  return <View style={{ ...cardStyle, gap: spacing.md }}>
    <Text style={{ ...typography.label, color: colors.primary }}>{expense.category || 'Uncategorized'}</Text>
    <Text accessibilityRole="header" style={{ ...typography.heading, color: colors.heading }}>{expense.title}</Text>
    {!!expense.notes && <Text style={{ ...typography.body, color: colors.text }}>{expense.notes}</Text>}
    <Text style={{ ...typography.body, color: colors.text }}>Estimated: {formatLkr(expense.estimated_cents)}</Text>
    <Text style={{ ...typography.body, color: colors.heading }}>Actual: {formatLkr(expense.amount_cents)}</Text>
    {confirm ? <>
      <Text accessibilityRole="alert" style={{ color: colors.danger }}>Permanently delete this expense?</Text>
      <AppButton title={deleting ? 'Deleting…' : 'Confirm deletion'} onPress={remove} disabled={locked} />
      <AppButton title="Cancel deletion" variant="secondary" onPress={() => { setConfirm(false); setError(''); }} disabled={locked} />
    </> : <>
      <AppButton title="Edit expense" variant="secondary" onPress={onEdit} disabled={locked} />
      <AppButton title="Delete expense" variant="secondary" onPress={() => setConfirm(true)} disabled={locked} />
    </>}
    {!!error && <Text accessibilityRole="alert" style={{ color: colors.danger }}>{error}</Text>}
  </View>;
}
