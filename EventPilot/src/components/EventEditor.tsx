import { useEffect, useState } from 'react';
import { ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { events, type Event } from '../database';
import { fromEvent } from '../utils/eventForm';
import EventForm from './EventForm';
import EmptyState from './EmptyState';
import AppButton from './AppButton';
import { colors } from '../constants/theme';

export default function EventEditor({ id }: { id: number | null }) {
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    const request = id === null ? Promise.resolve(null) : events.getById(id);
    request.then((result) => {
      if (active) { setEvent(result); setLoading(false); }
    }, (cause) => {
      console.error('Unable to load event for editing', cause);
      if (active) { setError(true); setLoading(false); }
    });
    return () => { active = false; };
  }, [id, attempt]);
  if (loading) return <ActivityIndicator color={colors.primary} accessibilityLabel="Loading event" />;
  if (error) return <EmptyState title="Unable to load event" description="Please try again."
    action={<AppButton title="Retry" onPress={() => { setLoading(true); setError(false); setAttempt((value) => value + 1); }} />} />;
  if (!event) return <EmptyState title="Event not found" description="This event may have been deleted."
    action={<AppButton title="Browse events" href="/events" />} />;
  return <EventForm key={event.id} initialValues={fromEvent(event)} currency={event.currency} onSave={async (input) => {
    const changed = await events.update(event.id, input);
    if (!changed) { setEvent(null); return; }
    router.replace({ pathname: '/events/[id]', params: { id: event.id } });
  }} />;
}
