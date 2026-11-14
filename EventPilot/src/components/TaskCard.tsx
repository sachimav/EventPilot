import { useRef, useState } from 'react';
import { Text, View } from 'react-native';
import { tasks, type Task } from '../database';
import { taskDeadline } from '../utils/taskManager';
import { cardStyle, colors, spacing, typography } from '../constants/theme';
import AppButton from './AppButton';
import { getTaskStatus } from '../utils/taskDeadlines';
import TaskStatusBadge from './TaskStatusBadge';

export default function TaskCard({ task, eventName, disabled, onEdit, onChange, now }: {
  task: Task; eventName: string; disabled: boolean; onEdit: () => void; onChange: () => void; now: number;
}) {
  const [details, setDetails] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const pending = useRef(false);
  async function mutate(remove: boolean) {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setError('');
    try {
      const changed = remove ? await tasks.delete(task.id) : await tasks.update(task.id, { completed: task.completed ? 0 : 1 });
      if (!changed) throw new Error('Task no longer exists.');
      onChange();
    } catch (cause) {
      console.error('Unable to change task', cause);
      setError('Unable to change this task. Please try again or refresh the list.');
    } finally { pending.current = false; setBusy(false); }
  }
  const locked = disabled || busy;
  return <View style={{ ...cardStyle, gap: spacing.md }}>
    <TaskStatusBadge status={getTaskStatus(task, now)} />
    <Text style={{ ...typography.caption, color: task.priority === 'high' ? colors.danger : colors.primary, fontWeight: '600' }}>
      {task.priority.toUpperCase()} PRIORITY
    </Text>
    <Text accessibilityRole="header" style={{ ...typography.heading, color: colors.heading, textDecorationLine: task.completed ? 'line-through' : 'none' }}>{task.title}</Text>
    <Text style={{ ...typography.body, color: colors.text }}>{eventName}</Text>
    <Text style={{ ...typography.caption, color: colors.text }}>Deadline: {taskDeadline(task)}</Text>
    <AppButton title={details ? 'Hide details' : 'Show details'} variant="secondary" onPress={() => setDetails((value) => !value)} disabled={busy} />
    {details && <>
      <Text style={{ ...typography.body, color: colors.text }}>{task.notes || 'No description added.'}</Text>
      <AppButton title="View event" variant="secondary" href={{ pathname: '/events/[id]', params: { id: task.event_id } }} disabled={locked} />
    </>}
    <AppButton title="Edit task" icon="create-outline" variant="secondary" onPress={onEdit} disabled={locked} />
      {!confirm ? <AppButton title="Delete task" icon="trash-outline" variant="danger" onPress={() => setConfirm(true)} disabled={locked} /> : <>
        <Text accessibilityRole="alert" style={{ color: colors.danger }}>Delete “{task.title}” permanently?</Text>
        <AppButton title={busy ? 'Deleting…' : 'Confirm deletion'} onPress={() => mutate(true)} disabled={locked} />
        <AppButton title="Cancel deletion" variant="secondary" onPress={() => setConfirm(false)} disabled={locked} />
      </>}
    {!confirm && <AppButton title={busy ? 'Updating…' : task.completed ? 'Mark incomplete' : 'Mark complete'} onPress={() => mutate(false)} disabled={locked} />}
    {!!error && <Text accessibilityRole="alert" style={{ color: colors.danger }}>{error}</Text>}
  </View>;
}
