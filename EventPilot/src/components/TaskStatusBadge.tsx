import Ionicons from '@expo/vector-icons/Ionicons';
import { Text, View } from 'react-native';
import { radii, spacing, typography } from '../constants/theme';
import { taskStatusLabels, type TaskStatus } from '../utils/taskDeadlines';

export const taskStatusStyles = {
  completed: { color: '#16705A', background: '#E6F5EE', icon: 'checkmark-circle-outline' },
  overdue: { color: '#B4233B', background: '#FDECF0', icon: 'alert-circle-outline' },
  urgent: { color: '#8A4B08', background: '#FFF1D6', icon: 'alarm-outline' },
  upcoming: { color: '#245AB5', background: '#EAF1FF', icon: 'calendar-outline' },
} as const;

export default function TaskStatusBadge({ status }: { status: TaskStatus }) {
  const palette = taskStatusStyles[status];
  return <View style={{ flexDirection: 'row', alignSelf: 'flex-start', alignItems: 'center', gap: spacing.xs,
    paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: radii.pill, backgroundColor: palette.background }}>
    <Ionicons name={palette.icon} size={18} color={palette.color} />
    <Text style={{ ...typography.label, color: palette.color }}>{taskStatusLabels[status]}</Text>
  </View>;
}
