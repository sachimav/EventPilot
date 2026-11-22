import { useTheme, useThemedStyles } from '../hooks/useTheme';
import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, Text, View } from 'react-native';
import { radii, spacing, typography } from '../constants/theme';

/** @param {{ title: string, description: string, icon?: import('react').ComponentProps<typeof Ionicons>['name'], action?: import('react').ReactNode }} props */
export default function EmptyState({ title, description, icon = 'sparkles-outline', action }) {
  const theme = useTheme();
  const { colors } = theme;
  const styles = useThemedStyles(createStyles);
  return <View style={styles.card}>
    <View style={styles.icon}><Ionicons name={icon} color={colors.primary} size={32} /></View>
    <Text accessibilityRole="header" style={styles.title}>{title}</Text>
    <Text style={styles.description}>{description}</Text>
    {action ? <View style={styles.action}>{action}</View> : null}
  </View>;
}
const createStyles = ({ colors, cardStyle }) => StyleSheet.create({
  card: { ...cardStyle, alignItems: 'center', gap: spacing.md, paddingVertical: spacing.xxl },
  icon: { backgroundColor: colors.primarySoft, borderRadius: radii.pill, padding: spacing.lg },
  title: { ...typography.heading, color: colors.heading, textAlign: 'center' },
  description: { ...typography.body, color: colors.text, textAlign: 'center' },
  action: { alignSelf: 'stretch', marginTop: spacing.sm },
});
