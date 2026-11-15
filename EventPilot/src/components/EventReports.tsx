import { useCallback, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { activities, events, expenses, guests, tasks, vendors } from '../database';
import { useFocusQuery } from '../hooks/useFocusQuery';
import { calendarExport, csv, eventReport } from '../utils/eventExports';
import { saveTextFile } from '../utils/files';
import { sortActivities } from '../utils/activityTimeline';
import AppButton from './AppButton';
import EmptyState from './EmptyState';
import { spacing, colors } from '../constants/theme';

export default function EventReports({ id }: { id: number | null }) {
  const query = useCallback(async () => {
    if (id === null) return null;
    const [event, taskRows, expenseRows, activityRows, guestRows, vendorRows] = await Promise.all([events.getById(id), tasks.listByEvent(id), expenses.listByEvent(id), activities.listByEvent(id), guests.listByEvent(id), vendors.listByEvent(id)]);
    return event && !event.deleted_at ? { event, tasks: taskRows, expenses: expenseRows, activities: sortActivities(activityRows), guests: guestRows, vendors: vendorRows } : null;
  }, [id]);
  const { data, loading, error, retry } = useFocusQuery(query);
  const [message,setMessage] = useState('');
  async function save(name: string, text: string, mime: string) { try { await saveTextFile(name,text,mime); setMessage('Export ready.'); } catch (cause) { setMessage(String(cause)); } }
  if (loading) return <ActivityIndicator />;
  if (error) return <AppButton title="Retry reports" onPress={retry} />;
  if (!data) return <EmptyState title="Event not found" description="Choose an active event." />;
  return <View style={{ gap: spacing.lg }}>
    <Text>{data.event.name}</Text>
    <Text>Exports are generated from your locally saved records. Guest and vendor exports can contain personal information.</Text>
    <AppButton title="Download printable event report" onPress={() => save('event-report.html', eventReport(data.event,data.tasks,data.expenses,data.activities,data.guests,data.vendors),'text/html')} />
    <Text>Open the downloaded report in a browser to print or save as PDF.</Text>
    <AppButton title="Export guest CSV" variant="secondary" onPress={() => save('guests.csv', csv([['Name','Email','Phone','RSVP','Plus-ones','Dietary','Checked in'], ...data.guests.map((g) => [g.name,g.email,g.phone,g.rsvp,g.plus_ones,g.dietary,g.checked_in])]), 'text/csv')} />
    <AppButton title="Export expense CSV" variant="secondary" onPress={() => save('expenses.csv', csv([['Category','Description','Estimated LKR','Actual LKR'], ...data.expenses.map((e) => [e.category,e.title,(e.estimated_cents / 100).toFixed(2),(e.amount_cents / 100).toFixed(2)])]), 'text/csv')} />
    <AppButton title="Export calendar (.ics)" variant="secondary" onPress={() => save('event-calendar.ics', calendarExport([data.event],data.activities,data.tasks),'text/calendar')} />
    <Text>Calendar events include a 24-hour reminder. Your calendar app controls reminder delivery. Events without an end time use a one-hour calendar slot.</Text>
    {!!message && <Text accessibilityRole="alert" style={{ color: colors.primary }}>{message}</Text>}
  </View>;
}
