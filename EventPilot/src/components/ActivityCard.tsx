import { useRef, useState } from 'react';
import { Text, View } from 'react-native';
import { activities, type Activity } from '../database';
import { activityTimeRange } from '../utils/activityTimeline';
import { cardStyle, colors, spacing, typography } from '../constants/theme';
import AppButton from './AppButton';

export default function ActivityCard({ activity, disabled, onEdit, onChange }: {
  activity: Activity; disabled: boolean; onEdit: () => void; onChange: () => void;
}) {
  const [confirm, setConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');
  const pending = useRef(false);
  async function remove() {
    if (pending.current) return;
    pending.current = true;
    setDeleting(true);
    setError('');
    try { await activities.delete(activity.id); onChange(); }
    catch (cause) { console.error('Unable to delete activity', cause); setError('Unable to delete this activity. Please try again.'); }
    finally { pending.current = false; setDeleting(false); }
  }
  const locked = disabled || deleting;
  return <View style={{ ...cardStyle, padding: spacing.lg, gap: spacing.md }}>
    <Text style={{ ...typography.label, color: colors.primary }}>{activityTimeRange(activity)}</Text>
    <Text accessibilityRole="header" style={{ ...typography.heading, color: colors.heading }}>{activity.title}</Text>
    {!!activity.notes && <Text style={{ ...typography.body, color: colors.text }}>{activity.notes}</Text>}
    {!!activity.location && <Text style={{ ...typography.caption, color: colors.text }}>{activity.location}</Text>}
    {confirm ? <>
      <Text accessibilityRole="alert" style={{ color: colors.danger }}>Permanently delete “{activity.title}”?</Text>
      <AppButton title={deleting ? 'Deleting…' : 'Confirm deletion'} disabled={locked} onPress={remove} />
      <AppButton title="Cancel deletion" variant="secondary" disabled={locked} onPress={() => { setConfirm(false); setError(''); }} />
    </> : <>
      <AppButton title="Edit activity" variant="secondary" disabled={locked} onPress={onEdit} />
      <AppButton title="Delete activity" variant="secondary" disabled={locked} onPress={() => setConfirm(true)} />
    </>}
    {!!error && <Text accessibilityRole="alert" style={{ color: colors.danger }}>{error}</Text>}
  </View>;
}
