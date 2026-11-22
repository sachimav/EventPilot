import { useTheme } from '../hooks/useTheme';
import { useEffect, useState } from 'react';
import { ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { events } from '../database';
import { fromEvent } from '../utils/eventForm';
import EventForm from './EventForm';
import EmptyState from './EmptyState';
import AppButton from './AppButton';
import { showSuccess } from '../utils/feedback';
export default function EventEditor({ id }) {
  const theme = useTheme();
  const { colors } = theme;
    const [event, setEvent] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [attempt, setAttempt] = useState(0);
    useEffect(() => {
        let active = true;
        const request = id === null ? Promise.resolve(null) : events.getById(id);
        request.then((result) => {
            if (active) {
                setEvent(result?.deleted_at ? null : result);
                setLoading(false);
            }
        }, (cause) => {
            console.error('Unable to load event for editing', cause);
            if (active) {
                setError(true);
                setLoading(false);
            }
        });
        return () => { active = false; };
    }, [id, attempt]);
    if (loading)
        return <ActivityIndicator color={colors.primary} accessibilityLabel="Loading event"/>;
    if (error)
        return <EmptyState title="Unable to load event" description="Please try again." action={<AppButton title="Retry" onPress={() => { setLoading(true); setError(false); setAttempt((value) => value + 1); }}/>}/>;
    if (!event)
        return <EmptyState title="Event not found" description="This event may have been moved to Trash. Restore it in Data & recovery before editing." action={<AppButton title="Data & recovery" href="/data"/>}/>;
    return <EventForm key={event.id} initialValues={fromEvent(event)} currency={event.currency} onSave={async (input) => {
            const changed = await events.updateDetails(event.id, input);
            if (!changed) {
                setEvent(null);
                return;
            }
            showSuccess('Event updated', input.name);
            router.replace({ pathname: '/events/[id]', params: { id: event.id } });
        }}/>;
}
