import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { activities, events, tasks, subscribeDataChanges } from '../database';
import { useFocusQuery } from '../hooks/useFocusQuery';
import { dateString } from '../utils/eventForm';
import { calendarAgenda, calendarExport } from '../utils/eventExports';
import { saveTextFile } from '../utils/files';
import { cardStyle, colors, spacing } from '../constants/theme';
import AppButton from './AppButton';
import AppInput from './AppInput';
import EmptyState from './EmptyState';

async function load() {
  const [eventRows,taskRows] = await Promise.all([events.list(),tasks.list()]);
  const activityRows = (await Promise.all(eventRows.map((event) => activities.listByEvent(event.id)))).flat();
  return { events: eventRows, tasks: taskRows, activities: activityRows };
}
export default function PlanningCalendar() {
  const { data,loading,error,retry } = useFocusQuery(load,subscribeDataChanges);
  const [month,setMonth] = useState(dateString(new Date()).slice(0,7)); const [message,setMessage] = useState('');
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const agenda = useMemo(() => data ? calendarAgenda(data.events,data.tasks,data.activities).filter((row) => row.date.startsWith(month)) : [], [data,month]);
  const validMonth = /^\d{4}-(0[1-9]|1[0-2])$/.test(month);
  const first = validMonth ? new Date(`${month}-01T12:00:00`) : null;
  const dayCount = first ? new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate() : 0;
  const visibleAgenda = selectedDay?.startsWith(month) ? agenda.filter((row) => row.date === selectedDay) : agenda;
  return <View style={{ gap: spacing.lg }}>
    <AppInput label="Month (YYYY-MM)" value={month} onChangeText={setMonth} error={validMonth ? undefined : 'Enter a month such as 2026-12.'} />
    <View style={{ flexDirection: 'row', gap: spacing.sm }}>{[-1,1].map((step) => <View key={step} style={{ flex: 1 }}><AppButton title={step < 0 ? 'Previous month' : 'Next month'} variant="secondary" disabled={!validMonth} onPress={() => {
      const date = new Date(`${month}-15T12:00:00`); date.setMonth(date.getMonth() + step); setMonth(dateString(date).slice(0,7));
    }} /></View>)}</View>
    {first && <View style={{ ...cardStyle, gap: spacing.sm }}>
      <Text accessibilityRole="header" style={{ color: colors.heading, fontWeight: '700' }}>{first.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</Text>
      <View style={{ flexDirection: 'row' }}>{['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map((day) => <Text key={day} style={{ width: '14.2857%', textAlign: 'center', fontSize: 11 }}>{day}</Text>)}</View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        {Array.from({ length: first.getDay() }, (_, index) => <View key={`blank-${index}`} style={{ width: '14.2857%' }} />)}
        {Array.from({ length: dayCount }, (_, index) => {
          const date = `${month}-${String(index + 1).padStart(2,'0')}`;
          const count = agenda.filter((row) => row.date === date).length;
          return <Pressable key={date} accessibilityRole="button" accessibilityLabel={`${date}, ${count} scheduled items`} accessibilityState={{ selected: selectedDay === date }} onPress={() => setSelectedDay(selectedDay === date ? null : date)} style={{ width: '14.2857%', minHeight: 52, alignItems: 'center', justifyContent: 'center', borderRadius: 8, backgroundColor: selectedDay === date ? colors.primarySoft : 'transparent' }}>
            <Text style={{ color: colors.heading, fontWeight: count ? '700' : '400' }}>{index + 1}</Text>
            <Text style={{ fontSize: 10, color: colors.primary }}>{count ? `${count} items` : ' '}</Text>
          </Pressable>;
        })}
      </View>
      {selectedDay?.startsWith(month) && <AppButton title="Show full month" variant="secondary" onPress={() => setSelectedDay(null)} />}
    </View>}
    {loading ? <ActivityIndicator /> : error ? <AppButton title="Retry calendar" onPress={retry} /> : visibleAgenda.length === 0 ? <EmptyState title="A clear calendar" description="No events, pending task deadlines, or activities in this period." />
      : validMonth && visibleAgenda.map((row) => <View key={row.key} style={{ ...cardStyle, gap: spacing.sm }}>
        <Text style={{ color: colors.primary }}>{row.date} · {row.time} · {row.type}</Text><Text>{row.title}</Text>
        <AppButton title="Open event" variant="secondary" href={{ pathname: '/events/[id]', params: { id: row.eventId } }} />
      </View>)}
    <AppButton title="Export all to calendar" disabled={!data} onPress={async () => {
      if (!data) return; try { await saveTextFile('eventpilot-calendar.ics', calendarExport(data.events,data.activities,data.tasks),'text/calendar'); setMessage('Calendar exported. Import it into your calendar app.'); } catch (cause) { setMessage(String(cause)); }
    }} />
    {!!message && <Text accessibilityRole="alert">{message}</Text>}
  </View>;
}
