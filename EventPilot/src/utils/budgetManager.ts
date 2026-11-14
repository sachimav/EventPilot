import type { CreateExpense, Expense, Event } from '../database';
import { budgetCents } from './eventForm';

export interface ExpenseValues { category: string; description: string; estimated: string; actual: string }
export type ExpenseErrors = Partial<Record<keyof ExpenseValues, string>>;
export const emptyExpense: ExpenseValues = { category: '', description: '', estimated: '', actual: '' };

export function validateExpense(values: ExpenseValues): ExpenseErrors {
  const errors: ExpenseErrors = {};
  if (!values.category.trim()) errors.category = 'Enter an expense category.';
  if (!values.description.trim()) errors.description = 'Enter an expense description.';
  for (const key of ['estimated', 'actual'] as const) {
    if (budgetCents(values[key]) === null) errors[key] = 'Enter a nonnegative amount with up to two decimal places.';
  }
  return errors;
}
export function toExpenseInput(values: ExpenseValues, eventId: number): CreateExpense {
  if (!Number.isSafeInteger(eventId) || eventId <= 0) throw new Error('Select an event.');
  if (Object.keys(validateExpense(values)).length) throw new Error('Please correct the expense fields.');
  return { event_id: eventId, category: values.category.trim(), title: values.description.trim(),
    estimated_cents: budgetCents(values.estimated)!, amount_cents: budgetCents(values.actual)! };
}
export function amountInput(cents: number): string {
  return `${Math.floor(cents / 100)}.${String(cents % 100).padStart(2, '0')}`;
}
export function fromExpense(expense: Expense): ExpenseValues {
  return { category: expense.category, description: expense.title,
    estimated: amountInput(expense.estimated_cents), actual: amountInput(expense.amount_cents) };
}
/** Format integer minor units exactly, including totals larger than JS safe integers. */
export function formatLkr(cents: number | bigint): string {
  const signed = BigInt(cents);
  const value = signed < BigInt(0) ? -signed : signed;
  const whole = (value / BigInt(100)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${signed < BigInt(0) ? '-' : ''}Rs. ${whole}.${(value % BigInt(100)).toString().padStart(2, '0')}`;
}
export interface CategoryTotal { category: string; count: number; estimated: bigint; actual: bigint }
export function summarizeExpenses(rows: readonly Expense[]) {
  const groups = new Map<string, CategoryTotal>();
  let estimated = BigInt(0);
  let actual = BigInt(0);
  for (const expense of rows) {
    const category = expense.category.trim() || 'Uncategorized';
    const key = category.toLowerCase();
    const group = groups.get(key) ?? { category, count: 0, estimated: BigInt(0), actual: BigInt(0) };
    group.count += 1;
    group.estimated += BigInt(expense.estimated_cents);
    group.actual += BigInt(expense.amount_cents);
    groups.set(key, group);
    estimated += BigInt(expense.estimated_cents);
    actual += BigInt(expense.amount_cents);
  }
  return { estimated, actual, categories: [...groups.values()].sort((a, b) => a.category.localeCompare(b.category)) };
}

/** Integer ratios avoid rounding money or overflowing when totals exceed safe integers. */
export function amountPercentage(amount: bigint, total: bigint): number {
  if (total <= BigInt(0)) return 0;
  return Number((amount * BigInt(10000) + total / BigInt(2)) / total) / 100;
}

export function summarizeBudget(event: Pick<Event, 'id' | 'budget_cents'>, expenses: readonly Expense[]) {
  // Guard event isolation even if the caller passes the entire SQLite snapshot.
  const totals = summarizeExpenses(expenses.filter((expense) => expense.event_id === event.id));
  const budget = BigInt(event.budget_cents);
  const remaining = budget - totals.actual;
  const overspent = remaining < BigInt(0);
  const scale = totals.categories.reduce((max, category) => {
    const largest = category.estimated > category.actual ? category.estimated : category.actual;
    return largest > max ? largest : max;
  }, BigInt(0));
  return {
    ...totals, budget, remaining, overspent,
    overspentAmount: overspent ? -remaining : BigInt(0),
    estimatedOverBudget: totals.estimated > budget,
    // No meaningful percentage exists when the budget is zero.
    utilizationPercent: budget > BigInt(0) ? amountPercentage(totals.actual, budget) : null,
    progressPercent: budget > BigInt(0) ? Math.min(100, amountPercentage(totals.actual, budget)) : 0,
    categories: totals.categories.map((category) => ({
      ...category, variance: category.actual - category.estimated,
      overEstimate: category.actual > category.estimated,
      estimatedPercent: amountPercentage(category.estimated, scale),
      actualPercent: amountPercentage(category.actual, scale),
    })),
  };
}
