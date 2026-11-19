import { useState } from 'react';
import { Text, View } from 'react-native';
import { events, reminders, subscribeDataChanges } from '../database';
import { useFocusQuery } from '../hooks/useFocusQuery';
import { useTaskClock } from '../hooks/useTaskClock';
import { dateString, validDate, timeString } from '../utils/eventForm';
import { cardStyle, colors, spacing } from '../constants/theme';
import AppButton from './AppButton';
import AppInput from './AppInput';
import ChoiceChips from './ChoiceChips';
import EventDateTimeField from './EventDateTimeField';
import EmptyState from './EmptyState';
import { showSuccess, showError } from '../utils/feedback';
async function load() { return { events: await events.list(), reminders: await reminders.list() }; }
export default function ReminderCenter() {
    const { data, retry, error } = useFocusQuery(load, subscribeDataChanges);
    const now = useTaskClock();
    const [eventId, setEventId] = useState('');
    const [title, setTitle] = useState('');
    const [date, setDate] = useState(dateString(new Date()));
    const [time, setTime] = useState('09:00');
    const [message, setMessage] = useState('');
    const [busy, setBusy] = useState(false);
    async function run(action, successTitle) { if (busy)
        return; setBusy(true); try {
        const result = await action();
        if (result === false) throw new Error('Reminder no longer exists.');
        retry();
        setMessage('Saved.');
        showSuccess(successTitle);
    }
    catch (cause) {
        setMessage(String(cause));
        showError('Unable to save reminder', 'Please try again.');
    }
    finally {
        setBusy(false);
    } }
    const selected = eventId || String(data?.events[0]?.id ?? '');
    const open = data?.reminders.filter((reminder) => !reminder.dismissed) ?? [];
    return <View style={{ gap: spacing.lg }}>
    <Text>These reminders appear while EventPilot is open. For reminders outside the browser, export your event calendar and enable calendar notifications.</Text>
    {error && <AppButton title="Retry reminders" onPress={retry}/>}
    {!data?.events.length ? <EmptyState title="Start with an event" description="Create an event before adding a reminder." action={<AppButton title="Create an event" href="/events/create"/>}/> : <>
      <ChoiceChips label="Event" choices={data.events.map((event) => ({ value: String(event.id), label: event.name }))} value={selected} onChange={setEventId} disabled={busy}/>
      <AppInput label="Reminder title *" value={title} onChangeText={setTitle} editable={!busy}/>
      <EventDateTimeField mode="date" value={date} onChange={setDate} disabled={busy}/>
      <EventDateTimeField mode="time" value={time} onChange={setTime} disabled={busy}/>
      <AppButton title="Add reminder" disabled={busy} onPress={() => {
                const at = new Date(`${date}T${time}:00`);
                if (!title.trim() || !validDate(date) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time) || !Number.isFinite(at.getTime()) || dateString(at) !== date || timeString(at) !== time) {
                    setMessage('Enter a title and valid date/time.');
                    return;
                }
                run(async () => { await reminders.create({ event_id: Number(selected), title: title.trim(), remind_at: at.toISOString() }); setTitle(''); }, 'Reminder created');
            }}/>
    </>}
    {!!message && <Text accessibilityRole="alert" style={{ color: colors.primary }}>{message}</Text>}
    {open.length === 0 && <EmptyState title="No pending reminders" description="Your saved reminders will appear here."/>}
    {open.map((reminder) => <View key={reminder.id} style={{ ...cardStyle, gap: spacing.md }}>
      <Text style={{ color: new Date(reminder.remind_at).getTime() <= now ? colors.danger : colors.primary }}>{new Date(reminder.remind_at).getTime() <= now ? 'Due now' : 'Scheduled'} · {new Date(reminder.remind_at).toLocaleString()}</Text>
      <Text>{reminder.title}</Text>
      <AppButton title="Dismiss reminder" disabled={busy} onPress={() => run(() => reminders.update(reminder.id, { dismissed: 1 }), 'Reminder dismissed')}/>
      <AppButton title="Open event" variant="secondary" href={{ pathname: '/events/[id]', params: { id: reminder.event_id } }}/>
    </View>)}
  </View>;
}
