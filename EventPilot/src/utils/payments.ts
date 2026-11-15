import type { Expense, Payment } from '../database';
export function paymentSummary(expense: Expense, payments: readonly Payment[]) {
  const total = BigInt(expense.amount_cents > 0 ? expense.amount_cents : expense.estimated_cents);
  const paid = payments.filter((payment) => payment.expense_id === expense.id).reduce((sum, payment) => sum + BigInt(payment.amount_cents), BigInt(0));
  return { total, paid, outstanding: total > paid ? total - paid : BigInt(0),
    status: paid === BigInt(0) ? 'Unpaid' : paid >= total ? 'Paid' : 'Partially paid', overpaid: paid > total ? paid - total : BigInt(0) };
}
