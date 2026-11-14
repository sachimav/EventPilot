import { ActivityIndicator } from 'react-native';
import { events } from '../database';
import { useFocusQuery } from '../hooks/useFocusQuery';
import { eventDate } from '../utils/eventForm';
import EventCard from './EventCard';
import EmptyState from './EmptyState';
import AppButton from './AppButton';
import { colors } from '../constants/theme';

export default function EventList({ limit }: { limit?: number }) {
  const { data, loading, error, retry } = useFocusQuery(events.list);
  if (loading) return <ActivityIndicator color={colors.primary} accessibilityLabel="Loading events" />;
  if (error) return <EmptyState title="Unable to load events" description="Please try reading your local events again."
    action={<AppButton title="Retry" onPress={retry} />} />;
  if (!data?.length) return <EmptyState title="No events yet" description="Create your first event to start planning." icon="calendar-outline" />;
  return <>{data.slice(0, limit).map((event) => <EventCard key={event.id} title={event.name} date={eventDate(event)}
    location={event.location || 'Venue to be decided'} status={event.category}
    href={{ pathname: '/events/[id]', params: { id: event.id } }} />)}</>;
}
