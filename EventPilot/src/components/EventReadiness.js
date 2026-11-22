import { useTheme, useThemedStyles } from '../hooks/useTheme';
import { StyleSheet, Text, View } from 'react-native';
import { radii, spacing, typography } from '../constants/theme';
export default function EventReadiness({ readiness }) {
  const theme = useTheme();
  const { colors } = theme;
  const styles = useThemedStyles(createStyles);
    const { percentage, completedTasks, totalTasks } = readiness;
    const assessed = percentage !== null;
    // Keep 100% reserved for truly complete task lists, even when almost complete.
    const label = assessed ? `${percentage === 100 ? 100 : Math.floor(percentage * 10) / 10}%` : 'Not Assessed';
    return <View style={styles.content}>
    <View style={styles.row}>
      <Text style={styles.label}>Task Readiness</Text>
      <Text accessibilityLiveRegion="polite" style={styles.value}>{label}</Text>
    </View>
    <View accessibilityRole="progressbar" accessibilityLabel="Event Readiness" accessibilityValue={assessed ? { min: 0, max: 100, now: percentage, text: `${label}; ${completedTasks} of ${totalTasks} tasks completed` }
            : { text: 'Not Assessed: no tasks yet' }} style={styles.track}>
      <View style={[styles.fill, { width: `${percentage ?? 0}%`, backgroundColor: percentage === 100 ? colors.success : colors.primary }]}/>
    </View>
    <Text style={styles.caption}>{assessed ? `${completedTasks} of ${totalTasks} tasks completed` : 'Add tasks to assess this event’s readiness.'}</Text>
  </View>;
}
const createStyles = ({ colors }) => StyleSheet.create({
    content: { gap: spacing.sm },
    row: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: spacing.sm },
    label: { ...typography.label, color: colors.heading }, value: { ...typography.label, color: colors.primary },
    track: { height: 10, borderRadius: radii.pill, overflow: 'hidden', backgroundColor: colors.border },
    fill: { height: '100%', borderRadius: radii.pill }, caption: { ...typography.caption, color: colors.text },
});
