import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Link } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useMemo } from 'react';
import { events, tasks, expenses, subscribeDataChanges } from '../database';
import { useFocusQuery } from '../hooks/useFocusQuery';
import { summarizeEvents } from '../utils/dashboard';
import { colors, radii, spacing, typography } from '../constants/theme';
import AppButton from './AppButton';
import EmptyState from './EmptyState';
import StatCard from './StatCard';
import DashboardEventCard from './DashboardEventCard';
import { calculateReadiness, readinessByEvent } from '../utils/eventReadiness';
import { useTaskClock } from '../hooks/useTaskClock';
import DashboardInsights from './DashboardInsights';

async function loadDashboard() {
  const [eventRows, taskRows, expenseRows] = await Promise.all([events.list(), tasks.list(), expenses.list()]);
  return { events: eventRows, tasks: taskRows, expenses: expenseRows };
}

export default function HomeDashboard() {
  const { data: records, loading, error, retry } = useFocusQuery(loadDashboard, subscribeDataChanges);
  const now = useTaskClock();
  const readiness = useMemo(() => readinessByEvent(records?.tasks ?? []), [records]);
  const data = useMemo(() => records ? { ...summarizeEvents(records.events, new Date(now)), readiness } : null, [records, now, readiness]);
  return <SafeAreaView style={styles.screen} edges={['left', 'right', 'bottom']}>
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.heading}>
        <Text style={styles.eyebrow}>EVENTPILOT</Text>
        <Text accessibilityRole="header" style={styles.title}>Your next great moment.</Text>
        <Text style={styles.subtitle}>A little planning. Something to look forward to.</Text>
      </View>
      <View style={styles.hero}>
        <View style={styles.heroTop}>
          <View style={styles.heroCopy}>
            <Text accessibilityRole="header" style={styles.heroTitle}>Make it happen.</Text>
            <Text style={styles.heroText}>Bring your next idea to life, one event at a time.</Text>
          </View>
          <View style={styles.heroIcon}><Ionicons name="calendar-outline" color={colors.surface} size={32} /></View>
        </View>
        <Link href="/events/create" asChild>
          <Pressable accessibilityRole="button" style={({ pressed }) => [styles.create, pressed && styles.pressed]}>
            <Ionicons name="add-circle-outline" size={22} color={colors.primary} />
            <Text style={styles.createLabel}>Create Event</Text>
          </Pressable>
        </Link>
      </View>
      {loading ? <View style={styles.loading}><ActivityIndicator color={colors.primary} accessibilityLabel="Loading dashboard" /><Text style={styles.subtitle}>Loading your event overview…</Text></View>
        : error || !data ? <EmptyState title="Unable to load your dashboard" description="Your local events could not be read. Please try again." action={<AppButton title="Retry" onPress={retry} />} />
          : <>
            <View style={styles.sectionHeader}><Text accessibilityRole="header" style={styles.sectionTitle}>At a glance</Text><Text style={styles.small}>Your event overview</Text></View>
            <View style={styles.stats}>
              <StatCard label="Total events" value={String(data.total)} caption="All your plans" icon="layers-outline" />
              <StatCard label="Upcoming events" value={String(data.upcoming)} caption="Still to come" icon="calendar-outline" tone="blue" />
              <StatCard label="Past events" value={String(data.past)} caption="Start time has passed" icon="checkmark-circle-outline" tone="green" />
            </View>
            {data.unscheduled > 0 && <Text style={styles.unscheduled}>{data.unscheduled} {data.unscheduled === 1 ? 'event needs' : 'events need'} a date. These count toward your total.</Text>}
            {records && <DashboardInsights records={records} now={now} />}
            <View style={styles.sectionHeader}>
              <View style={styles.sectionCopy}><Text accessibilityRole="header" style={styles.sectionTitle}>Coming up next</Text><Text style={styles.small}>Your next five events, soonest first</Text></View>
              <Link href="/events" accessibilityLabel="View all events" style={styles.browse}>View all</Link>
            </View>
            {data.total === 0 ? <EmptyState title="Your story starts here" description="No events yet. Tap Create Event above to plan your first great moment." icon="sparkles-outline" />
              : data.nextEvents.length === 0 ? <EmptyState title="Room for something new" description={data.unscheduled > 0 ? 'No upcoming events are scheduled. Add dates to your events or create a new one.' : 'You have no upcoming events. Create a new event when inspiration strikes.'} icon="calendar-outline" action={<AppButton title="Browse events" href="/events" variant="secondary" />} />
                : data.nextEvents.map((event) => <DashboardEventCard key={event.id} event={event} readiness={data.readiness.get(event.id) ?? calculateReadiness(0, 0)} />)}
            <Text style={styles.footnote}>Past events are based on their scheduled start. Events without a time stay upcoming through their scheduled day.</Text>
          </>}
    </ScrollView>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.xl, gap: spacing.lg, width: '100%', maxWidth: 760, alignSelf: 'center', paddingBottom: spacing.xxl },
  heading: { gap: spacing.sm, marginBottom: spacing.sm },
  eyebrow: { ...typography.caption, color: colors.primary, fontWeight: '700', letterSpacing: 2 },
  title: { ...typography.hero, color: colors.heading },
  subtitle: { ...typography.body, color: colors.text },
  hero: { padding: spacing.xl, borderRadius: radii.lg, backgroundColor: colors.primary, gap: spacing.xl },
  heroTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  heroCopy: { flex: 1, gap: spacing.sm },
  heroTitle: { ...typography.title, color: colors.surface },
  heroText: { ...typography.body, color: '#F0E9FF' },
  heroIcon: { backgroundColor: '#8355E7', padding: spacing.md, borderRadius: radii.md },
  create: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, backgroundColor: colors.surface, borderRadius: radii.md, minHeight: 52, padding: spacing.md },
  createLabel: { ...typography.body, color: colors.primary, fontWeight: '700' },
  pressed: { opacity: 0.8 },
  loading: { padding: spacing.xl, alignItems: 'center', gap: spacing.md },
  stats: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  sectionHeader: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm, marginTop: spacing.md },
  sectionCopy: { gap: spacing.xs },
  sectionTitle: { ...typography.heading, color: colors.heading },
  small: { ...typography.caption, color: colors.text },
  browse: { ...typography.label, color: colors.primary, paddingVertical: spacing.md, minHeight: 48 },
  unscheduled: { ...typography.caption, color: colors.text, backgroundColor: colors.primarySoft, padding: spacing.md, borderRadius: radii.sm },
  footnote: { ...typography.caption, color: colors.text, textAlign: 'center', marginTop: spacing.sm },
});
