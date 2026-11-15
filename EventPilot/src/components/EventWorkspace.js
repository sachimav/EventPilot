import { useCallback } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { events } from '../database';
import { useFocusQuery } from '../hooks/useFocusQuery';
import { colors, spacing, typography } from '../constants/theme';
import AppButton from './AppButton';
import EmptyState from './EmptyState';
import TaskManager from './TaskManager';
import BudgetManager from './BudgetManager';
import PeopleManager from './PeopleManager';
export default function EventWorkspace({ id, section }) {
    const query = useCallback(() => id === null ? Promise.resolve(null) : events.getById(id), [id]);
    const { data: event, loading, error, retry } = useFocusQuery(query);
    if (loading)
        return <ActivityIndicator color={colors.primary} accessibilityLabel="Loading event workspace"/>;
    if (error)
        return <EmptyState title="Unable to load event" description="Please try again." action={<AppButton title="Retry" onPress={retry}/>}/>;
    if (!event || event.deleted_at)
        return <EmptyState title="Event not found" description="This event may have been moved to Trash." action={<AppButton title="Browse events" href="/events"/>}/>;
    return <View style={{ gap: spacing.lg }}>
    <Text style={{ ...typography.heading, color: colors.primary }}>{event.name}</Text>
    {section === 'tasks' ? <TaskManager initialEventId={event.id}/> : section === 'budget' ? <BudgetManager initialEventId={event.id}/> : <PeopleManager eventId={event.id} kind={section}/>}
    <AppButton title="Back to event" variant="secondary" icon="arrow-back-outline" href={{ pathname: '/events/[id]', params: { id: event.id } }}/>
  </View>;
}
