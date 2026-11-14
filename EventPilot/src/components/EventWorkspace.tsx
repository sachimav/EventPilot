import { useCallback } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { events } from '../database';
import { useFocusQuery } from '../hooks/useFocusQuery';
import { colors, spacing, typography } from '../constants/theme';
import AppButton from './AppButton';
import EmptyState from './EmptyState';
import TaskManager from './TaskManager';
import BudgetManager from './BudgetManager';

export default function EventWorkspace({ id, section }: { id: number | null; section: 'tasks' | 'budget' }) {
  const query = useCallback(() => id === null ? Promise.resolve(null) : events.getById(id), [id]);
  const { data: event, loading, error, retry } = useFocusQuery(query);
  if (loading) return <ActivityIndicator color={colors.primary} accessibilityLabel="Loading event workspace" />;
  if (error) return <EmptyState title="Unable to load event" description="Please try again." action={<AppButton title="Retry" onPress={retry} />} />;
  if (!event) return <EmptyState title="Event not found" description="This event may have been deleted." action={<AppButton title="Browse events" href="/events" />} />;
  return <View style={{ gap: spacing.lg }}>
    <Text style={{ ...typography.heading, color: colors.primary }}>{event.name}</Text>
    {section === 'tasks' ? <TaskManager initialEventId={event.id} /> : <BudgetManager initialEventId={event.id} />}
    <AppButton title="Back to event" variant="secondary" icon="arrow-back-outline" href={{ pathname: '/events/[id]', params: { id: event.id } }} />
  </View>;
}
