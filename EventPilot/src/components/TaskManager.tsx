import { useMemo, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { events, tasks, type Task } from '../database';
import { useFocusQuery } from '../hooks/useFocusQuery';
import { defaultTaskFilters, emptyTask, filterTasks, fromTask, priorityChoices, type TaskFilters } from '../utils/taskManager';
import { colors, spacing, typography } from '../constants/theme';
import AppButton from './AppButton';
import ChoiceChips from './ChoiceChips';
import EmptyState from './EmptyState';
import TaskCard from './TaskCard';
import TaskForm from './TaskForm';
import { useTaskClock } from '../hooks/useTaskClock';
import { countTaskStatuses, taskStatusLabels, type TaskStatus } from '../utils/taskDeadlines';
import { taskStatusStyles } from './TaskStatusBadge';

async function loadTasks() {
  const [eventRows, taskRows] = await Promise.all([events.list(), tasks.list()]);
  return { events: eventRows, tasks: taskRows };
}

export default function TaskManager({ initialEventId }: { initialEventId?: number } = {}) {
  const { data, loading, error, retry } = useFocusQuery(loadTasks);
  const [filters, setFilters] = useState<TaskFilters>({ ...defaultTaskFilters, event: initialEventId ? String(initialEventId) : 'all' });
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);
  const now = useTaskClock();
  const visible = useMemo(() => filterTasks(data?.tasks ?? [], filters, now), [data, filters, now]);
  // Counts honor event/priority selection but ignore status, so all buckets stay visible.
  const counts = useMemo(() => countTaskStatuses(filterTasks(data?.tasks ?? [], { ...filters, status: 'all' }, now), now), [data, filters, now]);
  // Keep unsaved edits mounted if a live status transition hides the task.
  const editingExists = editing !== null && !!data?.tasks.some((task) => task.id === editing.id);
  const displayed = editing && editingExists && !visible.some((task) => task.id === editing.id) ? [editing, ...visible] : visible;
  const eventNames = new Map(data?.events.map((event) => [event.id, event.name]));
  const editingForm = creating || editingExists;
  const active = filters.event !== 'all' || filters.priority !== 'all' || filters.status !== 'all';
  const eventChoices = [{ value: 'all', label: 'All events' }, ...(data?.events ?? []).map((event) => ({ value: String(event.id), label: event.name }))];
  if (!eventChoices.some((choice) => choice.value === filters.event)) eventChoices.push({ value: filters.event, label: 'Deleted event' });
  function clear() { setFilters({ ...defaultTaskFilters }); }
  return <View style={{ gap: spacing.lg }}>
    <AppButton title="Create task" icon="add-circle-outline" onPress={() => { setEditing(null); setCreating(true); }} disabled={editingForm || loading || error || !data?.events.length} />
    {editing && !editingExists && !loading && <View style={{ gap: spacing.sm }}>
      <Text accessibilityRole="alert" style={{ color: colors.text }}>The task you were editing is no longer available. You can create another task.</Text>
      <AppButton title="Dismiss" variant="secondary" onPress={() => setEditing(null)} />
    </View>}
    {editingExists && <AppButton title="Cancel editing" variant="secondary" icon="close-outline" onPress={() => setEditing(null)} />}
    {creating && data && <TaskForm events={data.events} initialValues={{ ...emptyTask, eventId: filters.event === 'all' ? (data.events.length === 1 ? String(data.events[0].id) : '') : filters.event }}
      onCancel={() => setCreating(false)} onSave={async (input) => {
        await tasks.create(input);
        setCreating(false);
        retry();
      }} />}
    <ChoiceChips label="Filter by event" value={filters.event} choices={eventChoices} disabled={editingForm}
      onChange={(event) => setFilters((current) => ({ ...current, event }))} />
    <ChoiceChips label="Filter by priority" value={filters.priority} choices={[{ value: 'all', label: 'All priorities' }, ...priorityChoices]} disabled={editingForm}
      onChange={(priority) => setFilters((current) => ({ ...current, priority }))} />
    <ChoiceChips label="Filter by status" value={filters.status} disabled={editingForm}
      choices={[{ value: 'all', label: 'All statuses' }, { value: 'pending', label: 'Pending' },
        { value: 'overdue', label: 'Overdue' }, { value: 'urgent', label: 'Urgent' }, { value: 'upcoming', label: 'Upcoming' }, { value: 'completed', label: 'Completed' }]}
      onChange={(status) => setFilters((current) => ({ ...current, status }))} />
    {active && <AppButton title="Clear filters" variant="secondary" onPress={clear} disabled={editingForm} />}
    {error && data && <Text accessibilityRole="alert" style={{ color: colors.danger }}>Unable to refresh tasks. Showing the last loaded data. Please use Refresh tasks to retry.</Text>}
    {loading && !data ? <ActivityIndicator color={colors.primary} accessibilityLabel="Loading tasks" />
      : !data ? <EmptyState title="Unable to load tasks" description="Please try reading your local tasks again." action={<AppButton title="Retry" onPress={retry} />} />
        : !data.events.length ? <EmptyState title="Every task needs an event" description="Create an event first, then add the details to your checklist."
          action={<AppButton title="Create an event" href="/events/create" />} />
          : <>
            <Text style={{ ...typography.caption, color: colors.text }}>Status counts for the selected event and priority</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
              {(['overdue', 'urgent', 'upcoming', 'completed'] as TaskStatus[]).map((status) => <View key={status}
                style={{ flexGrow: 1, flexBasis: 125, padding: spacing.md, borderRadius: 12, gap: spacing.xs, backgroundColor: taskStatusStyles[status].background }}>
                <Text style={{ ...typography.title, color: taskStatusStyles[status].color }}>{counts[status]}</Text>
                <Text style={{ ...typography.label, color: taskStatusStyles[status].color }}>{taskStatusLabels[status]}</Text>
              </View>)}
            </View>
            <Text style={{ ...typography.caption, color: colors.text }}>Urgent means due now or within 48 hours. Tasks without a deadline remain Upcoming.</Text>
            <Text accessibilityLiveRegion="polite" style={{ ...typography.caption, color: colors.text }}>{visible.length} of {data.tasks.length} tasks · Overdue and urgent first, then later tasks, then completed</Text>
            {data.tasks.length === 0 ? <EmptyState title="Your checklist starts here" description="Tap Create task to add your first event to-do." icon="checkbox-outline" />
              : displayed.length === 0 ? <EmptyState title="A little breathing room" description="No tasks match these filters. Try another event, priority, or status." icon="checkbox-outline"
                action={<AppButton title="Clear filters" onPress={clear} />} />
                : displayed.map((task) => editing?.id === task.id ? <TaskForm key={`edit-${task.id}`} events={data.events}
                  initialValues={fromTask(editing)} editing onCancel={() => setEditing(null)} onSave={async (input) => {
                    if (!await tasks.update(task.id, input)) throw new Error('Task no longer exists.');
                    setEditing(null);
                    retry();
                  }} /> : <TaskCard key={task.id} task={task} eventName={eventNames.get(task.event_id) ?? 'Event unavailable'}
                  now={now} disabled={editingForm} onEdit={() => setEditing(task)} onChange={retry} />)}
            <AppButton title="Refresh tasks" variant="secondary" onPress={retry} disabled={editingForm} />
          </>}
  </View>;
}
