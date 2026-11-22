import { useTheme, useThemedStyles } from '../hooks/useTheme';
import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, Text, View } from 'react-native';
import { spacing, typography } from '../constants/theme';

const getTones = (colors) => ({
  purple: { accent: colors.primary, background: colors.primarySoft },
  blue: { accent: colors.info, background: colors.infoSoft },
  green: { accent: colors.success, background: colors.successSoft },
});

/** @param {{ label: string, value: string, caption?: string, tone?: 'purple' | 'blue' | 'green', icon?: import('react').ComponentProps<typeof Ionicons>['name'] }} props */
export default function StatCard({ label, value, caption, icon = 'stats-chart-outline', tone = 'purple' }) {
  const styles = useThemedStyles(createStyles);
  const { colors } = useTheme();
  const palette = getTones(colors)[tone];
  return <View style={[styles.card, { borderTopColor: palette.accent }]}>
    <View style={[styles.icon, { backgroundColor: palette.background }]}><Ionicons name={icon} color={palette.accent} size={22} /></View>
    <Text style={styles.value}>{value}</Text><Text style={styles.label}>{label}</Text>
    {caption ? <Text style={styles.caption}>{caption}</Text> : null}
  </View>;
}
const createStyles = ({ colors, cardStyle }) => StyleSheet.create({
  card: { ...cardStyle, padding: spacing.lg, borderTopWidth: 3, gap: spacing.sm, flexGrow: 1, flexBasis: 145 },
  icon: { alignSelf: 'flex-start', padding: spacing.sm, borderRadius: 12, marginBottom: spacing.xs },
  value: { ...typography.hero, color: colors.heading },
  label: { ...typography.label, color: colors.heading },
  caption: { ...typography.caption, color: colors.text },
});
