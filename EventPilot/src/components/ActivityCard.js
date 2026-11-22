import { useTheme } from '../hooks/useTheme';
import { useRef, useState } from 'react';
import { Text, View } from 'react-native';
import { activities } from '../database';
import { activityTimeRange } from '../utils/activityTimeline';
import { spacing, typography } from '../constants/theme';
import AppButton from './AppButton';
import { showSuccess, showError } from '../utils/feedback';
export default function ActivityCard({ activity, disabled, onEdit, onChange }) {
  const theme = useTheme();
  const { colors, cardStyle } = theme;
    const [confirm, setConfirm] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [error, setError] = useState('');
    const pending = useRef(false);
    async function remove() {
        if (pending.current)
            return;
        pending.current = true;
        setDeleting(true);
        setError('');
        try {
            if (!await activities.delete(activity.id)) throw new Error('Activity no longer exists.');
            showSuccess('Activity deleted', activity.title);
            onChange();
        }
        catch (cause) {
            showError('Unable to delete activity', 'Please refresh the list and try again.');
            console.error('Unable to delete activity', cause);
            setError('Unable to delete this activity. Please try again.');
        }
        finally {
            pending.current = false;
            setDeleting(false);
        }
    }
    const locked = disabled || deleting;
    return <View style={{ ...cardStyle, padding: spacing.lg, gap: spacing.md }}>
    <Text style={{ ...typography.label, color: colors.primary }}>{activityTimeRange(activity)}</Text>
    <Text accessibilityRole="header" style={{ ...typography.heading, color: colors.heading }}>{activity.title}</Text>
    {!!activity.notes && <Text style={{ ...typography.body, color: colors.text }}>{activity.notes}</Text>}
    {!!activity.location && <Text style={{ ...typography.caption, color: colors.text }}>{activity.location}</Text>}
    {confirm ? <>
      <Text accessibilityRole="alert" style={{ color: colors.danger }}>Permanently delete “{activity.title}”?</Text>
      <AppButton title={deleting ? 'Deleting…' : 'Confirm deletion'} disabled={locked} onPress={remove}/>
      <AppButton title="Cancel deletion" variant="secondary" disabled={locked} onPress={() => { setConfirm(false); setError(''); }}/>
    </> : <>
      <AppButton title="Edit activity" variant="secondary" disabled={locked} onPress={onEdit}/>
      <AppButton title="Delete activity" variant="secondary" disabled={locked} onPress={() => setConfirm(true)}/>
    </>}
    {!!error && <Text accessibilityRole="alert" style={{ color: colors.danger }}>{error}</Text>}
  </View>;
}
