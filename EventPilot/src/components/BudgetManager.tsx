import { useMemo, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { events, expenses, type Expense } from '../database';
import { useFocusQuery } from '../hooks/useFocusQuery';
import { fromExpense, summarizeBudget } from '../utils/budgetManager';
import { colors, spacing, typography } from '../constants/theme';
import AppButton from './AppButton';
import ChoiceChips from './ChoiceChips';
import EmptyState from './EmptyState';
import ExpenseCard from './ExpenseCard';
import ExpenseForm from './ExpenseForm';
import BudgetSummary from './BudgetSummary';

async function loadBudget() {
  const [eventRows, expenseRows] = await Promise.all([events.list(), expenses.list()]);
  return { events: eventRows, expenses: expenseRows };
}

export default function BudgetManager({ initialEventId }: { initialEventId?: number } = {}) {
  const { data, loading, error, retry } = useFocusQuery(loadBudget);
  const [eventId, setEventId] = useState(initialEventId ? String(initialEventId) : '');
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Expense | null>(null);
  const selected = data?.events.find((event) => String(event.id) === eventId) ?? (!eventId ? data?.events[0] : undefined);
  const selectedId = selected?.id;
  const rows = useMemo(() => (data?.expenses ?? []).filter((expense) => expense.event_id === selectedId), [data, selectedId]);
  const summary = useMemo(() => selected ? summarizeBudget(selected, rows) : null, [selected, rows]);
  const editingForm = !!selected && (creating || editing !== null);
  return <View style={{ gap: spacing.lg }}>
    <ChoiceChips label="Select an event" value={selected ? String(selected.id) : eventId} disabled={editingForm}
      choices={(data?.events ?? []).map((event) => ({ value: String(event.id), label: event.name }))}
      onChange={(value) => { setEventId(value); setCreating(false); setEditing(null); }} />
    {error && data && <View style={{ gap: spacing.sm }}>
      <Text accessibilityRole="alert" style={{ color: colors.danger }}>Unable to refresh expenses. Showing the last loaded data.</Text>
      <AppButton title="Retry refresh" variant="secondary" onPress={retry} disabled={editingForm} />
    </View>}
    {loading && !data ? <ActivityIndicator color={colors.primary} accessibilityLabel="Loading budget" />
      : !data ? <EmptyState title="Unable to load your budget" description="Please try reading your local events and expenses again." action={<AppButton title="Retry" onPress={retry} />} />
        : data.events.length === 0 ? <EmptyState title="Start with an event" description="Create an event before planning its expenses." icon="wallet-outline"
          action={<AppButton title="Create an event" href="/events/create" />} />
          : !selected ? <EmptyState title="Choose an event" description={eventId ? 'The selected event is no longer available. Choose another event above.' : 'Select an event above to see its expenses and category totals.'} icon="wallet-outline" />
            : <>
              <Text accessibilityRole="header" style={{ ...typography.heading, color: colors.heading }}>{selected.name}</Text>
              <Text style={{ ...typography.caption, color: colors.text }}>All amounts in Sri Lankan rupees (LKR).</Text>
              <AppButton title="Add expense" icon="add-circle-outline" onPress={() => { setEventId(String(selected.id)); setCreating(true); }} disabled={editingForm || loading || error} />
              {creating && <ExpenseForm key={`create-${selected.id}`} eventId={selected.id} eventName={selected.name}
                onCancel={() => setCreating(false)} onSave={async (input) => {
                  await expenses.create(input);
                  setCreating(false);
                  retry();
                }} />}
              {summary && <BudgetSummary summary={summary} />}
              <AppButton title="Edit event budget" variant="secondary" href={{ pathname: '/events/[id]/edit', params: { id: selected.id } }} disabled={editingForm} />
              {rows.length === 0 ? <EmptyState title="A fresh start for your budget" description="No expenses for this event yet. Add an expense to compare your estimates with actual spending." icon="receipt-outline" /> : <>
                <Text accessibilityRole="header" style={{ ...typography.heading, color: colors.heading }}>Expenses ({rows.length})</Text>
                {rows.map((expense) => editing?.id === expense.id ? <ExpenseForm key={`edit-${expense.id}`} eventId={selected.id} eventName={selected.name}
                  initialValues={fromExpense(editing)} editing onCancel={() => setEditing(null)} onSave={async (input) => {
                    if (!await expenses.update(expense.id, input)) throw new Error('Expense no longer exists.');
                    setEditing(null);
                    retry();
                  }} /> : <ExpenseCard key={expense.id} expense={expense} disabled={editingForm} onEdit={() => setEditing(expense)} onChange={retry} />)}
              </>}
              <AppButton title="Refresh budget" variant="secondary" onPress={retry} disabled={editingForm || loading} />
            </>}
  </View>;
}
