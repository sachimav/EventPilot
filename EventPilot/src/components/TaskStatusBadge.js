import { useTheme } from '../hooks/useTheme';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Text, View } from 'react-native';
import { radii, spacing, typography } from '../constants/theme';
import { taskStatusLabels } from '../utils/taskDeadlines';
export const getTaskStatusStyles = (colors) => ({
    completed: { color: colors.success, background: colors.successSoft, icon: 'checkmark-circle-outline' },
    overdue: { color: colors.danger, background: colors.dangerSoft, icon: 'alert-circle-outline' },
    urgent: { color: colors.warning, background: colors.warningSoft, icon: 'alarm-outline' },
    upcoming: { color: colors.info, background: colors.infoSoft, icon: 'calendar-outline' },
});
export default function TaskStatusBadge({ status }) {
    const { colors } = useTheme();
    const palette = getTaskStatusStyles(colors)[status];
    return <View style={{ flexDirection: 'row', alignSelf: 'flex-start', alignItems: 'center', gap: spacing.xs,
            paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: radii.pill, backgroundColor: palette.background }}>
    <Ionicons name={palette.icon} size={18} color={palette.color}/>
    <Text style={{ ...typography.label, color: palette.color }}>{taskStatusLabels[status]}</Text>
  </View>;
}
