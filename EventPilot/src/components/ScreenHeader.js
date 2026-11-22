import { useThemedStyles } from '../hooks/useTheme';
import { StyleSheet, Text, View } from 'react-native';
import { spacing, typography } from '../constants/theme';

/** @param {{ title: string, subtitle?: string, eyebrow?: string, action?: import('react').ReactNode }} props */
export default function ScreenHeader({ title, subtitle, eyebrow, action }) {
  const styles = useThemedStyles(createStyles);
  return <View style={styles.header}>
    {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
    <Text accessibilityRole="header" style={styles.title}>{title}</Text>
    {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    {action}
  </View>;
}
const createStyles = ({ colors }) => StyleSheet.create({
  header: { gap: spacing.sm },
  eyebrow: { ...typography.label, color: colors.primary, letterSpacing: 1 },
  title: { ...typography.title, color: colors.heading },
  subtitle: { ...typography.body, color: colors.text },
});
