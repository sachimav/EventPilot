import { useCallback, useState } from 'react';
import { Platform, Text, View } from 'react-native';
import { expenses, payments, receipts, vendors, type Expense, type Payment } from '../database';
import { useFocusQuery } from '../hooks/useFocusQuery';
import { budgetCents, dateString, validDate } from '../utils/eventForm';
import { amountInput, formatLkr } from '../utils/budgetManager';
import { paymentSummary } from '../utils/payments';
import { downloadReceipt, readReceipt } from '../utils/files';
import AppInput from './AppInput';
import AppButton from './AppButton';
import ChoiceChips from './ChoiceChips';
import EventDateTimeField from './EventDateTimeField';
import { colors, spacing } from '../constants/theme';

export default function ExpensePayments({ expense, onChange }: { expense: Expense; onChange: () => void }) {
  const query = useCallback(async () => ({ payments: await payments.listByExpense(expense.id), vendors: await vendors.listByEvent(expense.event_id), receipts: await receipts.listByExpense(expense.id) }), [expense.id, expense.event_id]);
  const { data, retry, error } = useFocusQuery(query);
  const [editor,setEditor] = useState<Payment | 'new' | null>(null);
  const [amount,setAmount] = useState(''); const [date,setDate] = useState(dateString(new Date())); const [method,setMethod] = useState('');
  const [busy,setBusy] = useState(false); const [message,setMessage] = useState(''); const [remove,setRemove] = useState<number | null>(null);
  const [removeReceipt,setRemoveReceipt] = useState<number | null>(null);
  const summary = paymentSummary(expense, data?.payments ?? []);
  async function run(action: () => Promise<unknown>) {
    if (busy) return; setBusy(true); setMessage('');
    try { await action(); retry(); onChange(); } catch (cause) { setMessage(cause instanceof Error ? cause.message : 'Unable to update payment.'); } finally { setBusy(false); }
  }
  async function save() {
    const cents = budgetCents(amount);
    if (cents === null || cents <= 0 || !validDate(date)) { setMessage('Enter a positive payment amount and valid date.'); return; }
    await run(async () => {
      const input = { expense_id: expense.id, amount_cents: cents, paid_at: new Date(`${date}T12:00:00`).toISOString(), method: method.trim() };
      if (editor === 'new') await payments.create(input); else if (editor && !await payments.update(editor.id, input)) throw new Error('Payment no longer exists.');
      setEditor(null);
    });
  }
  return <View style={{ gap: spacing.md }}>
    <Text>{summary.status} · Paid {formatLkr(summary.paid)} · Outstanding {formatLkr(summary.outstanding)}</Text>
    {summary.overpaid > BigInt(0) && <Text style={{ color: colors.danger }}>Payments exceed the recorded cost by {formatLkr(summary.overpaid)}. Review the expense amount.</Text>}
    <Text>Payments track deposits and settlements separately. They do not add the expense a second time to budget totals.</Text>
    {error && <AppButton title="Retry payment history" onPress={retry} />}
    <ChoiceChips label="Linked vendor" value={expense.vendor_id ? String(expense.vendor_id) : ''} disabled={busy}
      choices={[{ value: '', label: 'No vendor' }, ...(data?.vendors ?? []).map((vendor) => ({ value: String(vendor.id), label: vendor.name }))]}
      onChange={(value) => run(() => expenses.update(expense.id, { vendor_id: value ? Number(value) : null }))} />
    <EventDateTimeField label="Payment deadline" mode="date" required={false} value={expense.payment_due_at?.slice(0,10) ?? ''} disabled={busy}
      onChange={(value) => run(() => expenses.update(expense.id, { payment_due_at: value }))} />
    {!!expense.payment_due_at && <AppButton title="Clear payment deadline" variant="secondary" disabled={busy} onPress={() => run(() => expenses.update(expense.id, { payment_due_at: null }))} />}
    {editor !== null ? <>
      <AppInput label="Payment amount (Rs.) *" keyboardType="decimal-pad" value={amount} onChangeText={setAmount} editable={!busy} />
      <EventDateTimeField label="Payment date" mode="date" value={date} onChange={setDate} disabled={busy} />
      <AppInput label="Payment method" value={method} onChangeText={setMethod} editable={!busy} />
      <AppButton title="Save payment" onPress={save} disabled={busy} />
      <AppButton title="Cancel payment" variant="secondary" disabled={busy} onPress={() => setEditor(null)} />
    </> : <AppButton title="Record payment" disabled={busy} onPress={() => { setEditor('new'); setAmount(''); setDate(dateString(new Date())); setMethod(''); }} />}
    {data?.payments.map((payment) => <View key={payment.id} style={{ gap: spacing.sm, borderTopWidth: 1, borderColor: colors.border, paddingTop: spacing.md }}>
      <Text>{formatLkr(payment.amount_cents)} · {new Date(payment.paid_at).toLocaleDateString()} · {payment.method || 'Payment'}</Text>
      <AppButton title="Edit payment" variant="secondary" disabled={busy} onPress={() => { setEditor(payment); setAmount(amountInput(payment.amount_cents)); setDate(dateString(new Date(payment.paid_at))); setMethod(payment.method); }} />
      {remove === payment.id ? <>
        <AppButton title="Confirm payment deletion" variant="danger" disabled={busy} onPress={() => run(async () => { await payments.delete(payment.id); setRemove(null); })} />
        <AppButton title="Keep payment" variant="secondary" disabled={busy} onPress={() => setRemove(null)} />
      </> : <AppButton title="Delete payment" variant="danger" disabled={busy} onPress={() => setRemove(payment.id)} />}
    </View>)}
    {Platform.OS === 'web' && <AppButton title="Attach receipt" variant="secondary" disabled={busy} onPress={() => run(async () => { const file = await readReceipt(); await receipts.create({ expense_id: expense.id, ...file }); })} />}
    {data?.receipts.map((receipt) => <View key={receipt.id} style={{ gap: spacing.sm }}>
      <AppButton title={`Download ${receipt.name}`} variant="secondary" disabled={busy} onPress={() => run(() => downloadReceipt(receipt.name, receipt.data_url))} />
      {removeReceipt === receipt.id ? <>
        <AppButton title="Confirm receipt deletion" variant="danger" disabled={busy} onPress={() => run(async () => { await receipts.delete(receipt.id); setRemoveReceipt(null); })} />
        <AppButton title="Keep receipt" variant="secondary" disabled={busy} onPress={() => setRemoveReceipt(null)} />
      </>
        : <AppButton title="Remove receipt" variant="secondary" disabled={busy} onPress={() => setRemoveReceipt(receipt.id)} />}
    </View>)}
    {!!message && <Text accessibilityRole="alert" style={{ color: colors.danger }}>{message}</Text>}
  </View>;
}
