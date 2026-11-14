import { useMemo } from 'react';
import { Text, View } from 'react-native';
import { dashboardRecordAnalytics, dashboardTaskAnalytics, type DashboardRecords } from '../utils/dashboardAnalytics';
import { formatLkr } from '../utils/budgetManager';
import { getTaskStatus } from '../utils/taskDeadlines';
import { taskDeadline } from '../utils/taskManager';
import { cardStyle, colors, spacing, typography } from '../constants/theme';
import AppButton from './AppButton';
import StatCard from './StatCard';
import EmptyState from './EmptyState';
import TaskStatusBadge from './TaskStatusBadge';

export default function DashboardInsights({ records, now }: { records: DashboardRecords; now: number }) {
  const analytics = useMemo(() => dashboardRecordAnalytics(records), [records]);
  const work = useMemo(() => dashboardTaskAnalytics(analytics.tasks, now), [analytics, now]);
  const completion = analytics.completion;
  const score = completion.percentage === null ? 'Not Assessed' : `${Math.floor(completion.percentage * 10) / 10}%`;
  return <View style={{ gap: spacing.lg }}>
    <Text accessibilityRole="header" style={{ ...typography.heading, color: colors.heading }}>Your planning checklist</Text>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md }}>
      <StatCard label="Pending tasks" value={String(work.pending)} caption="All incomplete tasks" icon="checkbox-outline" />
      <StatCard label="Urgent tasks" value={String(work.counts.urgent)} caption="Due now through 48 hours" icon="alarm-outline" tone="blue" />
      <StatCard label="Overdue tasks" value={String(work.counts.overdue)} caption="Deadline has passed" icon="alert-circle-outline" />
    </View>
    <View style={{ ...cardStyle, gap: spacing.md }}>
      <Text style={{ ...typography.heading, color: colors.heading }}>Task completion · {score}</Text>
      <View accessibilityRole="progressbar" accessibilityLabel="Task completion across all events"
        accessibilityValue={completion.percentage === null ? { text: 'Not Assessed: no tasks' }
          : { min: 0, max: 100, now: completion.percentage, text: `${score}, ${completion.completedTasks} of ${completion.totalTasks} completed` }}
        style={{ height: 10, backgroundColor: colors.border, borderRadius: 10, overflow: 'hidden' }}>
        <View style={{ height: '100%', width: `${completion.percentage ?? 0}%`, backgroundColor: colors.primary }} />
      </View>
      <Text style={{ ...typography.caption, color: colors.text }}>{completion.totalTasks === 0 ? 'No tasks yet. Create an event checklist to start tracking progress.' : `${completion.completedTasks} of ${completion.totalTasks} tasks completed across your events.`}</Text>
      <AppButton title="Open Task Manager" variant="secondary" href="/tasks" />
    </View>
    {work.attention.map((task) => <View key={task.id} style={{ ...cardStyle, gap: spacing.sm }}>
      <TaskStatusBadge status={getTaskStatus(task, now)} />
      <Text style={{ ...typography.heading, color: colors.heading }}>{task.title}</Text>
      <Text style={{ ...typography.caption, color: colors.text }}>{analytics.eventMap.get(task.event_id)?.name} · {taskDeadline(task)}</Text>
      <AppButton title="View event" variant="secondary" href={{ pathname: '/events/[id]', params: { id: task.event_id } }} />
    </View>)}
    {completion.totalTasks > 0 && work.attention.length === 0 && <Text style={{ ...typography.body, color: colors.text }}>Nothing urgent right now. Your next deadlines have room to breathe.</Text>}
    <Text accessibilityRole="header" style={{ ...typography.heading, color: colors.heading }}>Budget watch</Text>
    <Text style={{ ...typography.caption, color: colors.text }}>Actual overspending, estimates over budget, and budgets at least 90% used.</Text>
    {analytics.warnings.length === 0 ? <EmptyState title={records.events.length ? 'No budget warnings' : 'Budgets start with an event'}
      description={records.expenses.length ? 'Recorded expenses are within their event budgets.' : 'Add expenses in Budget Manager to compare estimates and spending with each event budget.'} icon="wallet-outline" />
      : <>
        <Text style={{ ...typography.caption, color: colors.text }}>{analytics.warnings.length} {analytics.warnings.length === 1 ? 'event needs' : 'events need'} a budget review.</Text>
        {analytics.warnings.slice(0, 3).map(({ event, summary, kind }) => <View key={event.id} style={{ ...cardStyle, borderColor: kind === 'near-limit' ? colors.border : '#F1B8C2', gap: spacing.md }}>
          <Text style={{ ...typography.heading, color: colors.heading }}>{event.name}</Text>
          <Text style={{ ...typography.label, color: kind === 'near-limit' ? colors.primary : colors.danger }}>
            {kind === 'overspent' ? `Over budget by ${formatLkr(summary.overspentAmount)}`
              : kind === 'estimated' ? `Estimates exceed budget by ${formatLkr(summary.estimated - summary.budget)}`
                : `${summary.utilizationPercent?.toFixed(2)}% of budget used`}
          </Text>
          <Text style={{ ...typography.caption, color: colors.text }}>Budget {formatLkr(summary.budget)} · Actual {formatLkr(summary.actual)}</Text>
          <View accessibilityRole="progressbar" accessibilityLabel={`${event.name} budget utilization`}
            accessibilityValue={summary.utilizationPercent === null ? { text: 'Unavailable: zero event budget' }
              : { min: 0, max: 100, now: summary.progressPercent, text: `${summary.utilizationPercent.toFixed(2)}% used` }}
            style={{ height: 10, backgroundColor: colors.border, borderRadius: 10, overflow: 'hidden' }}>
            <View style={{ height: '100%', width: `${summary.progressPercent}%`, backgroundColor: summary.overspent ? colors.danger : colors.primary }} />
          </View>
          {summary.utilizationPercent === null && <Text style={{ ...typography.caption, color: colors.text }}>Utilization unavailable until an event budget is set.</Text>}
          <AppButton title="View event" variant="secondary" href={{ pathname: '/events/[id]', params: { id: event.id } }} />
        </View>)}
        {analytics.warnings.length > 3 && <Text style={{ ...typography.caption, color: colors.text }}>Showing three warnings. Review other events in Budget Manager.</Text>}
      </>}
    <AppButton title="Open Budget Manager" variant="secondary" href="/budget" />
  </View>;
}
