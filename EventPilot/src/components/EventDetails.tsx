import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { router } from 'expo-router';
import { events, tasks, subscribeTaskChanges } from '../database';
import { useFocusQuery } from '../hooks/useFocusQuery';
import { eventDate } from '../utils/eventForm';
import { cardStyle, colors, spacing, typography } from '../constants/theme';
import AppButton from './AppButton';
import EventCard from './EventCard';
import EmptyState from './EmptyState';
import EventReadiness from './EventReadiness';
import { readinessForEvent } from '../utils/eventReadiness';

export default function EventDetails({ id }: { id: number | null }) {
  const query = useCallback(async () => {
    if (id === null) return null;
    const [event, rows] = await Promise.all([events.getById(id), tasks.listByEvent(id)]);
    return event ? { event, readiness: readinessForEvent(id, rows) } : null;
  }, [id]);
  const { data, loading, error, retry } = useFocusQuery(query, subscribeTaskChanges);
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const pending = useRef(false);
  async function remove() {
    if (pending.current || id === null) return;
    pending.current = true;
    setDeleting(true);
    setDeleteError('');
    try {
      await events.delete(id);
      router.replace('/events');
    } catch (cause) {
      console.error('Unable to delete event', cause);
      setDeleteError('Unable to delete this event. Please try again.');
    } finally { pending.current = false; setDeleting(false); }
  }
  if (loading) return <ActivityIndicator color={colors.primary} accessibilityLabel="Loading event" />;
  if (error) return <EmptyState title="Unable to load event" description="Please try again."
    action={<AppButton title="Retry" onPress={retry} />} />;
  if (!data) return <EmptyState title="Event not found" description="This event may have been deleted."
    action={<AppButton title="Browse events" href="/events" />} />;
  const { event, readiness } = data;
  return <>
    <EventCard title={event.name} date={eventDate(event)} location={event.location || 'Venue to be decided'} status={event.category} />
    <View style={cardStyle}><EventReadiness readiness={readiness} /></View>
    <View style={{ ...cardStyle, gap: spacing.md }}>
      <Text style={{ ...typography.heading, color: colors.heading }}>Description</Text>
      <Text style={{ ...typography.body, color: colors.text }}>{event.notes || 'No description added.'}</Text>
      <Text style={{ ...typography.heading, color: colors.heading }}>Total budget</Text>
      <Text style={{ ...typography.body, color: colors.text }}>{event.currency} {(event.budget_cents / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
    </View>
    {!confirming ? <>
      <AppButton title="Edit event" href={{ pathname: '/events/[id]/edit', params: { id: event.id } }} />
      <AppButton title="View timeline" href={{ pathname: '/events/[id]/timeline', params: { id: event.id } }} variant="secondary" />
      <AppButton title="Delete event" variant="secondary" onPress={() => setConfirming(true)} />
    </> : <View style={{ ...cardStyle, gap: spacing.lg }}>
      <Text accessibilityRole="header" style={{ ...typography.heading, color: colors.danger }}>Delete this event?</Text>
      <Text style={{ ...typography.body, color: colors.text }}>“{event.name}” and all its tasks, expenses, and activities will be permanently deleted.</Text>
      {!!deleteError && <Text accessibilityRole="alert" style={{ color: colors.danger }}>{deleteError}</Text>}
      <AppButton title={deleting ? 'Deleting…' : 'Confirm deletion'} disabled={deleting} onPress={remove} />
      <AppButton title="Cancel" variant="secondary" disabled={deleting} onPress={() => { setConfirming(false); setDeleteError(''); }} />
    </View>}
  </>;
}
