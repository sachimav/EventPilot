import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, Text, View } from 'react-native';
import { cardStyle, colors, spacing, typography } from '../constants/theme';

/** @param {{ label: string, value: string, caption?: string, icon?: import('react').ComponentProps<typeof Ionicons>['name'] }} props */
export default function StatCard({ label, value, caption, icon = 'stats-chart-outline' }) {
  return <View style={styles.card}>
    <Ionicons name={icon} color={colors.primary} size={24} />
    <Text style={styles.value}>{value}</Text><Text style={styles.label}>{label}</Text>
    {caption ? <Text style={styles.caption}>{caption}</Text> : null}
  </View>;
}
const styles = StyleSheet.create({
  card: { ...cardStyle, gap: spacing.sm, flexGrow: 1, flexBasis: 145 },
  value: { ...typography.hero, color: colors.heading },
  label: { ...typography.label, color: colors.heading },
  caption: { ...typography.caption, color: colors.text },
});
