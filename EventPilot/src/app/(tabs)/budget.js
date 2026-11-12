import PlaceholderScreen from '../../components/PlaceholderScreen';
import EmptyState from '../../components/EmptyState';
import StatCard from '../../components/StatCard';

export default function BudgetScreen() {
  return <PlaceholderScreen title="Plan with confidence" description="Give every great idea a little room in your budget."><StatCard label="Planned budget" value="—" caption="Budget preview · no expenses recorded" icon="wallet-outline" /><EmptyState icon="receipt-outline" title="A fresh start for your budget" description="Your expenses and spending breakdown will appear here when budget planning is available." /></PlaceholderScreen>;
}
