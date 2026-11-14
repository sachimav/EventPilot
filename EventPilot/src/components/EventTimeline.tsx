import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { events, activities, type Activity } from '../database';
import { useFocusQuery } from '../hooks/useFocusQuery';
import { emptyActivity, fromActivity, groupActivities } from '../utils/activityTimeline';
import { validDate } from '../utils/eventForm';
import { colors, spacing, typography } from '../constants/theme';
import AppButton from './AppButton';
import EmptyState from './EmptyState';
import ActivityCard from './ActivityCard';
import ActivityForm from './ActivityForm';

export default function EventTimeline({ id }: { id: number | null }) {
  const query = useCallback(async () => {
    if (id === null) return { event: null, activities: [] };
    const [event, rows] = await Promise.all([events.getById(id), activities.listByEvent(id)]);
    return { event, activities: rows };
  }, [id]);
  const { data, loading, error, retry } = useFocusQuery(query);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Activity | null>(null);
  const groups = useMemo(() => groupActivities(data?.activities ?? []), [data]);
  const editingForm = creating || editing !== null;
  if (loading && !data) return <ActivityIndicator color={colors.primary} accessibilityLabel="Loading timeline" />;
  if (!data) return <EmptyState title="Unable to load timeline" description="Please try reading your local schedule again." action={<AppButton title="Retry" onPress={retry} />} />;
  if (!data.event) return <EmptyState title="Event not found" description="This event may have been deleted." action={<AppButton title="Browse events" href="/events" />} />;
  const event = data.event;
  return <View style={styles.content}>
    <Text accessibilityRole="header" style={styles.title}>{event.name}</Text>
    <Text style={styles.caption}>Your schedule, one moment at a time. Times are shown locally.</Text>
    {error && <View style={styles.content}>
      <Text accessibilityRole="alert" style={{ color: colors.danger }}>Unable to refresh the timeline. Showing the last loaded schedule.</Text>
      <AppButton title="Retry refresh" variant="secondary" onPress={retry} disabled={editingForm} />
    </View>}
    <AppButton title="Add activity" onPress={() => setCreating(true)} disabled={editingForm || loading || error} />
    {creating && <ActivityForm eventId={event.id} initialValues={{ ...emptyActivity, date: event.date && validDate(event.date) ? event.date : '' }} onCancel={() => setCreating(false)}
      onSave={async (input) => { await activities.create(input); setCreating(false); retry(); }} />}
    {!data.activities.length ? <EmptyState title="Every moment in its place" description="No activities scheduled yet. Add your first activity to start shaping the day." icon="time-outline" /> : <>
      <Text style={styles.caption}>{data.activities.length} {data.activities.length === 1 ? 'activity' : 'activities'} · Earliest first</Text>
      {groups.map((group) => <View key={group.date} style={styles.content}>
        <Text accessibilityRole="header" style={styles.day}>{group.label}</Text>
        {group.activities.map((activity, index) => <View key={activity.id} style={styles.timelineRow}>
          <View style={styles.rail} accessible={false}>
            <View style={styles.dot} />
            {index < group.activities.length - 1 && <View style={styles.line} />}
          </View>
          <View style={styles.entry}>
            {editing?.id === activity.id ? <ActivityForm eventId={event.id} initialValues={fromActivity(editing)} editing editingId={activity.id} onCancel={() => setEditing(null)} onSave={async (input) => {
              if (!await activities.update(activity.id, input)) throw new Error('Activity no longer exists.');
              setEditing(null); retry();
            }} /> : <ActivityCard activity={activity} disabled={editingForm} onEdit={() => setEditing(activity)} onChange={retry} />}
          </View>
        </View>)}
      </View>)}
    </>}
    <AppButton title="Refresh timeline" variant="secondary" onPress={retry} disabled={editingForm || loading} />
    <AppButton title="View event details" variant="secondary" href={{ pathname: '/events/[id]', params: { id: event.id } }} disabled={editingForm} />
  </View>;
}
const styles = StyleSheet.create({
  content: { gap: spacing.lg }, title: { ...typography.title, color: colors.heading },
  caption: { ...typography.caption, color: colors.text }, day: { ...typography.heading, color: colors.primary },
  timelineRow: { flexDirection: 'row', gap: spacing.md },
  rail: { width: 16, alignItems: 'center', paddingTop: spacing.xl },
  dot: { width: 12, height: 12, borderRadius: 6, backgroundColor: colors.primary },
  line: { width: 2, flex: 1, backgroundColor: colors.border, marginTop: spacing.sm, marginBottom: -spacing.lg },
  entry: { flex: 1, minWidth: 0 },
});
