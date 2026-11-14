import { StyleSheet, Text, View } from 'react-native';
import type { summarizeBudget } from '../utils/budgetManager';
import { formatLkr } from '../utils/budgetManager';
import { cardStyle, colors, radii, spacing, typography } from '../constants/theme';

type Summary = ReturnType<typeof summarizeBudget>;

function Metric({ label, value, danger = false }: { label: string; value: string; danger?: boolean }) {
  return <View style={[styles.metric, danger && styles.dangerCard]}>
    <Text style={styles.label}>{label}</Text>
    <Text style={[styles.amount, danger && styles.dangerText]}>{value}</Text>
  </View>;
}

function ComparisonBar({ label, amount, percent, color }: { label: string; amount: bigint; percent: number; color: string }) {
  return <View style={styles.barGroup}>
    <View style={styles.row}><Text style={styles.caption}>{label}</Text><Text style={styles.caption}>{formatLkr(amount)}</Text></View>
    <View style={styles.track}><View style={[styles.fill, { width: `${percent}%`, backgroundColor: color }]} /></View>
  </View>;
}

export default function BudgetSummary({ summary }: { summary: Summary }) {
  const utilization = summary.utilizationPercent === null ? 'Not available' : `${summary.utilizationPercent.toFixed(2)}%`;
  return <View style={styles.content}>
    <View style={styles.metrics}>
      <Metric label="Total event budget" value={formatLkr(summary.budget)} />
      <Metric label="Estimated expenses" value={formatLkr(summary.estimated)} danger={summary.estimatedOverBudget} />
      <Metric label="Actual expenses" value={formatLkr(summary.actual)} danger={summary.overspent} />
      <Metric label="Remaining budget" value={formatLkr(summary.remaining)} danger={summary.overspent} />
    </View>
    <View style={styles.card}>
      <View style={styles.row}>
        <Text accessibilityRole="header" style={styles.heading}>Budget utilization</Text>
        <Text style={[styles.heading, summary.overspent && styles.dangerText]}>{utilization}</Text>
      </View>
      <View accessibilityRole="progressbar" accessibilityLabel="Actual expenses as a percentage of event budget"
        accessibilityValue={summary.utilizationPercent === null ? { text: 'Not available: event budget is zero' }
          : { min: 0, max: 100, now: summary.progressPercent, text: `${utilization} of event budget spent` }}
        style={styles.progressTrack}>
        <View style={[styles.fill, { width: `${summary.progressPercent}%`, backgroundColor: summary.overspent ? colors.danger : colors.primary }]} />
      </View>
      <Text style={styles.caption}>{summary.utilizationPercent === null ? 'Set an event budget to calculate utilization.' : 'Actual expenses ÷ event budget. The bar fills up to 100%.'}</Text>
      {summary.overspent && <Text accessibilityRole="alert" style={styles.warning}>Over budget by {formatLkr(summary.overspentAmount)}.</Text>}
      {summary.estimatedOverBudget && <Text style={styles.warning}>Estimated expenses exceed your event budget by {formatLkr(summary.estimated - summary.budget)}.</Text>}
    </View>
    {summary.categories.length > 0 && <>
      <Text accessibilityRole="header" style={styles.heading}>Category comparison</Text>
      <Text style={styles.caption}>Estimated vs. actual spending. All category bars share the same scale.</Text>
      {summary.categories.map((category) => <View key={category.category.toLowerCase()} style={styles.card}>
        <View style={styles.row}><Text style={styles.heading}>{category.category}</Text><Text style={styles.caption}>{category.count} {category.count === 1 ? 'expense' : 'expenses'}</Text></View>
        <ComparisonBar label="Estimated" amount={category.estimated} percent={category.estimatedPercent} color={colors.primary} />
        <ComparisonBar label="Actual" amount={category.actual} percent={category.actualPercent} color={category.overEstimate ? colors.danger : '#16705A'} />
        <Text style={[styles.caption, category.overEstimate && styles.dangerText]}>
          {category.variance === BigInt(0) ? 'On estimate' : category.overEstimate ? `${formatLkr(category.variance)} over estimate` : `${formatLkr(-category.variance)} under estimate`}
        </Text>
      </View>)}
    </>}
  </View>;
}

const styles = StyleSheet.create({
  content: { gap: spacing.lg },
  metrics: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  metric: { ...cardStyle, flexGrow: 1, flexBasis: 230, minWidth: 0, gap: spacing.sm, padding: spacing.lg },
  dangerCard: { borderColor: '#F1B8C2', backgroundColor: '#FFF5F6' },
  label: { ...typography.label, color: colors.text },
  amount: { ...typography.title, color: colors.heading, flexShrink: 1 },
  card: { ...cardStyle, gap: spacing.md },
  heading: { ...typography.heading, color: colors.heading, flexShrink: 1 },
  row: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm },
  caption: { ...typography.caption, color: colors.text, flexShrink: 1 },
  track: { height: 8, borderRadius: radii.pill, backgroundColor: colors.border, overflow: 'hidden' },
  progressTrack: { height: 14, borderRadius: radii.pill, backgroundColor: colors.border, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: radii.pill },
  barGroup: { gap: spacing.xs },
  dangerText: { color: colors.danger },
  warning: { ...typography.label, color: colors.danger },
});
